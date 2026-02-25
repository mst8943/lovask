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
    const { ticket_id } = body || {}
    if (!ticket_id) return new NextResponse('Missing ticket_id', { status: 400 })
    const { data, error } = await admin
        .from('support_messages')
        .select('id,sender_role,body,created_at')
        .eq('ticket_id', ticket_id)
        .order('created_at', { ascending: true })
    if (error) return new NextResponse(error.message, { status: 500 })
    return NextResponse.json({ rows: data || [] })
}
