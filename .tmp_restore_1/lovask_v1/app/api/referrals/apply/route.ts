import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REFERRER_BONUS = 50
const REFEREE_BONUS = 25

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const body = await req.json().catch(() => ({}))
        const code = String(body?.code || '').trim().toUpperCase()
        if (!code) return new NextResponse('Missing code', { status: 400 })

        const admin = createAdminClient()
        const { data: referrer } = await admin
            .from('users')
            .select('id')
            .eq('referral_code', code)
            .maybeSingle()
        if (!referrer?.id) return new NextResponse('Invalid code', { status: 404 })
        if (referrer.id === auth.user.id) return new NextResponse('Cannot refer yourself', { status: 400 })

        const { data: userRow } = await admin
            .from('users')
            .select('referred_by')
            .eq('id', auth.user.id)
            .maybeSingle()
        if (userRow?.referred_by) return NextResponse.json({ ok: true, skipped: 'already_referred' })

        await admin
            .from('users')
            .update({ referred_by: referrer.id })
            .eq('id', auth.user.id)

        const bumpBalance = async (userId: string, amount: number) => {
            const { data: row } = await admin
                .from('users')
                .select('coin_balance')
                .eq('id', userId)
                .maybeSingle()
            const balance = row?.coin_balance || 0
            await admin
                .from('users')
                .update({ coin_balance: balance + amount })
                .eq('id', userId)
            await admin
                .from('transactions')
                .insert({
                    user_id: userId,
                    amount,
                    type: 'bonus',
                    metadata: { reason: 'referral' },
                })
        }

        await bumpBalance(referrer.id, REFERRER_BONUS)
        await bumpBalance(auth.user.id, REFEREE_BONUS)

        return NextResponse.json({ ok: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
