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
    const { data, error } = await admin
        .from('user_verifications')
        .select('*')
        .order('created_at', { ascending: false })
    if (error) return new NextResponse(error.message, { status: 500 })

    const proofLinks: Record<string, string> = {}
    await Promise.all((data || []).map(async (row: { id: string; proof_url?: string | null }) => {
        const proofUrl = row.proof_url
        if (!proofUrl) return
        if (/^https?:\/\//i.test(proofUrl)) {
            proofLinks[row.id] = proofUrl
            return
        }
        const { data: signed } = await admin
            .storage
            .from('verification')
            .createSignedUrl(proofUrl, 3600)
        if (signed?.signedUrl) {
            proofLinks[row.id] = signed.signedUrl
        }
    }))

    return NextResponse.json({ rows: data || [], proofLinks })
}
