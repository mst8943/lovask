import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const { data: me } = await admin.from('users').select('role').eq('id', auth.user.id).maybeSingle()
        if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const { data: photos } = await admin
            .from('bot_photo_pool')
            .select('gender,size', { count: 'exact' })

        const { data: bios } = await admin
            .from('bot_bio_pool')
            .select('gender', { count: 'exact' })

        const { data: names } = await admin
            .from('bot_name_pool')
            .select('gender', { count: 'exact' })

        return NextResponse.json({
            photos: photos || [],
            photo_count: photos?.length || 0,
            bios: bios || [],
            bio_count: bios?.length || 0,
            names: names || [],
            name_count: names?.length || 0,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
