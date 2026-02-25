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
    const { data, error } = await admin
        .from('app_settings')
        .select('value')
        .eq('key', 'openrouter_fallback')
        .maybeSingle()
    if (error) return new NextResponse(error.message, { status: 500 })
    return NextResponse.json({ value: data?.value || null })
}

export async function POST(req: Request) {
    const admin = await ensureAdmin()
    if (!admin) return new NextResponse('Unauthorized', { status: 401 })
    const body = await req.json()
    const { error } = await admin
        .from('app_settings')
        .upsert({ key: 'openrouter_fallback', value: body }, { onConflict: 'key' })
    if (error) return new NextResponse(error.message, { status: 500 })
    return NextResponse.json({ ok: true })
}
