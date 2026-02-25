import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'

export type UserData = Database['public']['Tables']['users']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']

const supabase = createClient()

export const fetchUserData = async (userId: string) => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) throw error
    return data as UserData
}

export const spendCoins = async (userId: string, amount: number, reason: string, metadata: Record<string, unknown> = {}) => {
    // Atomic coin spend via RPC to prevent race conditions.
    const { data, error } = await supabase.rpc('spend_coins', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
        p_metadata: { ...metadata },
    })

    if (error) throw error
    if (data === false) throw new Error('Insufficient balance')
    return true
}

export const addCoins = async (userId: string, amount: number, reason: string) => {
    // Atomic coin add via RPC to prevent race conditions.
    const { data, error } = await supabase.rpc('add_coins', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
    })

    if (error) throw error
    if (data === false) throw new Error('User not found')
    return true
}
