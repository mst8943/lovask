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
    const { queue } = body || {}
    if (!queue) return new NextResponse('Missing queue', { status: 400 })
    const { data, error } = await admin
        .from('admin_sla_settings')
        .select('sla_hours')
        .eq('queue', queue)
        .maybeSingle()
    if (error) return new NextResponse(error.message, { status: 500 })
    return NextResponse.json({ sla_hours: data?.sla_hours ?? null })
}
