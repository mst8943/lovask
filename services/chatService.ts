import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import type { LastActiveVisibility } from '@/utils/lastActive'

export type Message = Database['public']['Tables']['messages']['Row']
export type Match = Database['public']['Tables']['matches']['Row'] & {
    other_user: Database['public']['Tables']['profiles']['Row'] | null
    chat_state?: {
        is_archived?: boolean | null
        is_favorite?: boolean | null
        is_trashed?: boolean | null
        deleted_at?: string | null
        unread_count?: number | null
        last_message_at?: string | null
        last_message_preview?: string | null
    } | null
}

type ProfileLite = Database['public']['Tables']['profiles']['Row'] & {
    users?: Array<{ last_active_at?: string | null }>
    last_active_visibility?: LastActiveVisibility | null
}

const supabase = createClient()

export type MessagesPage = {
    messages: Message[]
    nextCursor: string | null
}

export const fetchMatches = async (userId: string) => {
    // 1. Fetch matches involving current user
    const { data: matches, error } = await supabase
        .from('matches')
        .select('id,user_a,user_b,created_at,is_active')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .eq('is_active', true)

    if (error) throw error
    if (!matches || matches.length === 0) return []

    // 2. Collect IDs of the OTHER user in each match
    const otherUserIds = matches.map(m =>
        m.user_a === userId ? m.user_b : m.user_a
    )

    // 3. Fetch profiles for these users
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id,display_name,photos,is_bot,age,city,gender,is_verified, users:users(last_active_at)')
        .in('id', otherUserIds)

    if (profileError) throw profileError

    // 4. Map profiles back to matches
    const profileMap = new Map((profiles || []).map((p) => [p.id, p as ProfileLite]))

    const { data: settings } = await supabase
        .from('user_settings')
        .select('user_id,last_active_visibility')
        .in('user_id', otherUserIds)
    const visibilityMap = new Map((settings || []).map((s: { user_id: string; last_active_visibility: LastActiveVisibility }) => [s.user_id, s.last_active_visibility]))
    for (const [id, profile] of profileMap.entries()) {
        if (profile) {
            profile.last_active_visibility = visibilityMap.get(id) ?? null
        }
    }
    if (otherUserIds.length > 0) {
        try {
            const { data: session } = await supabase.auth.getSession()
            const token = session.session?.access_token
            if (token) {
                const res = await fetch('/api/profile/visibility', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userIds: otherUserIds }),
                })
                if (res.ok) {
                    const payload = await res.json()
                    const visibilities = (payload?.visibilities || {}) as Record<string, LastActiveVisibility>
                    for (const [id, profile] of profileMap.entries()) {
                        if (profile) {
                            profile.last_active_visibility = visibilities[id] ?? profile.last_active_visibility ?? null
                        }
                    }
                }
            }
        } catch {
            // Non-blocking
        }
    }

    // 5. Fetch chat states for current user
    const matchIds = matches.map((m) => m.id)
    const { data: states } = await supabase
        .from('chat_states')
        .select('match_id,is_archived,is_favorite,is_trashed,deleted_at,unread_count,last_message_at,last_message_preview')
        .eq('user_id', userId)
        .in('match_id', matchIds)

    const stateMap = new Map((states || []).map((s) => [s.match_id, s]))

    return matches.map(match => {
        const otherId = match.user_a === userId ? match.user_b : match.user_a
        return {
            ...match,
            other_user: profileMap.get(otherId) || null,
            chat_state: stateMap.get(match.id) || null,
        }
    }) as Match[]
}

export const fetchMatch = async (matchId: string, currentUserId: string) => {
    const { data: match, error } = await supabase
        .from('matches')
        .select('id,user_a,user_b,created_at,is_active')
        .eq('id', matchId)
        .single()

    if (error) throw error
    if (!match) return null

    // Determine other user
    const otherUserId = match.user_a === currentUserId ? match.user_b : match.user_a

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('id,display_name,photos,is_bot,age,city,gender,bio,is_verified')
        .eq('id', otherUserId)
        .single()

    return {
        ...match,
        other_user: profile
    } as Match
}

export const fetchMessages = async (matchId: string) => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })

    if (error) throw error
    return data as Message[]
}

