import webpush from 'web-push'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

type PushType = 'message' | 'match' | 'test'

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

if (PUBLIC_KEY && PRIVATE_KEY) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rate = rateLimit(`push-send:${user.id}`, 12, 60_000)
        if (!rate.ok) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: rateLimitHeaders(12, rate) }
            )
        }

        if (!PUBLIC_KEY || !PRIVATE_KEY) {
            return NextResponse.json({ error: 'Missing VAPID keys' }, { status: 500 })
        }

        const body = await req.json().catch(() => ({}))
        const type = body?.type as PushType

        if (!type) {
            return NextResponse.json({ error: 'Missing type' }, { status: 400 })
        }

        const admin = createAdminClient()

        let targetUserId: string | null = null
        let title = 'Lovask'
        let bodyText = ''
        let url = '/feed'
        let requireMessageOptIn = false
        let requireMatchOptIn = false
        const isPriority = !!body?.priority

        if (type === 'test') {
            targetUserId = user.id
            title = 'Test Notification'
            bodyText = 'Push notifications are working.'
            url = '/settings/notifications'
        } else if (type === 'message') {
            const matchId = body?.matchId as string | undefined
            const content = (body?.content as string | undefined) || ''
            if (!matchId) {
                return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })
            }

            const { data: match, error: matchError } = await admin
                .from('matches')
                .select('id,user_a,user_b')
                .eq('id', matchId)
                .maybeSingle()

            if (matchError || !match) {
                return NextResponse.json({ error: 'Match not found' }, { status: 404 })
            }

            if (match.user_a !== user.id && match.user_b !== user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            targetUserId = match.user_a === user.id ? match.user_b : match.user_a
            title = 'New message'
            bodyText = content.length > 120 ? `${content.slice(0, 117)}...` : content || 'New message received.'
            url = `/matches/${matchId}`
            requireMessageOptIn = true
        } else if (type === 'match') {
            const toUserId = body?.toUserId as string | undefined
            const matchId = body?.matchId as string | undefined
            if (!toUserId || !matchId) {
                return NextResponse.json({ error: 'Missing toUserId or matchId' }, { status: 400 })
            }

            const { data: match, error: matchError } = await admin
                .from('matches')
                .select('id,user_a,user_b')
                .eq('id', matchId)
                .maybeSingle()

            if (matchError || !match) {
                return NextResponse.json({ error: 'Match not found' }, { status: 404 })
            }

            if (match.user_a !== user.id && match.user_b !== user.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }

            const otherUserId = match.user_a === user.id ? match.user_b : match.user_a
            if (toUserId !== otherUserId) {
                return NextResponse.json({ error: 'Invalid target user' }, { status: 403 })
            }

            targetUserId = otherUserId
            title = "It's a match"
            bodyText = 'You have a new match.'
            url = '/matches'
            requireMatchOptIn = true
        }

        if (!targetUserId) {
            return NextResponse.json({ error: 'Target user not resolved' }, { status: 400 })
        }

        if (!isPriority && type !== 'test') {
            const now = Date.now()
            const minuteAgo = new Date(now - 60_000).toISOString()
            const hourAgo = new Date(now - 3_600_000).toISOString()
            const typeRules: Record<PushType, { minGapSec: number; hourly: number }> = {
                message: { minGapSec: 20, hourly: 30 },
                match: { minGapSec: 60, hourly: 8 },
                test: { minGapSec: 0, hourly: 0 },
            }
            const rule = typeRules[type] || { minGapSec: 20, hourly: 20 }

            const [recentAny, recentType, latestType] = await Promise.all([
                admin
                    .from('push_send_log')
                    .select('id', { count: 'exact', head: true })
                    .eq('target_user_id', targetUserId)
                    .gte('created_at', minuteAgo),
                admin
                    .from('push_send_log')
                    .select('id', { count: 'exact', head: true })
                    .eq('target_user_id', targetUserId)
                    .eq('type', type)
                    .gte('created_at', hourAgo),
                admin
                    .from('push_send_log')
                    .select('created_at')
                    .eq('target_user_id', targetUserId)
                    .eq('type', type)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
            ])

            if ((recentAny.count || 0) >= 10) {
                return NextResponse.json({ ok: true, skipped: 'rate_any_minute' })
            }
            if ((recentType.count || 0) >= rule.hourly) {
                return NextResponse.json({ ok: true, skipped: 'rate_type_hour' })
            }
            if (latestType.data?.created_at && rule.minGapSec > 0) {
                const diff = now - new Date(latestType.data.created_at).getTime()
                if (diff < rule.minGapSec * 1000) {
                    return NextResponse.json({ ok: true, skipped: 'rate_type_gap' })
                }
            }
        }

        const { data: settings } = await admin
            .from('user_settings')
            .select('push_enabled,match_notifications,message_notifications,quiet_hours_enabled,quiet_hours_start,quiet_hours_end,quiet_hours_tz,priority_only')
            .eq('user_id', targetUserId)
            .maybeSingle()

        if (settings) {
            if (!settings.push_enabled) {
                return NextResponse.json({ ok: true, skipped: 'push_disabled' })
            }
            if (requireMessageOptIn && !settings.message_notifications) {
                return NextResponse.json({ ok: true, skipped: 'message_disabled' })
            }
            if (requireMatchOptIn && !settings.match_notifications) {
                return NextResponse.json({ ok: true, skipped: 'match_disabled' })
            }
            if (settings.quiet_hours_enabled) {
                const tz = settings.quiet_hours_tz || 'UTC'
                const parts = new Intl.DateTimeFormat('en-US', {
                    timeZone: tz,
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                }).formatToParts(new Date())
                const hour = Number(parts.find((p) => p.type === 'hour')?.value || '0')
                const minute = Number(parts.find((p) => p.type === 'minute')?.value || '0')
                const nowMinutes = hour * 60 + minute
                const parseTime = (t: string | null) => {
                    if (!t || !t.includes(':')) return 0
                    const [h, m] = t.split(':').map((v) => Number(v))
                    return h * 60 + m
                }
                const start = parseTime(settings.quiet_hours_start)
                const end = parseTime(settings.quiet_hours_end)
                const inQuiet = start <= end
                    ? nowMinutes >= start && nowMinutes < end
                    : nowMinutes >= start || nowMinutes < end
                if (inQuiet && !isPriority) {
                    return NextResponse.json({ ok: true, skipped: 'quiet_hours' })
                }
                if (settings.priority_only && !isPriority && type !== 'test') {
                    return NextResponse.json({ ok: true, skipped: 'priority_only' })
                }
            }
        }

        const { data: subs, error: subsError } = await admin
            .from('push_subscriptions')
            .select('id,endpoint,p256dh,auth')
            .eq('user_id', targetUserId)

        if (subsError) {
            return NextResponse.json({ error: subsError.message }, { status: 500 })
        }

        if (!subs || subs.length === 0) {
            return NextResponse.json({ ok: true, skipped: 'no_subs' })
        }

        const payload = JSON.stringify({
            title,
            body: bodyText,
            url,
        })

        const errors: string[] = []

        for (const sub of subs) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        },
                    },
                    payload
                )
            } catch (err: unknown) {
                const maybe = err as { statusCode?: number; message?: string }
                const status = typeof maybe?.statusCode === 'number' ? maybe.statusCode : undefined
                if (status === 404 || status === 410) {
                    await admin.from('push_subscriptions').delete().eq('id', sub.id)
                } else {
                    errors.push(typeof maybe?.message === 'string' ? maybe.message : 'push_failed')
                }
            }
        }

        try {
            await admin.from('push_send_log').insert({
                target_user_id: targetUserId,
                type,
                source_user_id: user.id,
                metadata: { url },
            })
        } catch {
            // Non-blocking: logging should not fail the push flow.
        }

        return NextResponse.json({ ok: true, errors }, { headers: rateLimitHeaders(12, rate) })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
