'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
    const admin = createAdminClient()
    const { data: auth } = await admin.auth.getUser()
    if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
    const ua = req.headers.get('user-agent') || ''
    const { path } = await req.json().catch(() => ({ path: null }))

    await admin.from('admin_access_logs').insert({
        admin_id: auth.user.id,
        ip,
        user_agent: ua,
        path: path || null,
    })

    return NextResponse.json({ ok: true })
}
