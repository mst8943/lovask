import { createClient } from '@/lib/supabase/client'

export const fetchFavoriteIds = async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('favorites')
        .select('to_user')
        .eq('from_user', userId)

    if (error) throw error
    return (data || []).map((f) => f.to_user)
}

export const toggleFavorite = async (userId: string, targetUserId: string, isFavorited: boolean) => {
    const supabase = createClient()

    if (isFavorited) {
        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('from_user', userId)
            .eq('to_user', targetUserId)
        if (error) throw error
        return false
    }

    const { error } = await supabase.from('favorites').insert({
        from_user: userId,
        to_user: targetUserId,
    })
    if (error) throw error
    return true
}
