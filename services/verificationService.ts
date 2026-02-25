import { createClient } from '@/lib/supabase/client'

export type VerificationType = 'email' | 'device' | 'photo' | 'selfie' | 'kyc' | 'video'
export type VerificationStatus = 'pending' | 'approved' | 'rejected'

export type VerificationRow = {
    id: string
    user_id: string
    type: VerificationType
    status: VerificationStatus
    proof_url?: string | null
    device_info?: Record<string, unknown> | null
    provider?: string | null
    metadata?: Record<string, unknown> | null
    note?: string | null
    created_at: string
    reviewed_at?: string | null
    reviewer_id?: string | null
    user_last_active_at?: string | null
}

export const fetchMyVerifications = async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    if (error) throw error
    return data as VerificationRow[]
}

export const fetchPublicVerifications = async (userId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('get_public_verifications', { p_user_id: userId })
    if (error) throw error
    return (data || []) as Array<{ user_id: string; type: VerificationType }>
}

export const fetchPublicVerificationsBatch = async (userIds: string[]) => {
    if (userIds.length === 0) return []
    const supabase = createClient()
    const { data, error } = await supabase.rpc('get_public_verifications_batch', { p_user_ids: userIds })
    if (error) throw error
    return (data || []) as Array<{ user_id: string; type: VerificationType }>
}

export const createVerification = async (payload: {
    user_id: string
    type: VerificationType
    proof_url?: string | null
    device_info?: Record<string, unknown> | null
    provider?: string | null
    metadata?: Record<string, unknown> | null
}) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('user_verifications')
        .insert({
            user_id: payload.user_id,
            type: payload.type,
            proof_url: payload.proof_url || null,
            device_info: payload.device_info || null,
            provider: payload.provider || null,
            metadata: payload.metadata || null,
        })
        .select('*')
        .single()
    if (error) throw error
    return data as VerificationRow
}

export const fetchVerifications = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('user_verifications')
        .select('*')
        .order('created_at', { ascending: false })
    if (error) throw error
    const rows = (data || []) as VerificationRow[]
    const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)))
    if (ids.length === 0) return rows
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id,last_active_at')
        .in('id', ids)
    if (userError) throw userError
    const map = new Map((users || []).map((u: { id: string; last_active_at: string | null }) => [u.id, u.last_active_at]))
    return rows.map((r) => ({
        ...r,
        user_last_active_at: map.get(r.user_id) || null,
    })) as VerificationRow[]
}

export const updateVerification = async (id: string, status: VerificationStatus, note?: string | null) => {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    const { data, error } = await supabase
        .from('user_verifications')
        .update({
            status,
            note,
            reviewed_at: new Date().toISOString(),
            reviewer_id: auth.user?.id || null,
        })
        .eq('id', id)
        .select('*')
        .single()
    if (error) throw error
    return data as VerificationRow
}
