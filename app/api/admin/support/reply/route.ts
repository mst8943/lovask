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
    const { ticket_id, user_id, body: message } = body || {}
    if (!ticket_id || !user_id || !message) return new NextResponse('Missing fields', { status: 400 })
    const { error } = await admin.from('support_messages').insert({
        ticket_id,
        sender_id: user_id,
        sender_role: 'admin',
        body: message,
    })
    if (error) return new NextResponse(error.message, { status: 500 })
    await admin.from('notifications').insert({
        user_id,
        type: 'support',
        payload: { title: 'Destek yaniti', body: message },
    })
    return NextResponse.json({ ok: true })
}
