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
        const content = (body?.content as string | undefined) || ''

        if (!matchId || !content.trim()) {
            return NextResponse.json({ error: 'Missing match_id or content' }, { status: 400 })
        }

        const { data: match } = await admin
            .from('matches')
            .select('id,user_a,user_b')
            .eq('id', matchId)
            .maybeSingle()

        if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

        const { data: participants } = await admin
            .from('profiles')
            .select('id,is_bot')
            .in('id', [match.user_a, match.user_b])

        const bot = (participants || []).find((p) => p.is_bot)
        if (!bot) return NextResponse.json({ error: 'No bot in match' }, { status: 400 })

        await admin.from('messages').insert({
            match_id: matchId,
            sender_id: bot.id,
            content: content.trim(),
            type: 'text',
        })

        return NextResponse.json({ ok: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
