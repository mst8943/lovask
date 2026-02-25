import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ensureAdmin = async () => {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return null
    const admin = createAdminClient()
    const { data: userData } = await admin.from('users').select('role').eq('id', data.user.id).single()
    if (userData?.role !== 'admin') return null
    return admin
}

export async function POST(req: Request) {
    const admin = await ensureAdmin()
    if (!admin) return new NextResponse('Unauthorized', { status: 401 })
    const body = await req.json().catch(() => ({}))
    const { kind, id } = body || {}
    if (!kind || !id) return new NextResponse('Missing payload', { status: 400 })

    if (kind === 'coins') {
        const { error } = await admin.from('coin_packages').delete().eq('id', id)
        if (error) return new NextResponse(error.message, { status: 500 })
        return NextResponse.json({ ok: true })
    }
    if (kind === 'premium') {
        const { error } = await admin.from('premium_plans').delete().eq('id', id)
        if (error) return new NextResponse(error.message, { status: 500 })
        return NextResponse.json({ ok: true })
    }

    return new NextResponse('Invalid kind', { status: 400 })
}

