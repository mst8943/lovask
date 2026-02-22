import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runModerationRules } from '@/lib/moderation/runModeration'

const isAuthorized = (req: Request) => {
    const token = req.headers.get('authorization') || ''
    const secret = process.env.CRON_SECRET || ''
    if (!secret) return false
    return token === `Bearer ${secret}`
}

export async function POST(req: Request) {
    if (!isAuthorized(req)) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const admin = createAdminClient()
        const result = await runModerationRules(admin)
        return NextResponse.json({ ok: true, ...result })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
