import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const admin = createAdminClient()
        const { data: me } = await admin.from('users').select('role').eq('id', auth.user.id).maybeSingle()
        if (me?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

        const { data: settings } = await admin
            .from('bot_global_settings')
            .select('*')
            .limit(1)
            .maybeSingle()

        if (!settings) {
            return NextResponse.json({ ok: true, notes: 'No settings' })
        }

        // Auto story: pick random bots and post story from first photo
        if (settings.auto_story) {
            const { data: bots } = await admin
                .from('profiles')
                .select('id, photos')
                .eq('is_bot', true)
                .limit(20)
            for (const b of bots || []) {
                const photos = Array.isArray(b.photos) ? b.photos : []
                if (photos.length === 0) continue
                await admin.from('stories').insert({
                    user_id: b.id,
                    media_url: photos[0],
                    media_type: 'image',
                })
            }
        }

        // Ensure bot user_settings rows exist (prevents RLS on message send)
        const { data: botIds } = await admin
            .from('profiles')
            .select('id')
            .eq('is_bot', true)
        if (botIds && botIds.length > 0) {
            const rows = botIds.map((b) => ({
                user_id: b.id,
                last_active_visibility: 'matches',
                message_request_mode: 'open',
                harassment_mode: false,
            }))
            const chunkSize = 200
            for (let i = 0; i < rows.length; i += chunkSize) {
                await admin.from('user_settings').upsert(rows.slice(i, i + chunkSize), { onConflict: 'user_id' })
            }
        }

        // Profile rotation: if enabled, set random variant active
        if (settings.profile_rotation_minutes && settings.profile_rotation_minutes > 0) {
            const { data: variants } = await admin
                .from('profile_variants')
                .select('id, user_id')
            if (variants && variants.length > 0) {
                const byUser = new Map<string, Array<{ id: string; user_id: string }>>()
                for (const v of variants) {
                    if (!byUser.has(v.user_id)) byUser.set(v.user_id, [])
                    byUser.get(v.user_id)!.push(v)
                }
                for (const [userId, list] of byUser.entries()) {
                    const pick = list[Math.floor(Math.random() * list.length)]
                    await admin.from('profile_variants').update({ is_active: false }).eq('user_id', userId)
                    await admin.from('profile_variants').update({ is_active: true }).eq('id', pick.id)
                }
            }
        }

        await admin.from('bot_maintenance_logs').insert({ notes: 'maintenance ran' })

        return NextResponse.json({ ok: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
