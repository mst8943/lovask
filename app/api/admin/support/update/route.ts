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
    const { id, status, admin_note, user_id } = body || {}
    if (!id || !status) return new NextResponse('Missing fields', { status: 400 })
    const { error } = await admin
        .from('support_tickets')
        .update({ status, admin_note: admin_note ?? null, updated_at: new Date().toISOString() })
        .eq('id', id)
    if (error) return new NextResponse(error.message, { status: 500 })
    if (user_id) {
        await admin.from('notifications').insert({
            user_id,
            type: 'support',
            payload: { title: 'Destek talebi güncellendi', body: `Durum: ${status}` },
        })
    }
    return NextResponse.json({ ok: true })
}
