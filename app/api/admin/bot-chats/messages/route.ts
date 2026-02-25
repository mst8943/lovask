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
    const { match_id } = body || {}
    if (!match_id) return new NextResponse('Missing match_id', { status: 400 })

    const { data, error } = await admin
        .from('messages')
        .select('*')
        .eq('match_id', match_id)
        .order('created_at', { ascending: true })
    if (error) return new NextResponse(error.message, { status: 500 })

    const { data: override } = await admin
        .from('bot_chat_overrides')
        .select('ai_enabled')
        .eq('match_id', match_id)
        .maybeSingle()

    return NextResponse.json({ messages: data || [], ai_enabled: override?.ai_enabled !== false })
}
