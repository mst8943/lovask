import { createClient } from '@/lib/supabase/client'

export const hasLikedYouUnlock = async (userId: string) => {
    const supabase = createClient()
    const now = new Date().toISOString()
    const { data, error } = await supabase
        .from('liked_you_unlocks')
        .select('id, expires_at')
        .eq('user_id', userId)
        .gt('expires_at', now)
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (error) throw error
    return !!data
}

export const unlockLikedYou = async (hours: number, cost: number) => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('unlock_liked_you', {
        p_hours: hours,
        p_cost: cost,
    })
    if (error) throw error
    return data as boolean
}
