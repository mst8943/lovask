import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const pick = (obj: Record<string, unknown>, keys: string[]) => {
    const out: Record<string, unknown> = {}
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
            out[key] = obj[key]
        }
    }
    return out
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
        const allowed = [
            'display_name',
            'age',
            'gender',
            'bio',
            'city',
            'looking_for_genders',
            'photos',
            'interests',
            'relationship_type',
            'education',
            'smoking',
            'alcohol',
            'kids_status',
            'height_cm',
            'religion',
            'lifestyle',
            'intent',
            'relationship_goal',
            'work_title',
            'languages',
            'dealbreakers',
            'values',
            'family_plans',
            'pets',
            'fitness',
        ]

        const payload = pick(body, allowed)
        payload.id = auth.user.id

        const { error } = await supabase
            .from('profiles')
            .upsert(payload)

        if (error) return new NextResponse(error.message, { status: 400 })

        return NextResponse.json({ ok: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
