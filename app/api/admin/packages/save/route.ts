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
    const { kind, row } = body || {}
    if (!kind || !row) return new NextResponse('Missing payload', { status: 400 })

    if (kind === 'coins') {
        const { error } = await admin
            .from('coin_packages')
            .upsert({
                id: row.id || undefined,
                title: row.title || null,
                coins: Number(row.coins || 0),
                price: Number(row.price || 0),
                currency: row.currency || 'TRY',
                is_active: !!row.is_active,
                sort_order: Number(row.sort_order || 0),
                updated_at: new Date().toISOString(),
            })
        if (error) return new NextResponse(error.message, { status: 500 })
        return NextResponse.json({ ok: true })
    }

    if (kind === 'premium') {
        const { error } = await admin
            .from('premium_plans')
            .upsert({
                id: row.id || undefined,
                title: row.title || null,
                months: Number(row.months || 0),
                price: Number(row.price || 0),
                currency: row.currency || 'TRY',
                is_active: !!row.is_active,
                sort_order: Number(row.sort_order || 0),
                updated_at: new Date().toISOString(),
            })
        if (error) return new NextResponse(error.message, { status: 500 })
        return NextResponse.json({ ok: true })
    }

    return new NextResponse('Invalid kind', { status: 400 })
}

