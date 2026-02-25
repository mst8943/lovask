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
        .from('users')
        .select('id,email,role,coin_balance,is_premium,premium_expires_at,created_at,last_active_at, profiles:profiles(display_name,age,gender,city,photos,bio), bot_configs:bot_configs(personality_prompt,behavior_settings,tone,language_mode,auto_like_rate,engagement_intensity,cooldown_hours,active_hours,response_delay_min_s,response_delay_max_s,auto_story,profile_rotation_minutes,use_global)')
        .eq('role', 'bot')
        .order('created_at', { ascending: false })
    if (error) return new NextResponse(error.message, { status: 500 })
    return NextResponse.json({ rows: data || [] })
}
