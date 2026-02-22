import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export const claimDailyBonus = async () => {
    const { data, error } = await supabase.rpc('claim_daily_bonus')
    if (error) throw error
    return data as number
}

export const ensureReferralCode = async () => {
    const { error } = await supabase.rpc('ensure_referral_code')
    if (error) throw error
}

export const applyReferral = async (code: string) => {
    const { data, error } = await supabase.rpc('apply_referral', { p_code: code })
    if (error) throw error
    return data as boolean
}

export const requestBankTransfer = async (payload: {
    kind: 'coins' | 'premium'
    amount: number
    coinsAmount?: number
    premiumMonths?: number
    reference?: string
    receiptUrl?: string
}) => {
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('bank_transfers')
        .insert({
            user_id: auth.user.id,
            kind: payload.kind,
            amount: payload.amount,
            coins_amount: payload.coinsAmount || null,
            premium_months: payload.premiumMonths || null,
            reference: payload.reference || null,
            receipt_url: payload.receiptUrl || null,
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export const activateBoost = async (userId: string, durationMinutes: number, source: 'purchase' | 'daily') => {
    const startsAt = new Date()
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000)

    const { data, error } = await supabase
        .from('boosts')
        .insert({
            user_id: userId,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            source,
        })
        .select()
        .single()

    if (error) throw error
    return data
}

export const fetchActiveBoost = async (userId: string) => {
    const { data, error } = await supabase
        .from('boosts')
        .select('*')
        .eq('user_id', userId)
        .gt('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) throw error
    return data
}

export const activateMiniBoost = async (minutes: number, cost: number) => {
    const { data, error } = await supabase.rpc('activate_mini_boost', {
        p_minutes: minutes,
        p_cost: cost,
    })
    if (error) throw error
    return data as boolean
}
