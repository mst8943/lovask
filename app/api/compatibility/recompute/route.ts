import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const { data, error } = await supabase.rpc('compute_compatibility_scores', {
            p_user_id: auth.user.id,
            p_limit: 200,
        })
        if (error) throw error

        return NextResponse.json({ updated: data ?? 0 })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
