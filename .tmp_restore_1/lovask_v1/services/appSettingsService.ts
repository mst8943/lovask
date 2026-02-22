import { createClient } from '@/lib/supabase/client'
import { DEFAULT_FEATURES, FeatureConfig } from '@/lib/featureFlags'

export const fetchFeatureFlags = async (): Promise<FeatureConfig> => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'feature_flags')
        .maybeSingle()

    if (error) {
        return DEFAULT_FEATURES
    }

    if (!data?.value) return DEFAULT_FEATURES

    return {
        premium: { ...DEFAULT_FEATURES.premium, ...(data.value.premium || {}) },
        standard: { ...DEFAULT_FEATURES.standard, ...(data.value.standard || {}) },
    }
}

export type PaymentSettings = {
    provider: 'bank_transfer' | 'stripe' | 'iyzico'
    card_enabled: boolean
    bank_name?: string
    account_name?: string
    iban?: string
    account_no?: string
}

export const fetchPaymentSettings = async (): Promise<PaymentSettings> => {
    const supabase = createClient()
    const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'payment_settings')
        .maybeSingle()

    if (!data?.value) {
        return { provider: 'bank_transfer', card_enabled: false }
    }

    return {
        provider: data.value.provider || 'bank_transfer',
        card_enabled: !!data.value.card_enabled,
        bank_name: data.value.bank_name || '',
        account_name: data.value.account_name || '',
        iban: data.value.iban || '',
        account_no: data.value.account_no || '',
    }
}

export type ProfileVariantApprovalState = {
    approvedIds: Set<string>
    hasConfig: boolean
}

export const fetchProfileVariantApprovals = async (): Promise<ProfileVariantApprovalState> => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'profile_variant_approvals')
        .maybeSingle()

    if (error || !data?.value) {
        return { approvedIds: new Set(), hasConfig: false }
    }

    const approved = Array.isArray(data.value.approved_ids) ? data.value.approved_ids : []
    return { approvedIds: new Set(approved), hasConfig: true }
}

export const saveProfileVariantApprovals = async (approvedIds: string[]) => {
    const supabase = createClient()
    const { error } = await supabase
        .from('app_settings')
        .upsert(
            { key: 'profile_variant_approvals', value: { approved_ids: approvedIds } },
            { onConflict: 'key' }
        )
    if (error) throw error
}

export const fetchProfileVariantsEnabled = async (): Promise<boolean> => {
    const supabase = createClient()
    const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'profile_variants_enabled')
        .maybeSingle()
    if (!data?.value) return true
    return data.value.enabled !== false
}

export const saveProfileVariantsEnabled = async (enabled: boolean) => {
    const supabase = createClient()
    const { error } = await supabase
        .from('app_settings')
        .upsert(
            { key: 'profile_variants_enabled', value: { enabled } },
            { onConflict: 'key' }
        )
    if (error) throw error
}
