import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const { data: me } = await admin.from('users').select('role').eq('id', auth.user.id).maybeSingle()
        if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const { data: names } = await admin
            .from('bot_name_pool')
            .select('gender,name')
            .order('created_at', { ascending: true })

        return NextResponse.json({ names: names || [] })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const admin = createAdminClient()
        const { data: me } = await admin.from('users').select('role').eq('id', auth.user.id).maybeSingle()
        if (me?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

        const body = await req.json()
        const gender = String(body.gender || '').toLowerCase()
        const replace = !!body.replace
        const names = Array.isArray(body.names)
            ? body.names.map((n: unknown) => String(n ?? '').trim()).filter(Boolean)
            : []

        if (!gender) return new NextResponse('Gender required', { status: 400 })
        if (names.length === 0) return new NextResponse('No names provided', { status: 400 })

        if (replace) {
            await admin.from('bot_name_pool').delete().eq('gender', gender)
        }

        const rows = names.map((name: string) => ({ gender, name }))
        const { error } = await admin.from('bot_name_pool').insert(rows)
        if (error) throw error

        return NextResponse.json({ success: true, inserted: rows.length })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
