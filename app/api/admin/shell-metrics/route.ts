import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ensureAdmin = async () => {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return null
    const admin = createAdminClient()
    const { data: userData } = await admin.from('users').select('role').eq('id', data.user.id).single()
    if (userData?.role !== 'admin') return null
    return { admin, userId: data.user.id }
}

export async function POST() {
    const start = Date.now()
    const session = await ensureAdmin()
    if (!session) return new NextResponse('Unauthorized', { status: 401 })
    const { admin, userId } = session

    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    const [
        slaRowsRes,
        supportRes,
        reportsRes,
        verRes,
        transfersRes,
        paymentsRes,
        refundsRes,
        chargebacksRes,
        unreadNotificationsRes,
        onlineUsersRes,
    ] = await Promise.all([
        admin.from('admin_sla_settings').select('queue,sla_hours'),
        admin.from('support_tickets').select('id,created_at,status').in('status', ['open', 'pending']).order('created_at', { ascending: false }).limit(200),
        admin.from('reports').select('id,created_at,status').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
        admin.from('user_verifications').select('id,created_at,status').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
        admin.from('bank_transfers').select('id,created_at,status').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
        admin.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('refunds').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        admin.from('chargebacks').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        admin.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false),
        admin.from('users').select('id', { count: 'exact', head: true }).gte('last_active_at', tenMinsAgo),
    ])

    const slaMap = Object.fromEntries((slaRowsRes.data || []).map((r: { queue: string; sla_hours: number }) => [r.queue, r.sla_hours]))
    const now = Date.now()
    const countRisk = (rows: Array<{ created_at: string }>, slaHours: number) => {
        const totalMs = slaHours * 60 * 60 * 1000
        return rows.reduce((acc, row) => {
            const due = new Date(row.created_at).getTime() + totalMs
            if (now >= due) return acc + 1
            if (due - now <= totalMs * 0.2) return acc + 1
            return acc
        }, 0)
    }

    const supportRows = (supportRes.data || []) as Array<{ created_at: string }>
    const reportsRows = (reportsRes.data || []) as Array<{ created_at: string }>
    const verRows = (verRes.data || []) as Array<{ created_at: string }>
    const transferRows = (transfersRes.data || []) as Array<{ created_at: string }>

    const slaRisk =
        countRisk(supportRows, slaMap.support || 6)
        + countRisk(reportsRows, slaMap.reports || 2)
        + countRisk(verRows, slaMap.verifications || 24)
        + countRisk(transferRows, slaMap.payments || 12)

    const actionableCount =
        supportRows.length
        + reportsRows.length
        + verRows.length
        + transferRows.length
        + (paymentsRes.count || 0)
        + (refundsRes.count || 0)
        + (chargebacksRes.count || 0)

    const menuBadges: Record<string, number> = {
        '/admin/support': supportRows.length,
        '/admin/reports': reportsRows.length,
        '/admin/verifications': verRows.length,
        '/admin/bank-transfers': transferRows.length,
        '/admin/payments': paymentsRes.count || 0,
        '/admin/refunds': refundsRes.count || 0,
        '/admin/chargebacks': chargebacksRes.count || 0,
        '/admin/inbox': actionableCount,
    }

    const durationMs = Date.now() - start

    return NextResponse.json({
        sla_risk: slaRisk,
        notification_unread: unreadNotificationsRes.count || 0,
        actionable_unread: actionableCount,
        menu_badges: menuBadges,
        online_fallback: onlineUsersRes.count || 0,
        duration_ms: durationMs,
    })
}
