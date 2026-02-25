import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const rate = rateLimit(`referrals-ensure:${auth.user.id}`, 6, 60_000)
        if (!rate.ok) {
            return new NextResponse('Too many requests', { status: 429, headers: rateLimitHeaders(6, rate) })
        }

        const admin = createAdminClient()
        const { data: user } = await admin
            .from('users')
            .select('referral_code')
            .eq('id', auth.user.id)
            .maybeSingle()
        if (user?.referral_code) {
            return NextResponse.json({ code: user.referral_code })
        }

        let code = generateCode()
        for (let i = 0; i < 5; i += 1) {
            const { data: exists } = await admin
                .from('users')
                .select('id')
                .eq('referral_code', code)
                .maybeSingle()
            if (!exists) break
            code = generateCode()
        }

        await admin
            .from('users')
            .update({ referral_code: code })
            .eq('id', auth.user.id)

        return NextResponse.json({ code })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
