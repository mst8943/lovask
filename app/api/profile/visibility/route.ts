import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

type VisibilityPayload = {
    userId?: string
    userIds?: string[]
}

export async function POST(req: Request) {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null
    if (!token) return new NextResponse('Unauthorized', { status: 401 })

    const admin = createAdminClient()
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData?.user) return new NextResponse('Unauthorized', { status: 401 })

    const rate = rateLimit(`profile-visibility:${userData.user.id}`, 10, 60_000)
    if (!rate.ok) {
        return new NextResponse('Too many requests', { status: 429, headers: rateLimitHeaders(10, rate) })
    }

    const body = (await req.json().catch(() => ({}))) as VisibilityPayload
    const ids = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : body.userId ? [body.userId] : []
    if (ids.length === 0) return NextResponse.json({ visibilities: {} })

    const { data, error } = await admin
        .from('user_settings')
        .select('user_id,last_active_visibility')
        .in('user_id', ids)
    if (error) return new NextResponse(error.message, { status: 400 })

    const visibilities: Record<string, string | null> = {}
    for (const row of data || []) {
        visibilities[row.user_id] = (row as { last_active_visibility?: string | null }).last_active_visibility ?? null
    }

    return NextResponse.json({ visibilities })
}
