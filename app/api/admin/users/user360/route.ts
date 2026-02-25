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
    const userId = body?.user_id as string | undefined
    if (!userId) return new NextResponse('Missing user_id', { status: 400 })

    const [supportRes, reportsRes, verRes, txRes] = await Promise.all([
        admin.from('support_tickets').select('id,subject,status,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        admin.from('reports').select('id,reason,status,created_at').eq('reported_id', userId).order('created_at', { ascending: false }).limit(5),
        admin.from('user_verifications').select('id,type,status,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        admin.from('transactions').select('id,type,amount,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    ])

    return NextResponse.json({
        support: supportRes.data || [],
        reports: reportsRes.data || [],
        verifications: verRes.data || [],
        transactions: txRes.data || [],
    })
}
