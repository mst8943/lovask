import { createClient } from '@/lib/supabase/client'

export type SupportTicket = {
    id: string
    user_id: string
    subject: string
    message: string
    status: 'open' | 'pending' | 'resolved' | 'closed'
    admin_note?: string | null
    created_at: string
    updated_at: string
}

export const fetchMySupportTickets = async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as SupportTicket[]
}

export const createSupportTicket = async (payload: {
    user_id: string
    subject: string
    message: string
}) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('support_tickets')
        .insert(payload)
        .select('*')
        .single()
    if (error) throw error
    try {
        await supabase.from('support_messages').insert({
            ticket_id: data.id,
            sender_id: payload.user_id,
            sender_role: 'user',
            body: payload.message,
        })
    } catch {
        // ignore message insert failures
    }
    try {
        await supabase.rpc('notify_admins', {
            p_type: 'support_ticket',
            p_payload: {
                ticket_id: data.id,
                user_id: payload.user_id,
                subject: payload.subject,
            },
        })
    } catch {
        // ignore notify failures
    }
    return data as SupportTicket
}

export const fetchSupportTickets = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as SupportTicket[]
}

export const updateSupportTicket = async (id: string, payload: Partial<SupportTicket>) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('support_tickets')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()
    if (error) throw error
    return data as SupportTicket
}
