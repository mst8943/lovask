import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const admin = createAdminClient()
        const { data: me } = await admin.from('users').select('role').eq('id', auth.user.id).maybeSingle()
        if (me?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

        const payload = await req.json()
        const email = `bot+${crypto.randomUUID()}@lovask.ai`
        const password = crypto.randomUUID()

        const { data: created, error: createError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })
        if (createError || !created.user) {
            return new NextResponse(createError?.message || 'Failed to create user', { status: 500 })
        }

        const userId = created.user.id

        await admin.from('users').update({ role: 'bot' }).eq('id', userId)

        await admin.from('profiles').insert({
            id: userId,
            display_name: payload.display_name,
            age: payload.age,
            gender: payload.gender,
            city: payload.city,
            bio: payload.bio || null,
            photos: payload.photos || [],
            is_bot: true,
        })

        await admin.from('bot_configs').insert({
            user_id: userId,
            personality_prompt: payload.prompt || '',
            behavior_settings: {
                active: true,
                group_id: payload.group_id || null,
            },
            tone: payload.tone || null,
            language_mode: payload.language_mode || null,
            auto_like_rate: payload.auto_like_rate || null,
            engagement_intensity: payload.engagement_intensity || null,
            cooldown_hours: payload.cooldown_hours || null,
            active_hours: Array.isArray(payload.active_hours) ? payload.active_hours : null,
            response_delay_min_s: payload.response_delay_min_s || null,
            response_delay_max_s: payload.response_delay_max_s || null,
            allow_initiate: payload.allow_initiate || null,
            auto_story: payload.auto_story || null,
            profile_rotation_minutes: payload.profile_rotation_minutes || null,
            use_global: payload.use_global ?? true,
        })

        return NextResponse.json({ success: true, id: userId })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
