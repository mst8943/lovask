import { createClient } from '@/lib/supabase/client'

export type NotificationRow = {
    id: string
    user_id: string
    type: string
    payload: Record<string, unknown> | null
    is_read: boolean
    created_at: string
}

export const fetchNotifications = async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as NotificationRow[]
}

export const markNotificationRead = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
    if (error) throw error
}

export const markAllNotificationsRead = async (userId: string) => {
    const supabase = createClient()
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
    if (error) throw error
}

export const fetchUnreadCount = async (userId: string) => {
    const supabase = createClient()
    const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
    if (error) throw error
    return count || 0
}
