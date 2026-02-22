import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export type Story = {
    id: string
    user_id: string
    media_url: string
    media_type: 'image' | 'video'
    expires_at: string
    created_at: string
    highlight: boolean
    profiles?: { display_name: string | null; photos: unknown; gender?: string | null; is_bot?: boolean | null } | null
}

export const fetchStories = async () => {
    const { data, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

    if (error) throw error
    const stories = (data || []) as Story[]

    const userIds = Array.from(new Set(stories.map((s) => s.user_id)))
    if (userIds.length === 0) return stories

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, photos, gender, is_bot')
        .in('id', userIds)

    if (profileError) throw profileError

    const map = new Map((profiles || []).map((p: { id: string; display_name: string | null; photos: unknown; gender?: string | null; is_bot?: boolean | null }) => [p.id, p]))
    return stories.map((s) => ({
        ...s,
        profiles: map.get(s.user_id) || null,
    }))
}

export const fetchUserStories = async (userId: string) => {
    const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as Story[]
}

export const uploadStory = async (file: File, userId: string, isPremium: boolean) => {
    if (!isPremium) {
        const { data: existing, error: countError } = await supabase
            .from('stories')
            .select('id')
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString())
        if (countError) throw countError
        if ((existing || []).length >= 1) {
            throw new Error('Ücretsiz kullanıcılar günde 1 hikaye paylaşabilir.')
        }
    }

    const safeName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '')
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName || 'story'}`
    const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(path, file, { cacheControl: '86400', upsert: false, contentType: file.type || 'application/octet-stream' })
    if (uploadError) {
        if ((uploadError as { statusCode?: string }).statusCode === '409') {
            throw new Error('Dosya çakışması oldu. Lütfen tekrar dene.')
        }
        throw uploadError
    }

    // If stories bucket is private, use createSignedUrl and store the path instead of a public URL.
    const { data } = supabase.storage.from('stories').getPublicUrl(path)
    const mediaType: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image'

    const { data: insert, error } = await supabase
        .from('stories')
        .insert({
            user_id: userId,
            media_url: data.publicUrl,
            media_type: mediaType,
        })
        .select()
        .single()
    if (error) throw error
    return insert
}

export const recordStoryView = async (storyId: string, viewerId: string) => {
    if (!viewerId) return
    const { error } = await supabase
        .from('story_views')
        .insert({ story_id: storyId, viewer_id: viewerId })
    const code = (error as { code?: string } | null)?.code
    if (error && code !== '23505') throw error
}

export const fetchStoryViews = async (storyId: string) => {
    const { data, error } = await supabase
        .from('story_views')
        .select('id, viewer_id, created_at')
        .eq('story_id', storyId)
        .order('created_at', { ascending: false })
    if (error) throw error
    return data
}

