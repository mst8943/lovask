'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Verify if the caller is an admin
async function checkAdmin() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return false

    const admin = createAdminClient()
    const { data: userData } = await admin.from('users').select('role').eq('id', data.user.id).single()
    return userData?.role === 'admin'
}

export async function adminToggleVerify(id: string, value: boolean) {
    if (!(await checkAdmin())) return { error: 'Unauthorized' }
    const admin = createAdminClient()
    const { error } = await admin.from('profiles').update({ is_verified: value }).eq('id', id)
    if (error) return { error: error.message }
    return { success: true }
}

export async function adminApplyCoins(targets: string[], amount: number) {
    if (!(await checkAdmin())) return { error: 'Unauthorized' }
    const admin = createAdminClient()
    for (const id of targets) {
        const { data } = await admin.from('users').select('coin_balance').eq('id', id).maybeSingle()
        const current = Number(data?.coin_balance || 0)
        await admin.from('users').update({ coin_balance: current + amount }).eq('id', id)
    }
    return { success: true }
}

export async function adminApplyPremiumDays(targets: string[], days: number) {
    if (!(await checkAdmin())) return { error: 'Unauthorized' }
    const admin = createAdminClient()
    const now = Date.now()
    for (const id of targets) {
        const { data } = await admin.from('users').select('premium_expires_at').eq('id', id).maybeSingle()
        const existing = data?.premium_expires_at
        const base = existing ? new Date(existing).getTime() : now
        const next = new Date(base + days * 24 * 60 * 60 * 1000).toISOString()
        await admin.from('users').update({ is_premium: true, premium_expires_at: next }).eq('id', id)
    }
    return { success: true }
}

export async function adminApplyBan(targets: string[], days: number, reason: string) {
    if (!(await checkAdmin())) return { error: 'Unauthorized' }
    const admin = createAdminClient()
    const now = Date.now()
    const expiresAt = days > 0 ? new Date(now + days * 24 * 60 * 60 * 1000).toISOString() : null
    for (const id of targets) {
        await admin.from('users').update({ is_banned: true, ban_reason: reason, ban_expires_at: expiresAt }).eq('id', id)
    }
    return { success: true }
}

export async function adminLiftBan(targets: string[]) {
    if (!(await checkAdmin())) return { error: 'Unauthorized' }
    const admin = createAdminClient()
    for (const id of targets) {
        await admin.from('users').update({ is_banned: false, ban_reason: null, ban_expires_at: null }).eq('id', id)
    }
    return { success: true }
}

export async function adminApplyRole(targets: string[], role: 'user' | 'admin' | 'bot') {
    if (!(await checkAdmin())) return { error: 'Unauthorized' }
    const admin = createAdminClient()
    for (const id of targets) {
        await admin.from('users').update({ role }).eq('id', id)
    }
    return { success: true }
}

type AdminUserForm = {
    id: string
    display_name?: string | null
    is_verified?: boolean | null
    role?: 'user' | 'admin' | 'bot' | string | null
    coin_balance?: number | string | null
    is_premium?: boolean | null
    premium_expires_at?: string | null
}

export async function adminHandleSave(form: AdminUserForm) {
    if (!(await checkAdmin())) return { error: 'Unauthorized' }
    const admin = createAdminClient()

    await admin.from('profiles').update({
        display_name: form.display_name,
        is_verified: form.is_verified,
    }).eq('id', form.id)

    await admin.from('users').update({
        role: form.role,
        coin_balance: Number(form.coin_balance || 0),
        is_premium: form.is_premium,
        premium_expires_at: form.is_premium ? form.premium_expires_at : null,
    }).eq('id', form.id)

    return { success: true }
}
