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
    const limit = Number(body?.limit || 25)

    const { data, error } = await admin
        .from('profiles')
        .select('id, display_name, is_verified, photos, users:users(email,role,coin_balance,is_premium,premium_expires_at,is_banned,ban_reason,ban_expires_at,last_active_at)')
        .order('updated_at', { ascending: false })
        .limit(limit)
    if (error) return new NextResponse(error.message, { status: 500 })

    const rows = (data || []) as Array<{ id: string }>
    const ids = rows.map((r) => r.id)
    let riskMap: Record<string, number> = {}
    if (ids.length > 0) {
        const { data: risks } = await admin.from('admin_risk_scores').select('user_id,score').in('user_id', ids)
        riskMap = Object.fromEntries((risks || []).map((r: { user_id: string; score: number }) => [r.user_id, r.score]))
    }
    return NextResponse.json({ rows, riskMap })
}
