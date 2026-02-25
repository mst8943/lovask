import { createClient } from '@/lib/supabase/client'

export type CoinPackage = {
    id: string
    title?: string | null
    coins: number
    price: number
    currency?: string | null
    is_active: boolean
    sort_order: number
}

export type PremiumPlan = {
    id: string
    title?: string | null
    months: number
    price: number
    currency?: string | null
    is_active: boolean
    sort_order: number
}

export const fetchCoinPackages = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('coin_packages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('price', { ascending: true })
    if (error) throw error
    return (data || []) as CoinPackage[]
}

export const fetchPremiumPlans = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('premium_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('price', { ascending: true })
    if (error) throw error
    return (data || []) as PremiumPlan[]
}

