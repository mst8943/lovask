'use client'

import { useT } from '@/hooks/useT'
import LanguageSelect from '@/components/i18n/LanguageSelect'
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_FEATURES, FEATURE_ITEMS, FeatureConfig } from '@/lib/featureFlags'

export default function AdminSettingsPage() {
    const t = useT()
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
    const [openrouterSettings, setOpenrouterSettings] = useState({
        api_key: '',
        model: '',
        base_url: '',
    })
    const [slaSettings, setSlaSettings] = useState<Record<string, number>>({})

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/admin/settings')
            if (!res.ok) {
                setError(await res.text())
                setLoading(false)
                return
            }
            const payload = await res.json()
            if (payload?.feature_flags) {
                setFeatures({
                    premium: { ...DEFAULT_FEATURES.premium, ...(payload.feature_flags.premium || {}) },
                    standard: { ...DEFAULT_FEATURES.standard, ...(payload.feature_flags.standard || {}) },
                })
            }
            if (payload?.feature_rollout) {
                setRollouts({
                    premium: payload.feature_rollout.premium || {},
                    standard: payload.feature_rollout.standard || {},
                })
            }
            if (payload?.payment_settings) {
                setPaymentSettings({
                    provider: payload.payment_settings.provider || 'bank_transfer',
                    card_enabled: !!payload.payment_settings.card_enabled,
                    bank_name: payload.payment_settings.bank_name || '',
                    account_name: payload.payment_settings.account_name || '',
                    iban: payload.payment_settings.iban || '',
                    account_no: payload.payment_settings.account_no || '',
                })
            }
            if (payload?.openrouter_settings) {
                setOpenrouterSettings({
                    api_key: payload.openrouter_settings.api_key || '',
                    model: payload.openrouter_settings.model || '',
                    base_url: payload.openrouter_settings.base_url || '',
                })
            }
            if (payload?.sla_settings) {
                setSlaSettings(Object.fromEntries(payload.sla_settings.map((row: { queue: string; sla_hours: number }) => [row.queue, row.sla_hours])))
            }
            setLoading(false)
        }
        load()
    }, [])

    const toggle = (tier: 'premium' | 'standard', key: string) => {
        setFeatures((prev) => ({
            ...prev,
            [tier]: { ...prev[tier], [key]: !prev[tier][key] },
        }))
    }

    const save = async () => {
        setSaving(true)
        setError(null)
        const res = await fetch('/api/admin/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                feature_flags: features,
                feature_rollout: rollouts,
                payment_settings: paymentSettings,
                openrouter_settings: openrouterSettings,
                sla_settings: Object.entries(slaSettings).map(([queue, sla_hours]) => ({ queue, sla_hours })),
            }),
        })
        if (!res.ok) setError(await res.text())
        setSaving(false)
    }

    const rows = useMemo(() => FEATURE_ITEMS, [])

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t('admin.settings.title')}</h1>
                    <p className="text-sm text-slate-500">Genel admin ayarlari</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                    Ayarlar
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl space-y-3 border border-slate-200">
                <div>
                    <div className="text-sm font-semibold">{t('admin.settings.language')}</div>
                    <div className="text-xs text-slate-500">{t('admin.settings.desc')}</div>
                </div>
                <LanguageSelect label={t('common.language')} />
            </div>

            <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-200">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold">Paket Ozellikleri</div>
                        <div className="text-xs text-slate-500">Her ozelligi standart veya premium icin ac/kapat</div>
                    </div>
                    <button
                        onClick={save}
                        disabled={saving || loading}
                        className="px-4 py-2 rounded-lg bg-white text-sm"
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
                    <div className="text-sm text-slate-500">Yukleniyor...</div>
                ) : (
                    <div className="glass-panel rounded-2xl overflow-hidden">
                        <div className="grid grid-cols-[1fr_120px_120px_120px_120px] gap-0 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-white">
                            <div className="px-4 py-3">Ozellik</div>
                            <div className="px-4 py-3 text-center">Standart</div>
                            <div className="px-4 py-3 text-center">Standart %</div>
                            <div className="px-4 py-3 text-center">Premium</div>
                            <div className="px-4 py-3 text-center">Premium %</div>
                        </div>
                        <div className="divide-y divide-white/5">
                            {rows.map((item) => (
                                <div key={item.key} className="grid grid-cols-[1fr_120px_120px_120px_120px] gap-0 text-sm">
                                    <div className="px-4 py-3">{item.label}</div>
                                    <div className="px-4 py-3 flex justify-center">
                                        <input
                                            type="checkbox"
                                            checked={!!features.standard[item.key]}
                                            onChange={() => toggle('standard', item.key)}
                                            className="w-5 h-5 accent-pink-500"
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
                                            className="w-20 px-2 py-1 rounded-lg bg-black/20 border border-slate-200 text-xs"
                                        />
                                    </div>
                                    <div className="px-4 py-3 flex justify-center">
                                        <input
                                            type="checkbox"
                                            checked={!!features.premium[item.key]}
                                            onChange={() => toggle('premium', item.key)}
                                            className="w-5 h-5 accent-pink-500"
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
                                            className="w-20 px-2 py-1 rounded-lg bg-black/20 border border-slate-200 text-xs"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-200">
                <div>
                    <div className="text-sm font-semibold">SLA Ayarlari</div>
                    <div className="text-xs text-slate-500">Kuyruk bazli SLA saatleri</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {['support', 'reports', 'verifications', 'payments'].map((key) => (
                        <div key={key} className="space-y-1">
                            <div className="text-sm text-slate-600">{key}</div>
                            <input
                                type="number"
                                min={1}
                                value={slaSettings[key] ?? 6}
                                onChange={(e) => setSlaSettings((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                                className="bg-white border border-slate-200 rounded-lg px-3 py-2"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-200">
                <div>
                    <div className="text-sm font-semibold">Odeme Ayarlari</div>
                    <div className="text-xs text-slate-500">Hangi odeme yontemleri aktif olacak</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Saglayici</div>
                        <select
                            value={paymentSettings.provider}
                            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, provider: e.target.value }))}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2"
                        >
                            <option value="bank_transfer">Havale</option>
                            <option value="stripe">Stripe</option>
                            <option value="iyzico">Iyzico</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Kart odemesi</div>
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                checked={paymentSettings.card_enabled}
                                onChange={(e) => setPaymentSettings((prev) => ({ ...prev, card_enabled: e.target.checked }))}
                            />
                            Aktif
                        </label>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Durum</div>
                        <div className="text-xs text-slate-500">
                            {paymentSettings.card_enabled ? 'Kart odemesi acik' : 'Kart odemesi kapali'}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Banka Adi</div>
                        <input
                            value={paymentSettings.bank_name}
                            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, bank_name: e.target.value }))}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Hesap Adi</div>
                        <input
                            value={paymentSettings.account_name}
                            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, account_name: e.target.value }))}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">IBAN</div>
                        <input
                            value={paymentSettings.iban}
                            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, iban: e.target.value }))}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Hesap No</div>
                        <input
                            value={paymentSettings.account_no}
                            onChange={(e) => setPaymentSettings((prev) => ({ ...prev, account_no: e.target.value }))}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2"
                        />
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-200">
                <div>
                    <div className="text-sm font-semibold">AI Ayarlari (OpenRouter)</div>
                    <div className="text-xs text-slate-500">Bot cevaplari icin API bilgileri</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">API Anahtari</div>
                        <input
                            type="password"
                            value={openrouterSettings.api_key}
                            onChange={(e) => setOpenrouterSettings((prev) => ({ ...prev, api_key: e.target.value }))}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2"
                            placeholder="or-..."
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Model</div>
                        <input
                            value={openrouterSettings.model}
                            onChange={(e) => setOpenrouterSettings((prev) => ({ ...prev, model: e.target.value }))}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2"
                            placeholder="openai/gpt-4o-mini"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Base URL</div>
                        <input
                            value={openrouterSettings.base_url}
                            onChange={(e) => setOpenrouterSettings((prev) => ({ ...prev, base_url: e.target.value }))}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-2"
                            placeholder="https://openrouter.ai/api/v1/chat/completions"
                        />
                    </div>
                </div>
            </div>

        </div>
    )
}
