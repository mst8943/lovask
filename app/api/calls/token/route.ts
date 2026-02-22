import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCallProviderConfig, ensureCallProviderReady } from '@/lib/calls/provider'

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

        const body = await req.json()
        const { callId } = body || {}
        if (!callId) return new NextResponse('Missing parameters', { status: 400 })

        // Placeholder: provider-specific token generation will be added once credentials are set.
        return NextResponse.json({ provider: providerConfig.provider, token: null, callId })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
