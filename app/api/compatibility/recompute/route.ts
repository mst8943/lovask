import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization') || ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
        if (!token) return new NextResponse('Unauthorized', { status: 401 })

        const admin = createAdminClient()
        const { data: authData, error: authError } = await admin.auth.getUser(token)
        if (authError || !authData?.user) return new NextResponse('Unauthorized', { status: 401 })
        const userId = authData.user.id

        const rate = rateLimit(`compatibility-recompute:${userId}`, 3, 60_000)
        if (!rate.ok) {
            return new NextResponse('Too many requests', { status: 429, headers: rateLimitHeaders(3, rate) })
        }

        const supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: { persistSession: false, autoRefreshToken: false },
                global: { headers: { Authorization: `Bearer ${token}` } },
            }
        )
        const { data, error } = await supabase.rpc('compute_compatibility_scores', {
            p_user_id: userId,
            p_limit: 200,
        })
        if (error) throw error

        return NextResponse.json({ updated: data ?? 0 })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
