import { createClient } from '@/lib/supabase/client'

export type ChatState = {
    id: string
    match_id: string
    user_id: string
    is_archived: boolean
    is_favorite: boolean
    is_trashed: boolean
    deleted_at?: string | null
    updated_at: string
}

export const fetchChatStates = async (userId: string, matchIds: string[]) => {
    if (matchIds.length === 0) return [] as ChatState[]
    const supabase = createClient()
    const { data, error } = await supabase
        .from('chat_states')
        .select('*')
        .eq('user_id', userId)
        .in('match_id', matchIds)
    if (error) throw error
    return (data || []) as ChatState[]
}

export const upsertChatState = async (payload: {
    match_id: string
    user_id: string
    is_archived?: boolean
    is_favorite?: boolean
    is_trashed?: boolean
    deleted_at?: string | null
}) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('chat_states')
        .upsert({
            match_id: payload.match_id,
            user_id: payload.user_id,
            is_archived: payload.is_archived ?? false,
            is_favorite: payload.is_favorite ?? false,
            is_trashed: payload.is_trashed ?? false,
            deleted_at: payload.deleted_at ?? null,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'match_id,user_id' })
        .select('*')
        .single()
    if (error) throw error
    return data as ChatState
}
