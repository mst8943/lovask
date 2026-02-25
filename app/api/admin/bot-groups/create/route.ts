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
        name,
        prompt,
        tone,
        language_mode,
        auto_like_rate,
        engagement_intensity,
        cooldown_hours,
        response_delay_min_s,
        response_delay_max_s,
        auto_story,
        profile_rotation_minutes,
        active_hours,
    } = body || {}
    if (!name) return new NextResponse('Missing name', { status: 400 })
    const { data, error } = await admin
        .from('bot_groups')
        .insert({
            name,
            prompt,
            tone,
            language_mode,
            auto_like_rate,
            engagement_intensity,
            cooldown_hours,
            response_delay_min_s,
            response_delay_max_s,
            auto_story,
            profile_rotation_minutes,
            active_hours,
        })
        .select()
        .single()
    if (error) return new NextResponse(error.message, { status: 500 })
    return NextResponse.json({ row: data })
}
