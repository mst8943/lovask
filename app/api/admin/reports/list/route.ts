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

export async function POST() {
    const admin = await ensureAdmin()
    if (!admin) return new NextResponse('Unauthorized', { status: 401 })
    const { data, error } = await admin
        .from('reports')
        .select('id,reported_id,reporter_id,status,reason,created_at,reported:reported_id(email,last_active_at),reporter:reporter_id(email,last_active_at)')
        .order('created_at', { ascending: false })
    if (error) return new NextResponse(error.message, { status: 500 })
    return NextResponse.json({ rows: data || [] })
}
