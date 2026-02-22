import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
        const now = new Date().toISOString()

        const { count: totalExpired, error: countError } = await admin
            .from('stories')
            .select('id', { count: 'exact', head: true })
            .lt('expires_at', now)

        if (countError) {
            return new NextResponse(countError.message, { status: 500 })
        }

        const { error: deleteError } = await admin
            .from('stories')
            .delete()
            .lt('expires_at', now)

        if (deleteError) {
            return new NextResponse(deleteError.message, { status: 500 })
        }

        return NextResponse.json({ ok: true, deleted: totalExpired || 0 })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