export const fetchMessagesPage = async (
    matchId: string,
    cursor?: string | null,
    pageSize: number = 30
): Promise<MessagesPage> => {
    let query = supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(pageSize)

    if (cursor) query = query.lt('created_at', cursor)

    const { data, error } = await query
    if (error) throw error

    const desc = (data || []) as Message[]
    const messages = [...desc].reverse()
    const nextCursor = desc.length === pageSize ? desc[desc.length - 1]?.created_at || null : null

    return { messages, nextCursor }
}

export const createBotMatch = async (botId: string) => {
    const { data, error } = await supabase.rpc('create_bot_match', { p_bot_id: botId })
    if (error) throw error
    return data as string
}

export const sendMessage = async (matchId: string, senderId: string, content: string) => {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            match_id: matchId,
            sender_id: senderId,
            content,
            type: 'text'
        })
        .select()
        .single()

    if (error) throw error
    try {
        await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'message',
                matchId,
                content,
            }),
        })
    } catch {
        // Ignore push failures
    }
    return data
}

export const sendImageMessage = async (
    matchId: string,
    senderId: string,
    mediaUrl: string,
    content: string = '',
    options?: {
        viewOnce?: boolean
        expiresAt?: string | null
    }
) => {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            match_id: matchId,
            sender_id: senderId,
            content,
            media_url: mediaUrl,
            type: 'image',
            media_view_once: options?.viewOnce ?? false,
            media_expires_at: options?.expiresAt || null,
        })
        .select()
        .single()

    if (error) throw error
    try {
        await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'message',
                matchId,
                content: 'Sent a photo',
            }),
        })
    } catch {
        // Ignore push failures
    }
    return data
}

export const sendAudioMessage = async (
    matchId: string,
    senderId: string,
    mediaUrl: string,
    durationSeconds: number
) => {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            match_id: matchId,
            sender_id: senderId,
            content: '',
            media_url: mediaUrl,
            type: 'audio',
            media_duration_s: Math.max(1, Math.round(durationSeconds)),
        })
        .select()
        .single()
    if (error) throw error
    return data
}

export const sendStickerMessage = async (
    matchId: string,
    senderId: string,
    stickerId: string,
    stickerUrl: string
) => {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            match_id: matchId,
            sender_id: senderId,
            content: '',
            media_url: stickerUrl,
            type: 'sticker',
            sticker_id: stickerId,
        })
        .select()
        .single()
    if (error) throw error
    return data
}

export const uploadChatImage = async (file: File, userId: string, matchId: string) => {
    const path = `${userId}/${matchId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(path, file, { cacheControl: '86400', upsert: false, contentType: file.type || 'image/webp' })

    if (uploadError) throw uploadError

    // Store path to support private bucket + signed URLs.
    return `chat-media/${path}`
}

export const uploadChatAudio = async (file: File, userId: string, matchId: string) => {
    const path = `${userId}/${matchId}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
        .from('chat-audio')
        .upload(path, file, { cacheControl: '86400', upsert: false, contentType: file.type || 'audio/webm' })
    if (uploadError) throw uploadError
    return `chat-audio/${path}`
}

export const markMessagesRead = async (matchId: string, readerId: string) => {
    const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('match_id', matchId)
        .neq('sender_id', readerId)
        .is('read_at', null)

    if (error) throw error
}

export const setTypingStatus = async (matchId: string, userId: string, isTyping: boolean) => {
    const { error } = await supabase
        .from('typing_status')
        .upsert({
            match_id: matchId,
            user_id: userId,
            is_typing: isTyping,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'match_id,user_id' })
    if (error) throw error
}

export const createChatInitiation = async (matchId: string, initiatorId: string, amount: number) => {
    const { error } = await supabase
        .from('chat_initiations')
        .upsert(
            {
                match_id: matchId,
                initiator_id: initiatorId,
                amount,
            },
            { onConflict: 'match_id' }
        )
    if (error) throw error
}

export const refundChatInitiation = async (matchId: string) => {
    const { data, error } = await supabase.rpc('refund_chat_initiation', {
        p_match_id: matchId,
    })
    if (error) throw error
    return data as boolean
}
