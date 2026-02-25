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
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const dateStr = thirtyDaysAgo.toISOString()

        // 1. Find old audio messages
        const { data: oldMessages, error: fetchError } = await admin
            .from('messages')
            .select('id, media_url')
            .eq('type', 'audio')
            .lt('created_at', dateStr)

        if (fetchError) throw fetchError

        if (!oldMessages || oldMessages.length === 0) {
            return NextResponse.json({ ok: true, deleted: 0, message: 'No old audio found' })
        }

        // 2. Delete files from Storage
        // Extract paths from media_url (format: chat-audio/userId/matchId/filename)
        const filesToDelete = oldMessages
            .map(m => m.media_url?.replace('chat-audio/', ''))
            .filter((path): path is string => !!path)

        if (filesToDelete.length > 0) {
            const { error: storageError } = await admin.storage
                .from('chat-audio')
                .remove(filesToDelete)

            if (storageError) {
                console.error('Storage cleanup error:', storageError)
                // We continue to delete DB records even if some storage files fail
            }
        }

        // 3. Delete records from Database
        const { error: deleteError } = await admin
            .from('messages')
            .delete()
            .in('id', oldMessages.map(m => m.id))

        if (deleteError) throw deleteError

        return NextResponse.json({
            ok: true,
            deleted: oldMessages.length,
            fileCount: filesToDelete.length
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        console.error('Cleanup Cron Error:', message)
        return new NextResponse(message, { status: 500 })
    }
}
