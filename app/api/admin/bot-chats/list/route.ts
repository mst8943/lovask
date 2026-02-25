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

    const { data: bots } = await admin
        .from('profiles')
        .select('id,display_name,photos,is_bot')
        .eq('is_bot', true)

    const botIdList = (bots || []).map((b) => b.id)
    if (botIdList.length === 0) {
        return NextResponse.json({ matches: [], profiles: {} })
    }

    const { data: matchRows, error: matchError } = await admin
        .from('matches')
        .select('*')
        .or(`user_a.in.(${botIdList.join(',')}),user_b.in.(${botIdList.join(',')})`)
        .order('created_at', { ascending: false })
    if (matchError) return new NextResponse(matchError.message, { status: 500 })
    const rows = matchRows || []

    const ids = new Set<string>()
    botIdList.forEach((id) => ids.add(id))
    rows.forEach((m: { user_a: string; user_b: string }) => {
        ids.add(m.user_a)
        ids.add(m.user_b)
    })

    const { data: allProfiles } = await admin
        .from('profiles')
        .select('id,display_name,photos,is_bot')
        .in('id', Array.from(ids))

    const map: Record<string, unknown> = {}
    for (const p of allProfiles || []) map[(p as { id: string }).id] = p

    return NextResponse.json({ matches: rows, profiles: map })
}
