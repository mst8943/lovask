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
    return { admin, supabase, adminId: data.user.id }
}

export async function POST(req: Request) {
    const context = await ensureAdmin()
    if (!context) return new NextResponse('Unauthorized', { status: 401 })
    const { supabase, admin, adminId } = context
    const body = await req.json().catch(() => ({}))
    const { transfer_id, approve } = body || {}
    if (!transfer_id) return new NextResponse('Missing transfer_id', { status: 400 })
    const { error } = await supabase.rpc('verify_bank_transfer', {
        p_transfer_id: transfer_id,
        p_approve: !!approve,
    })
    if (error) return new NextResponse(error.message, { status: 500 })

    // Audit log for financial traceability
    try {
        await admin.from('admin_audit_logs').insert({
            admin_id: adminId,
            action: approve ? 'bank_transfer_approve' : 'bank_transfer_reject',
            target_table: 'bank_transfers',
            target_id: transfer_id,
            metadata: { approve },
        })
    } catch {
        // Non-blocking: audit should not fail the transfer flow
    }

    return NextResponse.json({ ok: true })
}
