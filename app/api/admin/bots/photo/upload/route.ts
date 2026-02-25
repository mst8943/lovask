import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const BUCKET = process.env.BOT_PHOTO_BUCKET || 'bot-photos'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const { data: me } = await admin.from('users').select('role').eq('id', auth.user.id).maybeSingle()
        if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const form = await req.formData()
        const file = form.get('file')
        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Missing file' }, { status: 400 })
        }

        const input = Buffer.from(await file.arrayBuffer())
        const webp = await sharp(input)
            .resize(1024, 1024, { fit: 'cover' })
            .webp({ quality: 82 })
            .toBuffer()

        const name = `manual/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`
        const { error: uploadError } = await admin.storage
            .from(BUCKET)
            .upload(name, webp, {
                contentType: 'image/webp',
                upsert: false,
            })
        if (uploadError) {
            return NextResponse.json({ error: uploadError.message }, { status: 400 })
        }

        const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(name)
        return NextResponse.json({ url: publicUrl.publicUrl })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
