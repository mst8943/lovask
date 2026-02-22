import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const FEMALE_NAMES_FALLBACK = [
    'Ayla', 'Elif', 'Zeynep', 'Irem', 'Merve', 'Deniz', 'Ece', 'Sude', 'Yasemin', 'Derya',
    'Ceren', 'Busra', 'Selin', 'Melis', 'Esra', 'Asli', 'Gizem', 'Gamze', 'Eda', 'Beyza',
]

const MALE_NAMES_FALLBACK = [
    'Emre', 'Ahmet', 'Mehmet', 'Mert', 'Can', 'Deniz', 'Burak', 'Eren', 'Ali', 'Kerem',
    'Oguz', 'Kaan', 'Hakan', 'Serkan', 'Umut', 'Onur', 'Tolga', 'Berk', 'Tuna', 'Arda',
]

const normalizeGender = (gender: string) => {
    const g = (gender || '').toLowerCase()
    if (g.startsWith('f')) return 'female'
    if (g.startsWith('m')) return 'male'
    return g
}

const pickRandom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

const randomInt = (min: number, max: number) => {
    const low = Math.min(min, max)
    const high = Math.max(min, max)
    return Math.floor(Math.random() * (high - low + 1)) + low
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const admin = createAdminClient()
        const { data: me } = await admin.from('users').select('role').eq('id', auth.user.id).maybeSingle()
        if (me?.role !== 'admin') return new NextResponse('Forbidden', { status: 403 })

        const body = await req.json()
        const count = Math.max(0, Number(body.count || 0))
        if (!count || count < 1) return new NextResponse('Count must be at least 1', { status: 400 })
        if (count > 500) return new NextResponse('Count too large (max 500)', { status: 400 })

        const femalePercent = Math.min(100, Math.max(0, Number(body.female_percent ?? body.femalePercent ?? 50)))
        const ageMin = Number(body.age_min ?? body.ageMin ?? 18)
        const ageMax = Number(body.age_max ?? body.ageMax ?? 40)

        const cityMode = body.city_mode === 'fixed' ? 'fixed' : 'random'
        const cities = Array.isArray(body.cities)
            ? body.cities.map((c: unknown) => String(c ?? '').trim()).filter(Boolean)
            : []
        const fixedCity = String(body.fixed_city || body.fixedCity || cities[0] || 'Istanbul').trim()

        const usePhotoPool = !!body.use_photo_pool
        const useBioPool = !!body.use_bio_pool
        const groupId = body.group_id || null
        const activeHours = Array.isArray(body.active_hours) ? body.active_hours : null

        if (cityMode === 'random' && cities.length === 0) {
            return new NextResponse('City list is required for random mode', { status: 400 })
        }

        const genders = Array.from({ length: count }).map(() =>
            Math.random() * 100 < femalePercent ? 'Female' : 'Male'
        )

        let photoPool: Array<{ id: string; gender: string | null; size: number | null; url: string }> = []
        let bioPool: Array<{ id: string; gender: string | null; bio: string }> = []
        let namePool: Array<{ gender: string | null; name: string }> = []

        if (usePhotoPool) {
            const { data: photos } = await admin
                .from('bot_photo_pool')
                .select('id,gender,size,url')
            photoPool = photos || []
        }

        if (useBioPool) {
            const { data: bios } = await admin
                .from('bot_bio_pool')
                .select('id,gender,bio')
            bioPool = bios || []
        }

        const { data: names } = await admin
            .from('bot_name_pool')
            .select('gender,name')
        namePool = names || []

        const femaleNames = namePool
            .filter((n) => normalizeGender(n.gender) === 'female')
            .map((n) => n.name)
        const maleNames = namePool
            .filter((n) => normalizeGender(n.gender) === 'male')
            .map((n) => n.name)

        const photosByGender = {
            female: photoPool.filter((p) => normalizeGender(p.gender) === 'female' && p.size === 1024),
            male: photoPool.filter((p) => normalizeGender(p.gender) === 'male' && p.size === 1024),
        }

        const biosByGender = {
            female: bioPool.filter((b) => !b.gender || normalizeGender(b.gender) === 'female'),
            male: bioPool.filter((b) => !b.gender || normalizeGender(b.gender) === 'male'),
        }

        if (usePhotoPool) {
            const neededFemale = genders.filter((g) => g === 'Female').length
            const neededMale = genders.filter((g) => g === 'Male').length
            if (photosByGender.female.length < neededFemale) {
                return new NextResponse('Female photo pool insufficient', { status: 400 })
            }
            if (photosByGender.male.length < neededMale) {
                return new NextResponse('Male photo pool insufficient', { status: 400 })
            }
        }

        if (useBioPool) {
            const used = new Set<string>()
            for (const g of genders) {
                const key = g === 'Female' ? 'female' : 'male'
                const candidate = biosByGender[key].find((b) => !used.has(b.id))
                if (!candidate) {
                    return new NextResponse(`${key} bio pool insufficient`, { status: 400 })
                }
                used.add(candidate.id)
            }
        }

        const usedPhotoIds: string[] = []
        const usedBioIds: string[] = []
        const nameCounts = new Map<string, number>()
        const results: Array<{ id?: string; error?: string }> = []

        for (let i = 0; i < genders.length; i += 1) {
            const gender = genders[i]
            const genderKey = gender === 'Female' ? 'female' : 'male'
            const poolNames = genderKey === 'female' ? femaleNames : maleNames
            const baseName = pickRandom(poolNames.length > 0
                ? poolNames
                : (genderKey === 'female' ? FEMALE_NAMES_FALLBACK : MALE_NAMES_FALLBACK)
            )
            const currentCount = nameCounts.get(baseName) || 0
            nameCounts.set(baseName, currentCount + 1)
            const displayName = currentCount > 0 ? `${baseName} ${currentCount + 1}` : baseName

            const age = randomInt(ageMin, ageMax)
            const city = cityMode === 'random' ? pickRandom(cities) : fixedCity

            const photos: string[] = []
            if (usePhotoPool) {
                const pool = photosByGender[genderKey]
                const picked = pool.shift()
                if (!picked) {
                    results.push({ error: 'photo pool empty' })
                    continue
                }
                photos.push(picked.url)
                usedPhotoIds.push(picked.id)
            }

            let bio: string | null = null
            if (useBioPool) {
                const pool = biosByGender[genderKey]
                const pickedIndex = pool.findIndex((b) => !usedBioIds.includes(b.id))
                if (pickedIndex === -1) {
                    results.push({ error: 'bio pool empty' })
                    continue
                }
                const picked = pool.splice(pickedIndex, 1)[0]
                bio = picked.bio
                usedBioIds.push(picked.id)
            }

            const email = `bot+${crypto.randomUUID()}@lovask.ai`
            const password = crypto.randomUUID()
            const { data: created, error: createError } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            })
            if (createError || !created.user) {
                results.push({ error: createError?.message || 'create failed' })
                continue
            }

            const userId = created.user.id
            await admin.from('users').update({ role: 'bot' }).eq('id', userId)

            await admin.from('profiles').insert({
                id: userId,
                display_name: displayName,
                age,
                gender,
                city,
                bio,
                photos,
                is_bot: true,
            })

            await admin.from('bot_configs').insert({
                user_id: userId,
                personality_prompt: '',
                behavior_settings: {
                    active: true,
                    group_id: groupId,
                },
                active_hours: activeHours,
                use_global: true,
            })

            results.push({ id: userId })
        }

        if (usedPhotoIds.length > 0) {
            await admin.from('bot_photo_pool').delete().in('id', usedPhotoIds)
        }
        if (usedBioIds.length > 0) {
            await admin.from('bot_bio_pool').delete().in('id', usedBioIds)
        }

        return NextResponse.json({ success: true, results })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
