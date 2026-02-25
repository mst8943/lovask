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
    const { id, status, reported_id, note } = body || {}
    if (!id || !status) return new NextResponse('Missing fields', { status: 400 })
    const { error } = await admin
        .from('reports')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
    if (error) return new NextResponse(error.message, { status: 500 })
    if (reported_id) {
        await admin.from('admin_audit_logs').insert({
            action: `report_${status}`,
            target_table: 'reports',
            target_id: id,
            metadata: { reported_id, note: note ?? null },
        })
        await admin.from('notifications').insert({
            user_id: reported_id,
            type: 'report_resolved',
            payload: { title: 'Rapor sonucu', body: status === 'resolved' ? 'Raporun değerlendirildi.' : 'Rapor reddedildi.' },
        })
    }
    return NextResponse.json({ ok: true })
}
