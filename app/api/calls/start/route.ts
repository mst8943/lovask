import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCallProviderConfig, ensureCallProviderReady } from '@/lib/calls/provider'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

export async function POST(req: Request) {
    try {
        const providerConfig = getCallProviderConfig()
        const providerReady = ensureCallProviderReady(providerConfig)
        if (!providerReady.ok) {
            return new NextResponse(providerReady.message, { status: 501 })
        }

        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const rate = rateLimit(`calls-start:${auth.user.id}`, 6, 60_000)
        if (!rate.ok) {
            return new NextResponse('Too many requests', { status: 429, headers: rateLimitHeaders(6, rate) })
        }

        const body = await req.json()
        const { matchId, callType } = body || {}
        if (!matchId || !callType) return new NextResponse('Missing parameters', { status: 400 })

        const { data: match } = await supabase
            .from('matches')
            .select('id,user_a,user_b')
            .eq('id', matchId)
            .maybeSingle()
        if (!match || (match.user_a !== auth.user.id && match.user_b !== auth.user.id)) {
            return new NextResponse('Not allowed', { status: 403 })
        }

        const { data: call, error } = await supabase
            .from('call_sessions')
            .insert({
                match_id: matchId,
                created_by: auth.user.id,
                call_type: callType,
                status: 'ringing',
                provider: providerConfig.provider,
            })
            .select()
            .single()
        if (error) throw error

        const otherId = match.user_a === auth.user.id ? match.user_b : match.user_a
        await supabase.from('call_participants').insert([
            { call_id: call.id, user_id: auth.user.id, role: 'caller', accepted: true, joined_at: new Date().toISOString() },
            { call_id: call.id, user_id: otherId, role: 'callee', accepted: false },
        ])

        return NextResponse.json({ call })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
