import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export const fetchWhoLikedMe = async () => {
    const response = await fetch('/api/likes/received', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
        throw new Error(payload?.error || 'Begeniler alinamadi.')
    }
    return (payload?.rows || []) as Array<{ from_user: string; created_at: string }>
}

export const fetchProfileViewers = async (userId: string) => {
    const { data, error } = await supabase
        .from('profile_views')
        .select('viewer_id, created_at')
        .eq('viewed_id', userId)
        .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
}

export const claimDailyBoost = async () => {
    const { data, error } = await supabase.rpc('claim_daily_boost')
    if (error) throw error
    return data as boolean
}
