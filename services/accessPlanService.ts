import { createClient } from '@/lib/supabase/client'

export type AccessPlan = {
    feature: string
    hours: number
    cost: number
    is_active: boolean
}

export const fetchAccessPlan = async (feature: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('access_plans')
        .select('feature,hours,cost,is_active')
        .eq('feature', feature)
        .maybeSingle()
    if (error) throw error
    return data as AccessPlan | null
}

export const fetchAccessPlans = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('access_plans')
        .select('*')
        .order('feature', { ascending: true })
    if (error) throw error
    return (data || []) as AccessPlan[]
}

export const saveAccessPlan = async (plan: AccessPlan) => {
    const supabase = createClient()
    const { error } = await supabase
        .from('access_plans')
        .upsert(plan, { onConflict: 'feature' })
    if (error) throw error
}

export const hasAccessUnlock = async (userId: string, feature: string) => {
    const supabase = createClient()
    const now = new Date().toISOString()
    const { data, error } = await supabase
        .from('access_unlocks')
        .select('id, expires_at')
        .eq('user_id', userId)
        .eq('feature', feature)
        .gt('expires_at', now)
        .maybeSingle()
    if (error) throw error
    return !!data
}

export const fetchActiveUnlock = async (userId: string, feature: string) => {
    const supabase = createClient()
    const now = new Date().toISOString()
    const { data, error } = await supabase
        .from('access_unlocks')
        .select('id, expires_at')
        .eq('user_id', userId)
        .eq('feature', feature)
        .gt('expires_at', now)
        .maybeSingle()
    if (error) throw error
    return data as { id: string; expires_at: string } | null
}

export const unlockAccess = async (feature: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('unlock_feature_access', {
        p_feature: feature,
    })
    if (error) throw error
    return data as boolean
}
