import { createClient } from '@/lib/supabase/client'

export type BlockRow = {
    id: string
    blocker_id: string
    blocked_id: string
    reason?: string | null
    created_at: string
    blocked_profile?: {
        id: string
        display_name: string | null
        photos: string[] | null
        gender?: string | null
        is_bot?: boolean | null
    } | null
}

export const fetchMyBlocks = async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('blocks')
        .select('id, blocker_id, blocked_id, reason, created_at')
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false })
    if (error) throw error

    const rows = (data || []) as BlockRow[]
    const ids = rows.map((r) => r.blocked_id)
    if (ids.length === 0) return rows

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, photos, gender, is_bot')
        .in('id', ids)
    if (profileError) throw profileError

    const profileRows = (profiles || []) as Array<{
        id: string
        display_name: string | null
        photos: string[] | null
        gender?: string | null
        is_bot?: boolean | null
    }>
    const map = new Map(profileRows.map((p) => [p.id, p]))
    return rows.map((r) => ({
        ...r,
        blocked_profile: map.get(r.blocked_id) || null,
    }))
}

export const unblockUser = async (blockId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('blocks').delete().eq('id', blockId)
    if (error) throw error
}
