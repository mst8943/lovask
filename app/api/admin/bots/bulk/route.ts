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

        const body = await req.json()
        type BotBulkItem = {
            display_name?: string
            age?: number
            gender?: string
            city?: string
            bio?: string | null
            photos?: string[]
            prompt?: string
            group_id?: string | null
            tone?: string | null
            language_mode?: string | null
            auto_like_rate?: number | null
            engagement_intensity?: string | null
            cooldown_hours?: number | null
            active_hours?: number[] | null
            response_delay_min_s?: number | null
            response_delay_max_s?: number | null
            allow_initiate?: boolean | null
            auto_story?: boolean | null
            profile_rotation_minutes?: number | null
            use_global?: boolean | null
        }

        const items: BotBulkItem[] = Array.isArray(body.items) ? body.items : []
        if (items.length === 0) return new NextResponse('No items', { status: 400 })

        const { data: photoPool } = await admin
            .from('bot_photo_pool')
            .select('gender,size,url')

        const { data: bioPool } = await admin
            .from('bot_bio_pool')
            .select('gender,bio')

        const results: Array<{ id?: string; error?: string }> = []

        for (const payload of items) {
            const email = `bot+${crypto.randomUUID()}@lovask.ai`
            const password = crypto.randomUUID()
            const { data: created, error: createError } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            })
            if (createError || !created.user) {
                results.push({ error: createError?.message || 'create failed' })
                continue
            }

            const userId = created.user.id
            await admin.from('users').update({ role: 'bot' }).eq('id', userId)

            const gender = (payload.gender || '').toLowerCase()
            const poolPhotos = (photoPool as Array<{ gender: string | null; size: number | null; url: string }> || [])
                .filter((p) => p.gender === gender && p.size === 1024)
                .map((p) => p.url)

            let finalBio = payload.bio || null
            if (!finalBio) {
                const candidates = (bioPool as Array<{ gender: string | null; bio: string }> || [])
                    .filter((b) => !b.gender || b.gender === gender)
                if (candidates.length > 0) {
                    const pick = candidates[Math.floor(Math.random() * candidates.length)]
                    finalBio = pick.bio
                }
            }

            await admin.from('profiles').insert({
                id: userId,
                display_name: payload.display_name,
                age: payload.age,
                gender: payload.gender,
                city: payload.city,
                bio: finalBio,
                photos: [...(payload.photos || []), ...poolPhotos],
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
            results.push({ id: userId })
        }

        return NextResponse.json({ success: true, results })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
