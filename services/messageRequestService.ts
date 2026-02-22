import { createClient } from '@/lib/supabase/client'

export type MessageRequest = {
    id: string
    match_id: string
    requester_id: string
    recipient_id: string
    status: 'pending' | 'accepted' | 'declined' | 'expired'
    message_preview: string | null
    created_at: string
    responded_at: string | null
}

export const fetchMessageRequest = async (matchId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('message_requests')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (error) throw error
    return data as MessageRequest | null
}

export const createMessageRequest = async (
    matchId: string,
    requesterId: string,
    recipientId: string,
    preview: string
) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('message_requests')
        .upsert({
            match_id: matchId,
            requester_id: requesterId,
            recipient_id: recipientId,
            status: 'pending',
            message_preview: preview.slice(0, 140),
        }, { onConflict: 'match_id,requester_id,recipient_id' })
        .select()
        .single()
    if (error) throw error
    return data as MessageRequest
}

export const respondMessageRequest = async (requestId: string, action: 'accept' | 'decline') => {
    const supabase = createClient()
    const nextStatus = action === 'accept' ? 'accepted' : 'declined'
    const { data, error } = await supabase
        .from('message_requests')
        .update({ status: nextStatus, responded_at: new Date().toISOString() })
        .eq('id', requestId)
        .select()
        .single()
    if (error) throw error
    return data as MessageRequest
}
