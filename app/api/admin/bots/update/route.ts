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
    const {
        bot_id,
        profile,
        user,
        config,
    } = body || {}
    if (!bot_id) return new NextResponse('Missing bot_id', { status: 400 })

    if (profile) {
        await admin.from('profiles').update(profile).eq('id', bot_id)
    }
    if (user) {
        await admin.from('users').update(user).eq('id', bot_id)
    }
    if (config) {
        await admin.from('bot_configs').update(config).eq('user_id', bot_id)
    }
    return NextResponse.json({ ok: true })
}
