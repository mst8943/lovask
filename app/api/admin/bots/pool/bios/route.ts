import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const { data: me } = await admin.from('users').select('role').eq('id', auth.user.id).maybeSingle()
        if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const body = await req.json()
        const gender = (body?.gender as string | undefined) || null
        const bios = Array.isArray(body?.bios) ? body.bios : []
        if (bios.length === 0) return NextResponse.json({ error: 'No bios' }, { status: 400 })

        const rows = bios
            .map((b: string) => (b || '').trim())
            .filter(Boolean)
            .map((bio: string) => ({
                gender,
                bio,
            }))

        if (rows.length === 0) return NextResponse.json({ error: 'No valid bios' }, { status: 400 })

        await admin.from('bot_bio_pool').insert(rows)
        return NextResponse.json({ ok: true, count: rows.length })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
