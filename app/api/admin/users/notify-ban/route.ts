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
    const { user_id, days } = body || {}
    if (!user_id) return new NextResponse('Missing user_id', { status: 400 })
    const message = Number(days) > 0
        ? `${Number(days)} gün boyunca erişim kısıtlandı.`
        : 'Hesabın süresiz olarak kısıtlandı.'
    const { error } = await admin.from('notifications').insert({
        user_id,
        type: 'ban',
        payload: { title: 'Hesap kısıtlandı', body: message },
    })
    if (error) return new NextResponse(error.message, { status: 500 })
    return NextResponse.json({ ok: true })
}
