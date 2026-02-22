import type { SupabaseClient } from '@supabase/supabase-js'

type ModerationRules = {
    auto_hide_photos: boolean
    auto_mute_spam: boolean
    max_reports_before_hide: number
    max_reports_before_ban: number
    ai_confidence_threshold: number
}

const DEFAULT_RULES: ModerationRules = {
    auto_hide_photos: true,
    auto_mute_spam: true,
    max_reports_before_hide: 3,
    max_reports_before_ban: 7,
    ai_confidence_threshold: 0.7,
}

export type ModerationRunResult = {
    hidden: number
    banned: number
    totalReports: number
    rules: ModerationRules
}

export const runModerationRules = async (admin: SupabaseClient): Promise<ModerationRunResult> => {
    const { data: settings } = await admin
        .from('app_settings')
        .select('value')
        .eq('key', 'moderation_rules')
        .maybeSingle()

    const rules = { ...DEFAULT_RULES, ...(settings?.value as Partial<ModerationRules> || {}) }

    const { data: reports } = await admin
        .from('reports')
        .select('reported_id,status')
        .eq('status', 'pending')

    const counts = new Map<string, number>()
    for (const r of (reports || []) as Array<{ reported_id: string }>) {
        counts.set(r.reported_id, (counts.get(r.reported_id) || 0) + 1)
    }

    const toHide: string[] = []
    const toBan: string[] = []
    for (const [userId, count] of counts.entries()) {
        if (count >= rules.max_reports_before_ban) {
            toBan.push(userId)
        } else if (count >= rules.max_reports_before_hide) {
            toHide.push(userId)
        }
    }

    if (toHide.length > 0) {
        await admin.from('profiles').update({ hide_from_discovery: true }).in('id', toHide)
        await admin.from('admin_audit_logs').insert(toHide.map((id) => ({
            action: 'auto_hide_profile',
            target_table: 'profiles',
            target_id: id,
            metadata: { reason: 'reports_threshold' },
        })))
    }

    if (toBan.length > 0) {
        await admin.from('users').update({
            is_banned: true,
            ban_reason: 'Auto ban: reports threshold',
            ban_expires_at: null,
        }).in('id', toBan)
        await admin.from('admin_audit_logs').insert(toBan.map((id) => ({
            action: 'auto_ban_user',
            target_table: 'users',
            target_id: id,
            metadata: { reason: 'reports_threshold' },
        })))
        await admin.from('notifications').insert(toBan.map((id) => ({
            user_id: id,
            type: 'ban',
            payload: { title: 'Hesap kısıtlandı', body: 'Rapor eşiği aşıldı, hesap kısıtlandı.' },
        })))
    }

    return { hidden: toHide.length, banned: toBan.length, totalReports: (reports || []).length, rules }
}
