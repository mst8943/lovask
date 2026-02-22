import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileWithMeta = Profile & {
    is_premium?: boolean
    last_active_at?: string | null
    is_verified?: boolean | null
    compatibility_score?: number | null
    distance_km?: number | null
}

type RawFeedRow = ProfileWithMeta & {
    users?: {
        id?: string
        is_premium?: boolean
        last_active_at?: string | null
    }[] | {
        id?: string
        is_premium?: boolean
        last_active_at?: string | null
    } | null
}

export type FeedFilters = {
    ageMin?: number
    ageMax?: number
    city?: string
    genders?: string[]
    interests?: string[]
    onlineOnly?: boolean
    premiumOnly?: boolean
    distanceKm?: number
    relationshipType?: string
    education?: string
    smoking?: string
    alcohol?: string
    kidsStatus?: string
    heightMin?: number
    heightMax?: number
    religion?: string
    lifestyle?: string
}

const recordDiscoveryImpressions = async (userId: string, profileIds: string[], source: 'feed' | 'swipe' = 'feed') => {
    if (!userId || profileIds.length === 0) return
    const capped = profileIds.slice(0, 25)
    const supabase = createClient()
    try {
        await supabase.from('discovery_impressions').insert(
            capped.map((profileId) => ({
                user_id: userId,
                profile_id: profileId,
                source,
            }))
        )
    } catch {
        // Non-blocking: impressions should never break feed rendering.
    }
}

const parseCursor = (cursor?: string | null) => {
    if (!cursor) return { cursorAt: null as string | null, cursorId: null as string | null }
    const [cursorAt, cursorId] = cursor.split('|')
    return {
        cursorAt: cursorAt || null,
        cursorId: cursorId || null,
    }
}

const buildFeedRpcParams = (userId: string, cursor: string | null | undefined, pageSize: number, filters: FeedFilters) => {
    const { cursorAt, cursorId } = parseCursor(cursor)
    return ({
    p_user_id: userId,
    p_cursor: cursorAt,
    p_cursor_id: cursorId,
    p_limit: pageSize,
    p_age_min: filters.ageMin ?? null,
    p_age_max: filters.ageMax ?? null,
    p_city: filters.city || null,
    p_genders: filters.genders && filters.genders.length > 0 ? filters.genders : null,
    p_interests: filters.interests && filters.interests.length > 0 ? filters.interests : null,
    p_relationship_type: filters.relationshipType || null,
    p_education: filters.education || null,
    p_smoking: filters.smoking || null,
    p_alcohol: filters.alcohol || null,
    p_kids_status: filters.kidsStatus || null,
    p_height_min: filters.heightMin ?? null,
    p_height_max: filters.heightMax ?? null,
    p_religion: filters.religion || null,
    p_lifestyle: filters.lifestyle || null,
    p_online_only: !!filters.onlineOnly,
    p_premium_only: !!filters.premiumOnly,
    p_distance_km: filters.distanceKm ?? null,
    })
}

export const fetchFeed = async (userId: string) => {
    const { profiles } = await fetchFeedPage(userId, null, 10, {})
    return profiles
}

export const fetchFeedPage = async (
    userId: string,
    cursor?: string | null,
    pageSize: number = 20,
    filters: FeedFilters = {}
) => {
    const supabase = createClient()

    const rpcParams = buildFeedRpcParams(userId, cursor, pageSize, filters)
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('fetch_feed_page_v2', rpcParams)

    if (!rpcError && rpcData) {
        const profiles = rpcData as ProfileWithMeta[]
        if (profiles.length > 0) {
            const last = profiles[profiles.length - 1]
            const nextCursor = last ? `${last.updated_at}|${last.id}` : null
            void recordDiscoveryImpressions(userId, profiles.map((p) => p.id))
            return { profiles, nextCursor }
        }
    }

    const allowFallback = process.env.NEXT_PUBLIC_FEED_FALLBACK === '1'
    if (!allowFallback && rpcError) {
        throw rpcError || new Error('Feed RPC returned no data')
    }

    // Fallback (explicitly enabled only)
    const passesTable = 'passes' as never
    const [{ data: likes }, { data: passes }, { data: blocked }, { data: blockers }] = await Promise.all([
        supabase.from('likes').select('to_user').eq('from_user', userId),
        supabase.from(passesTable).select('to_user').eq('from_user', userId),
        supabase.from('blocks').select('blocked_id').eq('blocker_id', userId),
        supabase.from('blocks').select('blocker_id').eq('blocked_id', userId),
    ])

    const excludedIds = new Set<string>([
        userId,
        ...(likes?.map((l) => l.to_user) || []),
        ...(passes?.map((p: { to_user: string }) => p.to_user) || []),
        ...(blocked?.map((b) => b.blocked_id) || []),
        ...(blockers?.map((b) => b.blocker_id) || []),
    ])

    let query = supabase
        .from('profiles')
        .select('id,display_name,age,gender,city,bio,photos,interests,is_bot,looking_for_genders,is_verified,updated_at, users:users(id,is_premium,last_active_at)')
        .eq('hide_from_discovery', false)
        .order('updated_at', { ascending: false })
        .limit(pageSize)

    const excludedArray = Array.from(excludedIds)
    if (excludedArray.length > 0) {
        query = query.not('id', 'in', `(${excludedArray.join(',')})`)
    }

    if (filters.ageMin) query = query.gte('age', filters.ageMin)
    if (filters.ageMax) query = query.lte('age', filters.ageMax)
    if (filters.city) query = query.ilike('city', `%${filters.city}%`)
    if (filters.genders && filters.genders.length > 0) query = query.in('gender', filters.genders)
    if (filters.interests && filters.interests.length > 0) query = query.overlaps('interests', filters.interests)
    if (filters.relationshipType) query = query.eq('relationship_type', filters.relationshipType)
    if (filters.education) query = query.eq('education', filters.education)
    if (filters.smoking) query = query.eq('smoking', filters.smoking)
    if (filters.alcohol) query = query.eq('alcohol', filters.alcohol)
    if (filters.kidsStatus) query = query.eq('kids_status', filters.kidsStatus)
    if (filters.heightMin) query = query.gte('height_cm', filters.heightMin)
    if (filters.heightMax) query = query.lte('height_cm', filters.heightMax)
    if (filters.religion) query = query.eq('religion', filters.religion)
    if (filters.lifestyle) query = query.eq('lifestyle', filters.lifestyle)
    if (cursor) query = query.lt('updated_at', cursor)

    const { data, error } = await query
    if (error) throw error

    const now = Date.now()
    const onlineThreshold = now - 10 * 60 * 1000

    const profiles = (data || []).map((row: RawFeedRow) => {
        const user = Array.isArray(row.users) ? row.users[0] : row.users
        return {
            ...row,
            is_premium: user?.is_premium || false,
            last_active_at: user?.last_active_at || null,
            users: user ?? null,
        }
    }) as ProfileWithMeta[]

    const filtered = profiles.filter((p) => {
        if (filters.premiumOnly && !p.is_premium) return false
        if (filters.onlineOnly && p.last_active_at) {
            const ts = new Date(p.last_active_at).getTime()
            if (ts < onlineThreshold) return false
        }
        if (filters.onlineOnly && !p.last_active_at) return false
        return true
    })

    const last = filtered[filtered.length - 1]
    const nextCursor = last ? `${last.updated_at}|${last.id}` : null

    void recordDiscoveryImpressions(userId, filtered.map((p) => p.id))

    return { profiles: filtered, nextCursor }
}

