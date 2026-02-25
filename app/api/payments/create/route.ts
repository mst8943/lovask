import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

type PaymentKind = 'coins' | 'premium'
type Provider = 'bank_transfer' | 'stripe' | 'iyzico'

const MAX_AMOUNT_TRY = 5000
const PENDING_LIMIT = 3
const HOURLY_LIMIT = 5

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const rate = rateLimit(`payments-create:${auth.user.id}`, 6, 60_000)
        if (!rate.ok) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: rateLimitHeaders(6, rate) }
            )
        }

        const body = await req.json().catch(() => ({}))
        const provider = body?.provider as Provider | undefined
        const kind = body?.kind as PaymentKind | undefined
        let amount = Number(body?.amount || 0)
        const metadata = (body?.metadata || {}) as Record<string, unknown>

        const admin = createAdminClient()
        const { data: settingRow } = await admin
            .from('app_settings')
            .select('value')
            .eq('key', 'payment_settings')
            .maybeSingle()
        const settings = settingRow?.value || { provider: 'bank_transfer', card_enabled: false }

        if (!settings.card_enabled || settings.provider === 'bank_transfer') {
            return new NextResponse('Card payments disabled', { status: 403 })
        }

        if (provider !== settings.provider) {
            return new NextResponse('Provider mismatch', { status: 400 })
        }

        if (amount > MAX_AMOUNT_TRY) {
            await admin.from('payment_risk_events').insert({
                user_id: auth.user.id,
                reason: 'amount_limit',
                severity: 'high',
                metadata: { amount },
            })
            return new NextResponse('Amount too high', { status: 400 })
        }

        // If a package/plan is provided, enforce server-side pricing + amounts.
        if (kind === 'coins' && metadata.package_id) {
            const { data: pkg, error: pkgError } = await admin
                .from('coin_packages')
                .select('id,coins,price,is_active')
                .eq('id', String(metadata.package_id))
                .maybeSingle()
            if (pkgError || !pkg || !pkg.is_active) {
                return new NextResponse('Invalid coin package', { status: 400 })
            }
            metadata.coins = pkg.coins
            amount = Number(pkg.price)
        }
        if (kind === 'premium' && metadata.plan_id) {
            const { data: plan, error: planError } = await admin
                .from('premium_plans')
                .select('id,months,price,is_active')
                .eq('id', String(metadata.plan_id))
                .maybeSingle()
            if (planError || !plan || !plan.is_active) {
                return new NextResponse('Invalid premium plan', { status: 400 })
            }
            metadata.months = plan.months
            amount = Number(plan.price)
        }

        if (!provider || !kind || !Number.isFinite(amount) || amount <= 0) {
            return new NextResponse('Invalid payload', { status: 400 })
        }

        const now = new Date()
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

        const [{ count: pendingCount }, { count: hourlyCount }, { count: recentFails }] = await Promise.all([
            admin.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', auth.user.id).eq('status', 'pending'),
            admin.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', auth.user.id).gte('created_at', hourAgo),
            admin.from('payments').select('id', { count: 'exact', head: true }).eq('user_id', auth.user.id).eq('status', 'failed').gte('created_at', hourAgo),
        ])

        if ((pendingCount || 0) >= PENDING_LIMIT || (hourlyCount || 0) >= HOURLY_LIMIT || (recentFails || 0) >= 3) {
            await admin.from('payment_risk_events').insert({
                user_id: auth.user.id,
                reason: 'velocity',
                severity: 'medium',
                metadata: { pendingCount, hourlyCount, recentFails },
            })
            const { data } = await admin
                .from('payments')
                .insert({
                    user_id: auth.user.id,
                    provider,
                    kind,
                    amount,
                    currency: 'TRY',
                    status: 'review',
                    metadata,
                })
                .select('*')
                .single()
            return NextResponse.json({ payment: data, review: true }, { headers: rateLimitHeaders(6, rate) })
        }

        const { data, error } = await admin
            .from('payments')
            .insert({
                user_id: auth.user.id,
                provider,
                kind,
                amount,
                currency: 'TRY',
                status: 'pending',
                metadata,
            })
            .select('*')
            .single()

        if (error) {
            return new NextResponse(error.message, { status: 500 })
        }

        return NextResponse.json({ payment: data, review: false }, { headers: rateLimitHeaders(6, rate) })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
