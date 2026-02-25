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
    const { user_id, days, reason, report_id, note } = body || {}
    if (!user_id) return new NextResponse('Missing user_id', { status: 400 })
    const now = Date.now()
    const expiresAt = Number(days) > 0 ? new Date(now + Number(days) * 24 * 60 * 60 * 1000).toISOString() : null
    const { error } = await admin.from('users').update({
        is_banned: true,
        ban_reason: reason || 'Kural ihlali',
        ban_expires_at: expiresAt,
    }).eq('id', user_id)
    if (error) return new NextResponse(error.message, { status: 500 })
    await admin.from('admin_audit_logs').insert({
        action: 'ban_user',
        target_table: 'users',
        target_id: user_id,
        metadata: { report_id: report_id ?? null, note: note ?? null },
    })
    await admin.from('notifications').insert({
        user_id,
        type: 'ban',
        payload: { title: 'Hesap banlandı', body: 'Rapor sonucu hesabın geçici/kalıcı olarak banlandı.' },
    })
    return NextResponse.json({ ok: true })
}
