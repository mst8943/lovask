import { createClient } from '@/lib/supabase/client'

export type EventItem = {
    id: string
    title: string
    description: string | null
    category: string | null
    starts_at: string | null
    ends_at: string | null
    is_active: boolean
    participants_count?: number | null
}

type RawEventParticipant = {
    user_id: string
    status: 'going' | 'maybe' | 'not_going'
    created_at: string
    profiles?: {
        id: string
        display_name: string | null
        age: number | null
        city: string | null
        photos: string[] | null
        is_verified: boolean | null
        is_bot: boolean | null
    }[] | {
        id: string
        display_name: string | null
        age: number | null
        city: string | null
        photos: string[] | null
        is_verified: boolean | null
        is_bot: boolean | null
    } | null
}

export const fetchEvents = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('events')
        .select('id,title,description,category,starts_at,ends_at,is_active,event_participants(count)')
        .eq('is_active', true)
        .order('starts_at', { ascending: true })
    if (error) throw error
    const rows = (data || []) as Array<EventItem & { event_participants?: { count: number }[] }>
    return rows.map((row) => ({
        ...row,
        participants_count: row.event_participants?.[0]?.count ?? 0,
    })) as EventItem[]
}

export const joinEvent = async (eventId: string, status: 'going' | 'maybe' | 'not_going' = 'going') => {
    const supabase = createClient()
    const { error } = await supabase
        .from('event_participants')
        .upsert({ event_id: eventId, status })
    if (error) throw error
    return true
}

export const fetchEventParticipantIds = async (eventId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', eventId)
    if (error) throw error
    return (data || []).map((row: { user_id: string }) => row.user_id)
}

export const fetchEventParticipants = async (eventId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('event_participants')
        .select('user_id, status, created_at, profiles:profiles(id,display_name,age,city,photos,is_verified,is_bot)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((row: RawEventParticipant) => ({
        ...row,
        profiles: Array.isArray(row.profiles) ? (row.profiles[0] || null) : (row.profiles || null),
    })) as Array<{
        user_id: string
        status: 'going' | 'maybe' | 'not_going'
        created_at: string
        profiles?: {
            id: string
            display_name: string | null
            age: number | null
            city: string | null
            photos: string[] | null
            is_verified: boolean | null
            is_bot: boolean | null
        } | null
    }>
}
