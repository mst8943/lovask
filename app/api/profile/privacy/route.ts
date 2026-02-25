import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

type PrivacyPayload = {
    hide_from_discovery?: boolean
    location_visibility?: 'public' | 'approx' | 'hidden'
    last_active_visibility?: 'everyone' | 'matches' | 'hidden'
    message_request_mode?: 'open' | 'request' | 'verified_only'
    harassment_mode?: boolean
}

export async function POST(req: Request) {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null
    if (!token) return new NextResponse('Unauthorized', { status: 401 })

    const admin = createAdminClient()
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData?.user) return new NextResponse('Unauthorized', { status: 401 })

    const rate = rateLimit(`profile-privacy:${userData.user.id}`, 10, 60_000)
    if (!rate.ok) {
        return new NextResponse('Too many requests', { status: 429, headers: rateLimitHeaders(10, rate) })
    }

    const body = (await req.json().catch(() => ({}))) as PrivacyPayload
    const userId = userData.user.id

    const { error: profileError } = await admin
        .from('profiles')
        .update({
            hide_from_discovery: body.hide_from_discovery ?? false,
            location_visibility: body.location_visibility ?? 'approx',
        })
        .eq('id', userId)

    if (profileError) return new NextResponse(profileError.message, { status: 400 })

    const { error: settingsError } = await admin
        .from('user_settings')
        .upsert({
            user_id: userId,
            last_active_visibility: body.last_active_visibility ?? 'matches',
            message_request_mode: body.message_request_mode ?? 'open',
            harassment_mode: body.harassment_mode ?? false,
        }, { onConflict: 'user_id' })

    if (settingsError) return new NextResponse(settingsError.message, { status: 400 })

    if (body.last_active_visibility === 'hidden') {
        await admin
            .from('users')
            .update({ last_active_at: null })
            .eq('id', userId)
    }

    return NextResponse.json({ ok: true })
}
