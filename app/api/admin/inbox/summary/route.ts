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

type InboxItem = {
    id: string
    type: 'support' | 'report' | 'verification' | 'notification'
    title: string
    status?: string | null
    userId?: string | null
    created_at: string
    targetUrl: string
    meta?: string | null
}

export async function POST() {
    const admin = await ensureAdmin()
    if (!admin) return new NextResponse('Unauthorized', { status: 401 })

    const [supportRes, reportsRes, verRes, notifRes] = await Promise.all([
        admin.from('support_tickets').select('id,user_id,subject,status,created_at').order('created_at', { ascending: false }).limit(50),
        admin.from('reports').select('id,reported_id,reporter_id,reason,status,created_at').order('created_at', { ascending: false }).limit(50),
        admin.from('user_verifications').select('id,user_id,type,status,created_at').order('created_at', { ascending: false }).limit(50),
        admin.from('notifications').select('id,user_id,type,created_at').order('created_at', { ascending: false }).limit(50),
    ])

    const support = (supportRes.data || []).map((r: { id: string; user_id: string; subject: string; status: string; created_at: string }) => ({
        id: r.id,
        type: 'support' as const,
        title: r.subject,
        status: r.status,
        userId: r.user_id,
        created_at: r.created_at,
        targetUrl: '/admin/support',
    }))
    const reports = (reportsRes.data || []).map((r: { id: string; reported_id: string; reporter_id: string; reason: string | null; status: string; created_at: string }) => ({
        id: r.id,
        type: 'report' as const,
        title: r.reason || 'Rapor',
        status: r.status,
        userId: r.reported_id,
        created_at: r.created_at,
        targetUrl: '/admin/reports',
        meta: r.reporter_id,
    }))
    const verifications = (verRes.data || []).map((r: { id: string; user_id: string; type: string; status: string; created_at: string }) => ({
        id: r.id,
        type: 'verification' as const,
        title: `Doğrulama: ${r.type}`,
        status: r.status,
        userId: r.user_id,
        created_at: r.created_at,
        targetUrl: '/admin/verifications',
    }))
    const notifications = (notifRes.data || []).map((r: { id: string; user_id: string; type: string; created_at: string }) => ({
        id: r.id,
        type: 'notification' as const,
        title: `Bildirim: ${r.type}`,
        created_at: r.created_at,
        userId: r.user_id,
        targetUrl: '/admin/notifications',
    }))

    const merged: InboxItem[] = [...support, ...reports, ...verifications, ...notifications]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 150)

    const ids = Array.from(new Set(merged.map((m) => m.userId).filter(Boolean))) as string[]
    const lastActiveMap: Record<string, string | null> = {}
    if (ids.length > 0) {
        const { data: users } = await admin
            .from('users')
            .select('id,last_active_at')
            .in('id', ids)
        for (const u of (users || []) as Array<{ id: string; last_active_at: string | null }>) {
            lastActiveMap[u.id] = u.last_active_at
        }
    }

    return NextResponse.json({ items: merged, last_active_map: lastActiveMap })
}
