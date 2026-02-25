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
    const [coinsRes, premiumRes] = await Promise.all([
        admin.from('coin_packages').select('*').order('sort_order', { ascending: true }).order('price', { ascending: true }),
        admin.from('premium_plans').select('*').order('sort_order', { ascending: true }).order('price', { ascending: true }),
    ])
    if (coinsRes.error) return new NextResponse(coinsRes.error.message, { status: 500 })
    if (premiumRes.error) return new NextResponse(premiumRes.error.message, { status: 500 })
    return NextResponse.json({ coin_packages: coinsRes.data || [], premium_plans: premiumRes.data || [] })
}

