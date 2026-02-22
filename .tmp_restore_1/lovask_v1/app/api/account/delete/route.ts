import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.getUser()
        if (error || !data.user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const admin = createAdminClient()
        const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
        if (deleteError) {
            return new NextResponse(deleteError.message, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
