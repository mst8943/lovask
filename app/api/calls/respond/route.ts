import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const rate = rateLimit(`calls-respond:${auth.user.id}`, 30, 60_000)
        if (!rate.ok) {
            return new NextResponse('Too many requests', { status: 429, headers: rateLimitHeaders(30, rate) })
        }

        const body = await req.json()
        const { callId, action } = body || {}
        if (!callId || !action) return new NextResponse('Missing parameters', { status: 400 })

        const { data: call, error: callError } = await supabase
            .from('call_sessions')
            .select('id,match_id,status')
            .eq('id', callId)
            .maybeSingle()
        if (callError || !call) return new NextResponse('Call not found', { status: 404 })

        const { data: match } = await supabase
            .from('matches')
            .select('user_a,user_b')
            .eq('id', call.match_id)
            .maybeSingle()
        if (!match || (match.user_a !== auth.user.id && match.user_b !== auth.user.id)) {
            return new NextResponse('Not allowed', { status: 403 })
        }

        let nextStatus = call.status
        if (action === 'accept') nextStatus = 'active'
        if (action === 'decline') nextStatus = 'declined'
        if (action === 'end') nextStatus = 'ended'

        const updates: Record<string, string> = { status: nextStatus }
        if (nextStatus === 'active') updates.started_at = new Date().toISOString()
        if (nextStatus === 'ended' || nextStatus === 'declined') updates.ended_at = new Date().toISOString()

        const { data: updated, error } = await supabase
            .from('call_sessions')
            .update(updates)
            .eq('id', callId)
            .select()
            .single()
        if (error) throw error

        await supabase
            .from('call_participants')
            .update({
                accepted: action === 'accept' ? true : undefined,
                left_at: action === 'end' || action === 'decline' ? new Date().toISOString() : undefined,
            })
            .eq('call_id', callId)
            .eq('user_id', auth.user.id)

        return NextResponse.json({ call: updated })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
