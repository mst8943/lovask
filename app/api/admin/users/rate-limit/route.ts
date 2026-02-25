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
    const { action, window_seconds, max_count } = body || {}
    if (!action) return new NextResponse('Missing action', { status: 400 })
    const { data } = await admin.rpc('check_admin_rate_limit', {
        p_admin_id: adminId,
        p_action: action,
        p_window_seconds: Number(window_seconds || 60),
        p_max_count: Number(max_count || 10),
    })
    return NextResponse.json({ allowed: !!data })
}
