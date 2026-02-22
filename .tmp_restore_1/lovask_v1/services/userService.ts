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
    // Ideally this should clearer in backend function
    // But for MVP:
    // 1. Check balance
    const user = await fetchUserData(userId)
    if (!user.is_premium && (user.coin_balance || 0) < amount) {
        throw new Error('Insufficient balance')
    }

    // 2. If premium, amount might be 0 for certain actions?
    // Let's assume passed amount is the COST.
    // If user is premium, we might override cost to 0 in UI logic or here.
    // Logic: "Unlimited chat initiation" -> cost is 0.

    let finalAmount = amount
    if (user.is_premium && reason === 'chat_initiation') {
        finalAmount = 0
    }

    if (finalAmount === 0) return true

    // 3. Update Balance
    const newBalance = (user.coin_balance || 0) - finalAmount

    const { error: updateError } = await supabase
        .from('users')
        .update({ coin_balance: newBalance })
        .eq('id', userId)

    if (updateError) throw updateError

    // 4. Log Transaction
    const { error: txError } = await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            amount: -finalAmount,
            type: 'spend',
            metadata: { reason, ...metadata }
        })

    if (txError) console.error('Transaction log error:', txError) // Non-blocking

    return true
}

export const addCoins = async (userId: string, amount: number, reason: string) => {
    // 1. Get current balance (optional, safer to increment in SQL but simple update here)
    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('coin_balance')
        .eq('id', userId)
        .single()

    if (fetchError) throw fetchError

    const newBalance = (user.coin_balance || 0) + amount

    // 2. Update
    const { error: updateError } = await supabase
        .from('users')
        .update({ coin_balance: newBalance })
        .eq('id', userId)

    if (updateError) throw updateError

    // 3. Log
    await supabase.from('transactions').insert({
        user_id: userId,
        amount,
        type: 'purchase', // or bonus
        metadata: { reason }
    })
}
