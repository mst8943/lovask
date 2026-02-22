import { createClient } from '@/lib/supabase/client'

export type Gift = {
    id: string
    name: string
    price: number
    image_url?: string | null
    is_active: boolean
}

export type GiftSend = {
    id: string
    match_id: string
    from_user: string
    to_user: string
    gift_id: string | null
    amount: number
    created_at: string
    gift?: Gift | null
}

export const fetchGifts = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })
    if (error) throw error
    return (data || []) as Gift[]
}

export const sendGift = async (matchId: string, giftId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('send_gift', {
        p_match_id: matchId,
        p_gift_id: giftId,
    })
    if (error) throw error
    return data as boolean
}

export const fetchGiftHistory = async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('gift_sends')
        .select('*, gift:gifts(id,name,price,image_url)')
        .or(`from_user.eq.${userId},to_user.eq.${userId}`)
        .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as GiftSend[]
}
