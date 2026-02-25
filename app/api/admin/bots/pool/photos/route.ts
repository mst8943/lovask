import { NextResponse } from 'next/server'
import AdmZip from 'adm-zip'
import sharp from 'sharp'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const BUCKET = process.env.BOT_PHOTO_BUCKET || 'bot-photos'
const SIZES = [512, 1024]

function normalizeGender(folder: string) {
    const f = folder.toLowerCase()
    if (['female', 'women', 'woman', 'kadin', 'kadın'].includes(f)) return 'female'
    if (['male', 'men', 'man', 'erkek'].includes(f)) return 'male'
    return null
}

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
            return NextResponse.json({ error: 'Missing zip file' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const zip = new AdmZip(buffer)
        const entries = zip.getEntries()

        let uploaded = 0
        const errors: string[] = []

        for (const entry of entries) {
            if (entry.isDirectory) continue
            const parts = entry.entryName.replace(/\\/g, '/').split('/').filter(Boolean)
            if (parts.length < 2) {
                errors.push(`Skipped (no gender folder): ${entry.entryName}`)
                continue
            }
            const gender = normalizeGender(parts[0])
            if (!gender) {
                errors.push(`Skipped (unknown gender): ${entry.entryName}`)
                continue
            }
            const original = entry.getData()

            for (const size of SIZES) {
                const webp = await sharp(original)
                    .resize(size, size, { fit: 'cover' })
                    .webp({ quality: 82 })
                    .toBuffer()

                const name = `${gender}/${Date.now()}-${Math.random().toString(36).slice(2)}-${size}.webp`
                const { error: uploadError } = await admin.storage
                    .from(BUCKET)
                    .upload(name, webp, {
                        contentType: 'image/webp',
                        upsert: false,
                    })

                if (uploadError) {
                    errors.push(`Upload failed: ${uploadError.message}`)
                    continue
                }

                const { data: publicUrl } = admin.storage.from(BUCKET).getPublicUrl(name)
                await admin.from('bot_photo_pool').insert({
                    gender,
                    size,
                    url: publicUrl.publicUrl,
                })
                uploaded += 1
            }
        }

        return NextResponse.json({ ok: true, uploaded, errors })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

