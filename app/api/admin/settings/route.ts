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

export async function GET() {
    const admin = await ensureAdmin()
    if (!admin) return new NextResponse('Unauthorized', { status: 401 })

    const [featureFlags, featureRollout, paymentSettings, openrouterSettings, sla] = await Promise.all([
        admin.from('app_settings').select('value').eq('key', 'feature_flags').maybeSingle(),
        admin.from('app_settings').select('value').eq('key', 'feature_rollout').maybeSingle(),
        admin.from('app_settings').select('value').eq('key', 'payment_settings').maybeSingle(),
        admin.from('app_settings').select('value').eq('key', 'openrouter_settings').maybeSingle(),
        admin.from('admin_sla_settings').select('queue,sla_hours'),
    ])

    return NextResponse.json({
        feature_flags: featureFlags.data?.value || null,
        feature_rollout: featureRollout.data?.value || null,
        payment_settings: paymentSettings.data?.value || null,
        openrouter_settings: openrouterSettings.data?.value || null,
        sla_settings: sla.data || [],
    })
}

export async function POST(req: Request) {
    const admin = await ensureAdmin()
    if (!admin) return new NextResponse('Unauthorized', { status: 401 })
    const body = await req.json()
    const {
        feature_flags,
        feature_rollout,
        payment_settings,
        openrouter_settings,
        sla_settings,
    } = body || {}

    if (feature_flags) {
        await admin.from('app_settings').upsert({ key: 'feature_flags', value: feature_flags }, { onConflict: 'key' })
    }
    if (feature_rollout) {
        await admin.from('app_settings').upsert({ key: 'feature_rollout', value: feature_rollout }, { onConflict: 'key' })
    }
    if (payment_settings) {
        await admin.from('app_settings').upsert({ key: 'payment_settings', value: payment_settings }, { onConflict: 'key' })
    }
    if (openrouter_settings) {
        await admin.from('app_settings').upsert({ key: 'openrouter_settings', value: openrouter_settings }, { onConflict: 'key' })
    }
    if (Array.isArray(sla_settings)) {
        await Promise.all(
            sla_settings.map((row: { queue: string; sla_hours: number }) =>
                admin.from('admin_sla_settings').upsert({ queue: row.queue, sla_hours: row.sla_hours }, { onConflict: 'queue' })
            )
        )
    }
    return NextResponse.json({ ok: true })
}
