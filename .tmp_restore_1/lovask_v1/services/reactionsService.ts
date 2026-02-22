import { createClient } from '@/lib/supabase/client'

export type MessageReaction = {
    id: string
    message_id: string
    user_id: string
    reaction: string
}

export const fetchReactions = async (messageIds: string[]) => {
    if (messageIds.length === 0) return []
    const supabase = createClient()
    const { data, error } = await supabase
        .from('message_reactions')
        .select('id,message_id,user_id,reaction')
        .in('message_id', messageIds)
    if (error) throw error
    return (data || []) as MessageReaction[]
}

export const addReaction = async (messageId: string, reaction: string) => {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Unauthorized')
    const { data, error } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, reaction, user_id: auth.user.id })
        .select('*')
        .single()
    if (error) throw error
    return data as MessageReaction
}
