import { createClient } from '@/lib/supabase/client'
import { likeUser } from '@/services/feedService'

const supabase = createClient()

export const superLikeFree = async (toUserId: string) => {
    const { data, error } = await supabase.rpc('claim_super_like', { p_to_user: toUserId })
    if (error) throw error
    return data as boolean
}

export const superLikePaid = async (fromUserId: string, toUserId: string) => {
    await likeUser(fromUserId, toUserId)
    const { error } = await supabase.from('super_likes').insert({
        from_user: fromUserId,
        to_user: toUserId,
    })
    if (error) throw error
}

export const getIncognitoActive = async (userId: string) => {
    const { data, error } = await supabase
        .from('users')
        .select('incognito_until')
        .eq('id', userId)
        .maybeSingle()
    if (error) throw error
    return data?.incognito_until ? new Date(data.incognito_until) > new Date() : false
}

export const activateIncognito = async () => {
    const { data, error } = await supabase.rpc('activate_incognito', { p_hours: 24 })
    if (error) throw error
    return data as boolean
}

export const unlockReadReceipts = async (matchId: string, userId: string) => {
    const { error } = await supabase.from('read_receipt_unlocks').insert({
        match_id: matchId,
        user_id: userId,
    })
    if (error) throw error
}

export const hasReadReceiptUnlock = async (matchId: string, userId: string) => {
    const { data, error } = await supabase
        .from('read_receipt_unlocks')
        .select('id')
        .eq('match_id', matchId)
        .eq('user_id', userId)
        .maybeSingle()
    if (error) throw error
    return !!data
}

export const rewindLastPass = async (userId: string) => {
    const { data: pass } = await supabase
        .from('passes')
        .select('id, to_user, created_at')
        .eq('from_user', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (!pass) return null

    const { error } = await supabase.from('passes').delete().eq('id', pass.id)
    if (error) throw error
    return pass.to_user
}

export const activateBoostPlus = async (minutes: number) => {
    const { data, error } = await supabase.rpc('activate_boost_plus', { p_minutes: minutes })
    if (error) throw error
    return data as boolean
}
