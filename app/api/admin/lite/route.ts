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
    return admin
}

export async function GET() {
    const admin = await ensureAdmin()
    if (!admin) return new NextResponse('Unauthorized', { status: 401 })

    const [
        supportRes,
        reportsRes,
        verRes,
        transfersRes,
        paymentsRes,
        refundsRes,
        chargebacksRes,
        usersRes,
        supportList,
        reportsList,
        verList,
        transfersList,
        paymentsList,
        refundsList,
        chargebacksList,
        usersList,
    ] = await Promise.all([
        admin.from('support_tickets').select('id', { count: 'exact', head: true }).in('status', ['open', 'pending']),
        admin.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('user_verifications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('bank_transfers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('refunds').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        admin.from('chargebacks').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        admin.from('users').select('id', { count: 'exact', head: true }),
        admin.from('support_tickets').select('id,created_at,status').order('created_at', { ascending: false }).limit(5),
        admin.from('reports').select('id,created_at,status').order('created_at', { ascending: false }).limit(5),
        admin.from('user_verifications').select('id,created_at,status').order('created_at', { ascending: false }).limit(5),
        admin.from('bank_transfers').select('id,created_at,status').order('created_at', { ascending: false }).limit(5),
        admin.from('payments').select('id,created_at,status').order('created_at', { ascending: false }).limit(5),
        admin.from('refunds').select('id,created_at,status').order('created_at', { ascending: false }).limit(5),
        admin.from('chargebacks').select('id,created_at,status').order('created_at', { ascending: false }).limit(5),
        admin.from('users').select('id,created_at').order('created_at', { ascending: false }).limit(5),
    ])

    const support = supportRes.count || 0
    const reports = reportsRes.count || 0
    const verifications = verRes.count || 0
    const bankTransfers = transfersRes.count || 0
    const payments = paymentsRes.count || 0
    const refunds = refundsRes.count || 0
    const chargebacks = chargebacksRes.count || 0
    const users = usersRes.count || 0
    const inbox = support + reports + verifications + bankTransfers + payments + refunds + chargebacks

    return NextResponse.json({
        counts: {
            inbox,
            support,
            reports,
            verifications,
            bankTransfers,
            payments,
            refunds,
            chargebacks,
            users,
        },
        lists: {
            support: supportList.data || [],
            reports: reportsList.data || [],
            verifications: verList.data || [],
            bankTransfers: transfersList.data || [],
            payments: paymentsList.data || [],
            refunds: refundsList.data || [],
            chargebacks: chargebacksList.data || [],
            users: usersList.data || [],
        },
    })
}
