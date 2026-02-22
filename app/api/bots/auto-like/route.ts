import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

const DEFAULT_AUTO_LIKE_RATE = 5
const DEFAULT_COOLDOWN_HOURS = 72
const MAX_BOTS_TO_SCAN = 30
const MAX_LIKES_PER_RUN = 3

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const rateResult = rateLimit(`bots-auto-like:${auth.user.id}`, 3, 60_000)
        if (!rateResult.ok) {
            return new NextResponse('Too many requests', { status: 429, headers: rateLimitHeaders(3, rateResult) })
        }

        const admin = createAdminClient()
        const userId = auth.user.id

        const { data: settings } = await admin
            .from('bot_global_settings')
            .select('*')
            .limit(1)
            .maybeSingle()

        const globalRate = settings?.auto_like_rate ?? DEFAULT_AUTO_LIKE_RATE
        const cooldownHours = settings?.cooldown_hours ?? DEFAULT_COOLDOWN_HOURS

        const { data: bots } = await admin
            .from('profiles')
            .select('id')
            .eq('is_bot', true)
            .limit(MAX_BOTS_TO_SCAN)

        let likesSent = 0
        for (const bot of bots || []) {
            if (likesSent >= MAX_LIKES_PER_RUN) break

            const { data: botCfg } = await admin
                .from('bot_configs')
                .select('auto_like_rate,cooldown_hours,use_global,behavior_settings,active_hours')
                .eq('user_id', bot.id)
                .maybeSingle()

            if (botCfg?.behavior_settings?.active === false) continue

            let groupSettings: { auto_like_rate?: number | null; cooldown_hours?: number | null; active_hours?: number[] | null } | null = null
            const groupId = botCfg?.behavior_settings?.group_id
            if (groupId) {
                const { data: group } = await admin.from('bot_groups').select('auto_like_rate,cooldown_hours,active_hours').eq('id', groupId).maybeSingle()
                groupSettings = group
            }

            const useGlobal = botCfg?.use_global !== false
            const effectiveRate = useGlobal ? (groupSettings?.auto_like_rate ?? globalRate) : (botCfg?.auto_like_rate ?? globalRate)
            const effectiveCooldown = useGlobal ? (groupSettings?.cooldown_hours ?? cooldownHours) : (botCfg?.cooldown_hours ?? cooldownHours)
            const activeHours = useGlobal ? (groupSettings?.active_hours ?? settings?.active_hours) : (botCfg?.active_hours ?? settings?.active_hours)

            if (Array.isArray(activeHours) && activeHours.length > 0) {
                const hour = new Date().getUTCHours()
                if (!activeHours.includes(hour)) continue
            }
            const { data: cd } = await admin
                .from('bot_user_cooldowns')
                .select('last_interaction_at')
                .eq('bot_id', bot.id)
                .eq('user_id', userId)
                .maybeSingle()

            if (cd?.last_interaction_at) {
                const last = new Date(cd.last_interaction_at).getTime()
                if (Date.now() - last < effectiveCooldown * 3600 * 1000) {
                    continue
                }
            }

            if (Math.random() * 100 > effectiveRate) continue

            await admin.from('likes').insert({
                from_user: bot.id,
                to_user: userId,
            })
            likesSent += 1

            await admin.from('bot_user_cooldowns').upsert({
                bot_id: bot.id,
                user_id: userId,
                last_interaction_at: new Date().toISOString(),
            }, { onConflict: 'bot_id,user_id' })
        }

        return NextResponse.json({ ok: true, likes_sent: likesSent }, { headers: rateLimitHeaders(3, rateResult) })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
