import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export const blockUser = async (blockerId: string, blockedId: string, reason?: string) => {
    const { error } = await supabase.from('blocks').insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
        reason: reason || null,
    })
    if (error) throw error
}

export const reportUser = async (reporterId: string, reportedId: string, reason: string) => {
    const { error } = await supabase.from('reports').insert({
        reporter_id: reporterId,
        reported_id: reportedId,
        reason,
    })
    if (error) throw error
    try {
        await supabase.rpc('notify_admins', {
            p_type: 'report',
            p_payload: {
                reporter_id: reporterId,
                reported_id: reportedId,
                reason,
            },
        })
    } catch {
        // ignore notify failures
    }
}

export const fetchReports = async () => {
    const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
    if (error) throw error

    const rows = (data || []) as Array<{
        id: string
        reporter_id: string | null
        reported_id: string | null
        status: string | null
        created_at: string
        reason?: string | null
    }>
    const ids = Array.from(new Set(rows.flatMap((r) => [r.reporter_id, r.reported_id]).filter(Boolean))) as string[]
    if (ids.length === 0) {
        return rows.map((r) => ({ ...r, reporter: null, reported: null }))
    }

    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, last_active_at')
        .in('id', ids)
    if (userError) throw userError

    const userRows = (users || []) as Array<{ id: string; email: string | null; last_active_at: string | null }>
    const map = new Map(userRows.map((u) => [u.id, { email: u.email, last_active_at: u.last_active_at }]))
    return rows.map((r) => ({
        ...r,
        reporter: r.reporter_id ? map.get(r.reporter_id) || { email: null, last_active_at: null } : null,
        reported: r.reported_id ? map.get(r.reported_id) || { email: null, last_active_at: null } : null,
    }))
}

export const resolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    const { error } = await supabase
        .from('reports')
        .update({ status })
        .eq('id', reportId)
    if (error) throw error
}

export const banUser = async (userId: string, reason: string) => {
    const { error } = await supabase
        .from('users')
        .update({ is_banned: true, ban_reason: reason, ban_expires_at: null })
        .eq('id', userId)
    if (error) throw error
}
