'use client'

import { useT } from '@/hooks/useT'
import LanguageSelect from '@/components/i18n/LanguageSelect'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_FEATURES, FEATURE_ITEMS, FeatureConfig } from '@/lib/featureFlags'

export default function AdminSettingsPage() {
    const t = useT()
    const supabase = createClient()
    const [features, setFeatures] = useState<FeatureConfig>(DEFAULT_FEATURES)
    const [rollouts, setRollouts] = useState<{ premium: Record<string, number>; standard: Record<string, number> }>({ premium: {}, standard: {} })
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [paymentSettings, setPaymentSettings] = useState({
        provider: 'bank_transfer',
        card_enabled: false,
        bank_name: '',
        account_name: '',
        iban: '',
        account_no: '',
    })
    const [slaSettings, setSlaSettings] = useState<Record<string, number>>({})

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            setError(null)
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'feature_flags')
                .maybeSingle()
            if (error) {
                setError(error.message)
                setLoading(false)
                return
            }
            if (data?.value) {
                setFeatures({
                    premium: { ...DEFAULT_FEATURES.premium, ...(data.value.premium || {}) },
                    standard: { ...DEFAULT_FEATURES.standard, ...(data.value.standard || {}) },
                })
            }
            const { data: rollout } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'feature_rollout')
                .maybeSingle()
            if (rollout?.value) {
                setRollouts({
                    premium: rollout.value.premium || {},
                    standard: rollout.value.standard || {},
                })
            }
            const { data: payment } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'payment_settings')
                .maybeSingle()
            if (payment?.value) {
                setPaymentSettings({
                    provider: payment.value.provider || 'bank_transfer',
                    card_enabled: !!payment.value.card_enabled,
                    bank_name: payment.value.bank_name || '',
                    account_name: payment.value.account_name || '',
                    iban: payment.value.iban || '',
                    account_no: payment.value.account_no || '',
                })
            }
            const { data: sla } = await supabase.from('admin_sla_settings').select('queue,sla_hours')
            if (sla) {
                setSlaSettings(Object.fromEntries(sla.map((row: { queue: string; sla_hours: number }) => [row.queue, row.sla_hours])))
            }
            setLoading(false)
        }
        load()
    }, [supabase])

    const toggle = (tier: 'premium' | 'standard', key: string) => {
        setFeatures((prev) => ({
            ...prev,
            [tier]: { ...prev[tier], [key]: !prev[tier][key] },
        }))
    }

    const save = async () => {
        setSaving(true)
        setError(null)
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'feature_flags', value: features }, { onConflict: 'key' })
        if (error) setError(error.message)
        const { error: rolloutError } = await supabase
            .from('app_settings')
            .upsert({ key: 'feature_rollout', value: rollouts }, { onConflict: 'key' })
        if (rolloutError) setError(rolloutError.message)
        const { error: paymentError } = await supabase
            .from('app_settings')
            .upsert({ key: 'payment_settings', value: paymentSettings }, { onConflict: 'key' })
        if (paymentError) setError(paymentError.message)
        await Promise.all(
            Object.entries(slaSettings).map(([queue, sla_hours]) =>
                supabase.from('admin_sla_settings').upsert({ queue, sla_hours }, { onConflict: 'queue' })
            )
        )
        setSaving(false)
    }

    const rows = useMemo(() => FEATURE_ITEMS, [])

    return (
        <div className="admin-page space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t('admin.settings.title')}</h1>
                    <p className="text-sm text-slate-700">Genel admin ayarlari</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                    Ayarlar
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">{t('admin.settings.language')}</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{t('admin.settings.desc')}</div>
                </div>
                <div className="md:min-w-[220px]">
                    <LanguageSelect label={t('common.language')} />
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Paket Ozellikleri</div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Her ozelligi standart veya premium icin ac/kapat</div>
                    </div>
                    <button
                        onClick={save}
                        disabled={saving || loading}
                        className="px-6 py-2.5 rounded-xl font-bold admin-primary-btn shadow-sm hover:translate-y-[-1px] transition-all"
                    >
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-900 bg-red-100 border border-red-200 rounded-lg">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-sm text-slate-700">Yukleniyor...</div>
                ) : (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                        <div className="grid grid-cols-[1fr_120px_120px_120px_120px] gap-0 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                            <div className="px-4 py-3">Ozellik</div>
                            <div className="px-4 py-3 text-center">Standart</div>
                            <div className="px-4 py-3 text-center">Standart %</div>
                            <div className="px-4 py-3 text-center">Premium</div>
                            <div className="px-4 py-3 text-center">Premium %</div>
                        </div>
                        <div className="divide-y divide-slate-200">
                            {rows.map((item) => (
                                <div key={item.key} className="grid grid-cols-[1fr_120px_120px_120px_120px] gap-0 text-sm">
                                    <div className="px-4 py-3">{item.label}</div>
                                    <div className="px-4 py-3 flex justify-center">
                                        <input
                                            type="checkbox"
                                            checked={!!features.standard[item.key]}
                                            onChange={() => toggle('standard', item.key)}
                                            className="w-5 h-5 rounded border-slate-300 text-pink-500 focus:ring-pink-500 cursor-pointer"
                                        />
                                    </div>
                                    <div className="px-4 py-3 flex justify-center">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={rollouts.standard[item.key] ?? 100}
                                            onChange={(e) => setRollouts((prev) => ({
                                                ...prev,
                                                standard: { ...prev.standard, [item.key]: Number(e.target.value) },
                                            }))}
                                            className="w-20 px-2 py-1 rounded-lg glass-input bg-white border border-slate-200 text-xs"
                                        />
                                    </div>
                                    <div className="px-4 py-3 flex justify-center">
                                        <input
                                            type="checkbox"
                                            checked={!!features.premium[item.key]}
                                            onChange={() => toggle('premium', item.key)}
                                            className="w-5 h-5 rounded border-slate-300 text-pink-500 focus:ring-pink-500 cursor-pointer"
                                        />
                                    </div>
                                    <div className="px-4 py-3 flex justify-center">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={rollouts.premium[item.key] ?? 100}
                                            onChange={(e) => setRollouts((prev) => ({
                                                ...prev,
                                                premium: { ...prev.premium, [item.key]: Number(e.target.value) },
                                            }))}
                                            className="w-20 px-2 py-1 rounded-lg glass-input bg-white border border-slate-200 text-xs"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">SLA Ayarlari</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kuyruk bazli SLA saatleri</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {['support', 'reports', 'verifications', 'payments'].map((key) => (
                        <div key={key} className="glass-panel p-3 rounded-xl border border-slate-200 space-y-2">
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{key}</div>
                            <input
                                type="number"
                                min={1}
                                value={slaSettings[key] ?? 6}
                                onChange={(e) => setSlaSettings((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                                className="glass-input w-full px-4 py-2.5 text-sm"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Odeme Ayarlari</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Hangi odeme yontemleri aktif olacak</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Saglayici</div>
                        <select
                            value={paymentSettings.provider}
                            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, provider: e.target.value }))}
                            className="glass-input w-full px-4 py-2.5 text-sm"
                        >
                            <option value="bank_transfer">Havale</option>
                            <option value="stripe">Stripe</option>
                            <option value="iyzico">Iyzico</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kart odemesi</div>
                        <label className="flex items-center gap-2 text-xs px-3 py-2 rounded-full border border-slate-200 bg-white w-fit">
                            <input
                                type="checkbox"
                                checked={paymentSettings.card_enabled}
                                onChange={(e) => setPaymentSettings((prev) => ({ ...prev, card_enabled: e.target.checked }))}
                                className="w-5 h-5 rounded border-slate-300 text-pink-500 focus:ring-pink-500 cursor-pointer"
                            />
                            Aktif
                        </label>
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Durum</div>
                        <div className={`text-xs px-3 py-2 rounded-full border ${paymentSettings.card_enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {paymentSettings.card_enabled ? 'Kart odemesi acik' : 'Kart odemesi kapali'}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Banka Adi</div>
                        <input
                            value={paymentSettings.bank_name}
                            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, bank_name: e.target.value }))}
                            className="glass-input w-full px-4 py-2.5 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Hesap Adi</div>
                        <input
                            value={paymentSettings.account_name}
                            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, account_name: e.target.value }))}
                            className="glass-input w-full px-4 py-2.5 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">IBAN</div>
                        <input
                            value={paymentSettings.iban}
                            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, iban: e.target.value }))}
                            className="glass-input w-full px-4 py-2.5 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Hesap No</div>
                        <input
                            value={paymentSettings.account_no}
                            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, account_no: e.target.value }))}
                            className="glass-input w-full px-4 py-2.5 text-sm"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
