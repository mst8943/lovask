import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const normalizeGender = (gender?: string | null) => {
    const g = (gender || '').toLowerCase()
    if (g.startsWith('f')) return 'female'
    if (g.startsWith('m')) return 'male'
    return null
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const { data: me } = await admin.from('users').select('role').eq('id', auth.user.id).maybeSingle()
        if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const body = await req.json().catch(() => ({})) as { gender?: string | null }
        const gender = normalizeGender(body.gender)

        let query = admin
            .from('bot_photo_pool')
            .select('url,gender,size')
            .eq('size', 1024)

        if (gender) query = query.eq('gender', gender)

        const { data } = await query.limit(50)
        const pool = data || []
        if (pool.length === 0) {
            return NextResponse.json({ error: 'empty' }, { status: 404 })
        }

        const picked = pool[Math.floor(Math.random() * pool.length)]
        return NextResponse.json({ url: picked.url })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