export const likeUser = async (currentUserId: string, targetUserId: string) => {
    const supabase = createClient()

    // 1. Record the like
    const { error } = await supabase
        .from('likes')
        .upsert(
            {
                from_user: currentUserId,
                to_user: targetUserId,
            },
            { onConflict: 'from_user,to_user', ignoreDuplicates: true }
        )

    if (error) throw error

    // Bot auto-like: match probability based on bot settings
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('is_bot')
        .eq('id', targetUserId)
        .maybeSingle()

    if (targetProfile?.is_bot) {
        const [{ data: botCfg }, { data: globalSettings }] = await Promise.all([
            supabase
                .from('bot_configs')
                .select('auto_like_rate,use_global,behavior_settings')
                .eq('user_id', targetUserId)
                .maybeSingle(),
            supabase
                .from('bot_global_settings')
                .select('auto_like_rate')
                .maybeSingle(),
        ])

        const isActive = botCfg?.behavior_settings?.active !== false
        if (!isActive) {
            return { isMatch: false, isBot: true }
        }

        let groupRate: number | null = null
        const groupId = botCfg?.behavior_settings?.group_id
        if (groupId) {
            const { data: group } = await supabase
                .from('bot_groups')
                .select('auto_like_rate')
                .eq('id', groupId)
                .maybeSingle()
            groupRate = group?.auto_like_rate ?? null
        }

        const useGlobal = botCfg?.use_global !== false
        const baseRate = globalSettings?.auto_like_rate ?? 5
        const effectiveRate = useGlobal
            ? (groupRate ?? baseRate)
            : (botCfg?.auto_like_rate ?? baseRate)

        const roll = Math.random() * 100
        if (roll <= effectiveRate) {
            const { data: matchId, error: rpcError } = await supabase.rpc('create_bot_match', {
                p_bot_id: targetUserId,
            })
            if (rpcError) throw rpcError
            return { isMatch: true, isBot: true, matchId }
        }

        return { isMatch: false, isBot: true }
    }

    // 2. Check for match
    let mutualLike: Database['public']['Tables']['likes']['Row'] | null = null
    if (!targetProfile?.is_bot) {
        const { data } = await supabase
            .from('likes')
            .select('*')
            .eq('from_user', targetUserId)
            .eq('to_user', currentUserId)
            .maybeSingle()
        mutualLike = data
    }

    if (mutualLike) {
        const { data: match, error: matchError } = await supabase
            .from('matches')
            .insert({
                user_a: currentUserId,
                user_b: targetUserId
            })
            .select('id')
            .single()
        if (matchError) throw matchError
        try {
            await fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'match',
                    toUserId: targetUserId,
                    matchId: match?.id,
                }),
            })
        } catch {
            // Ignore push failures
        }
        return { isMatch: true, isBot: !!targetProfile?.is_bot, matchId: match?.id }
    }

    return { isMatch: false, isBot: !!targetProfile?.is_bot }
}

export const passUser = async (currentUserId: string, targetUserId: string) => {
    const supabase = createClient()

    const { error } = await supabase
        .from('passes' as never)
        .insert({
            from_user: currentUserId,
            to_user: targetUserId
        })

    if (error) throw error
}
