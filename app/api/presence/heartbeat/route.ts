import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const rate = rateLimit(`presence-heartbeat:${auth.user.id}`, 12, 60_000)
        if (!rate.ok) {
            return new NextResponse('Too many requests', { status: 429, headers: rateLimitHeaders(12, rate) })
        }

        const admin = createAdminClient()
        const { error } = await admin
            .from('users')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', auth.user.id)

        if (error) {
            return new NextResponse(error.message, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
