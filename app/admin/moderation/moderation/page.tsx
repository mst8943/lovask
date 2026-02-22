'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Save } from 'lucide-react'

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

export default function AdminModerationPage() {
    const supabase = useMemo(() => createClient(), [])
    const [rules, setRules] = useState<ModerationRules>(DEFAULT_RULES)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [runResult, setRunResult] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'moderation_rules').maybeSingle()
            if (data?.value) {
                setRules({ ...DEFAULT_RULES, ...(data.value as Partial<ModerationRules>) })
            }
            setLoading(false)
        }
        load()
    }, [supabase])

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        await supabase
            .from('app_settings')
            .upsert({ key: 'moderation_rules', value: rules })
        await supabase
            .from('admin_audit_logs')
            .insert({ action: 'moderation_rules_update', target_table: 'app_settings', metadata: rules })
        setSaving(false)
        setMessage('Kurallar güncellendi.')
    }

    const runNow = async () => {
        setRunResult(null)
        const res = await fetch('/api/admin/moderation/run', { method: 'POST' })
        if (!res.ok) {
            setRunResult('Çalıştırma başarısız.')
            return
        }
        const data = await res.json()
        setRunResult(`Gizlenen: ${data.hidden || 0}, Banlanan: ${data.banned || 0}`)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-sm text-slate-500">Yükleniyor...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Moderasyon Kuralları</h1>
                    <p className="text-sm text-slate-500">Otomatik aksiyon eÅikleri</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center gap-2">
                    <Shield size={12} />
                    Güvenlik
                </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl space-y-4">
                <label className="flex items-center justify-between text-sm">
                    <span>Uygunsuz fotoğrafı otomatik gizle</span>
                    <input
                        type="checkbox"
                        checked={rules.auto_hide_photos}
                        onChange={(e) => setRules((prev) => ({ ...prev, auto_hide_photos: e.target.checked }))}
                    />
                </label>
                <label className="flex items-center justify-between text-sm">
                    <span>Spam tespiti ile otomatik sustur</span>
                    <input
                        type="checkbox"
                        checked={rules.auto_mute_spam}
                        onChange={(e) => setRules((prev) => ({ ...prev, auto_mute_spam: e.target.checked }))}
                    />
                </label>
                <label className="text-sm flex items-center justify-between gap-4">
                    <span>Profil gizleme rapor eşiği</span>
                    <input
                        type="number"
                        min={1}
                        value={rules.max_reports_before_hide}
                        onChange={(e) => setRules((prev) => ({ ...prev, max_reports_before_hide: Number(e.target.value) }))}
                        className="w-24 px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    />
                </label>
                <label className="text-sm flex items-center justify-between gap-4">
                    <span>Ban rapor eşiği</span>
                    <input
                        type="number"
                        min={1}
                        value={rules.max_reports_before_ban}
                        onChange={(e) => setRules((prev) => ({ ...prev, max_reports_before_ban: Number(e.target.value) }))}
                        className="w-24 px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    />
                </label>
                <label className="text-sm flex items-center justify-between gap-4">
                    <span>AI güven eşiği</span>
                    <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        value={rules.ai_confidence_threshold}
                        onChange={(e) => setRules((prev) => ({ ...prev, ai_confidence_threshold: Number(e.target.value) }))}
                        className="w-24 px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    />
                </label>
                {message && <div className="text-xs text-emerald-700">{message}</div>}
                {runResult && <div className="text-xs text-cyan-300">{runResult}</div>}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-white flex items-center justify-center gap-2"
                >
                    <Save size={16} />
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                    onClick={runNow}
                    className="w-full py-3 rounded-xl bg-white text-white"
                >
                    Moderasyon kurallarını şimdi uygula
                </button>
            </div>
        </div>
    )
}
