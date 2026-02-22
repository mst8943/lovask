import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json()
        const { callId, toUserId, signalType, payload } = body || {}
        if (!callId || !toUserId || !signalType) return new NextResponse('Missing parameters', { status: 400 })

        const { data: call } = await supabase
            .from('call_sessions')
            .select('id,match_id')
            .eq('id', callId)
            .maybeSingle()
        if (!call) return new NextResponse('Call not found', { status: 404 })

        const { data: match } = await supabase
            .from('matches')
            .select('user_a,user_b')
            .eq('id', call.match_id)
            .maybeSingle()
        if (!match || (match.user_a !== auth.user.id && match.user_b !== auth.user.id)) {
            return new NextResponse('Not allowed', { status: 403 })
        }

        const { error } = await supabase
            .from('call_signals')
            .insert({
                call_id: callId,
                from_user: auth.user.id,
                to_user: toUserId,
                signal_type: signalType,
                payload: payload || {},
            })
        if (error) throw error

        return NextResponse.json({ ok: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
