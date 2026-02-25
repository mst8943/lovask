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
    const { bot_id } = body || {}
    if (!bot_id) return new NextResponse('Missing bot_id', { status: 400 })

    const [likes, matches, messages] = await Promise.all([
        admin.from('likes').select('id', { count: 'exact', head: true }).eq('from_user', bot_id),
        admin.from('matches').select('id', { count: 'exact', head: true }).or(`user_a.eq.${bot_id},user_b.eq.${bot_id}`),
        admin.from('messages').select('id', { count: 'exact', head: true }).eq('sender_id', bot_id),
    ])

    return NextResponse.json({
        likes: likes.count || 0,
        matches: matches.count || 0,
        messages: messages.count || 0,
    })
}
