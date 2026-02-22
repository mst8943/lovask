import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const { data: me } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
        if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const body = await req.json()
        const matchId = body?.match_id as string | undefined
        const aiEnabled = body?.ai_enabled as boolean | undefined

        if (!matchId || typeof aiEnabled !== 'boolean') {
            return NextResponse.json({ error: 'Missing match_id or ai_enabled' }, { status: 400 })
        }

        await admin.from('bot_chat_overrides').upsert({
            match_id: matchId,
            ai_enabled: aiEnabled,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
        })

        return NextResponse.json({ ok: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
