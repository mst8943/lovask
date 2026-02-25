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
    const { id, status, admin_note } = body || {}
    if (!id || !status) return new NextResponse('Missing fields', { status: 400 })

    const { data: updated, error } = await admin
        .from('user_verifications')
        .update({ status, admin_note: admin_note ?? null, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()
    if (error) return new NextResponse(error.message, { status: 500 })

    if (updated?.type === 'photo' && status === 'approved') {
        await admin.from('profiles').update({ is_verified: true }).eq('id', updated.user_id)
    }
    await admin.from('notifications').insert({
        user_id: updated.user_id,
        type: 'verification',
        payload: {
            title: 'Doğrulama sonucu',
            body: status === 'approved' ? 'Doğrulama onaylandı.' : 'Doğrulama reddedildi.',
        },
    })

    return NextResponse.json({ row: updated })
}
