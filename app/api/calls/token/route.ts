import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCallProviderConfig, ensureCallProviderReady } from '@/lib/calls/provider'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'
const { RtcTokenBuilder, RtcRole } = require('agora-access-token')

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

        const rate = rateLimit(`calls-token:${auth.user.id}`, 12, 60_000)
        if (!rate.ok) {
            return new NextResponse('Too many requests', { status: 429, headers: rateLimitHeaders(12, rate) })
        }

        const body = await req.json()
        const { callId } = body || {}
        if (!callId) return new NextResponse('Missing parameters', { status: 400 })

        // Check if user is part of this call
        const { data: session, error: sessionError } = await supabase
            .from('call_sessions')
            .select('*')
            .eq('id', callId)
            .single()

        if (sessionError || !session) {
            return new NextResponse('Call session not found', { status: 404 })
        }

        // Generate Agora Token
        const appId = providerConfig.agora?.appId!
        const appCertificate = providerConfig.agora?.appCertificate!
        const channelName = callId
        const uid = 0 // Using 0 means Agora will assign a random uint UID or we can use a hash of userId
        const role = RtcRole.PUBLISHER
        const expirationTimeInSeconds = 3600
        const currentTimestamp = Math.floor(Date.now() / 1000)
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

        const token = RtcTokenBuilder.buildTokenWithUint(
            appId,
            appCertificate,
            channelName,
            uid,
            role,
            privilegeExpiredTs
        )

        return NextResponse.json({
            provider: 'agora',
            token,
            appId,
            channelName,
            uid,
            callId
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        console.error('Call token error:', err)
        return new NextResponse(message, { status: 500 })
    }
}
