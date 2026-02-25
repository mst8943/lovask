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
    return { admin, adminId: data.user.id }
}

export async function POST(req: Request) {
    const result = await ensureAdmin()
    if (!result) return new NextResponse('Unauthorized', { status: 401 })
    const { admin, adminId } = result
    const body = await req.json().catch(() => ({}))
    const { id, status } = body || {}
    if (!id || !status) return new NextResponse('Missing fields', { status: 400 })
    const { error } = await admin
        .from('payments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
    if (error) return new NextResponse(error.message, { status: 500 })
    await admin.from('admin_audit_logs').insert({
        admin_id: adminId,
        action: 'payment_status_update',
        target_table: 'payments',
        target_id: id,
        metadata: { status },
    })
    return NextResponse.json({ ok: true })
}
