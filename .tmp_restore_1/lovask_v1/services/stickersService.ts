import { createClient } from '@/lib/supabase/client'

export type Sticker = {
    id: string
    name: string
    image_url: string
    is_active: boolean
}

export const fetchStickers = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []) as Sticker[]
}
