'use client'

import { useEffect, useMemo, useState } from 'react'
import Spinner from '@/components/ui/Spinner'

type GroupMessages = {
    messages: Record<string, string[]>
    neutral: Record<string, string[]>
}

type FallbackSettings = {
    enabled: boolean
    delays: { group1: number; group2: number; group3: number }
    groups: Record<string, GroupMessages>
}

const MIN_MESSAGES = 10
const LANGS = [
    { key: 'tr', label: 'Türkçe (TR)' },
    { key: 'en', label: 'English (EN)' },
    { key: 'de', label: 'Deutsch (DE)' },
    { key: 'fr', label: 'Français (FR)' },
    { key: 'ar', label: 'العربية (AR)' },
]
const GROUPS = [
    { key: 'group1', label: 'Grup 1', desc: '5 dakika sonra' },
    { key: 'group2', label: 'Grup 2', desc: '10 dakika sonra' },
    { key: 'group3', label: 'Grup 3', desc: 'Anında' },
]

const ensureMin = (list: string[] | undefined, min = MIN_MESSAGES) => {
    const next = Array.isArray(list) ? [...list] : []
    while (next.length < min) next.push('')
    return next
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object'

const seedGroups = (raw: unknown): FallbackSettings => {
    const source = isRecord(raw) ? raw : {}
    const legacy = {
        tr: source.message_tr ? [String(source.message_tr)] : [],
        en: source.message_en ? [String(source.message_en)] : [],
        de: source.message_de ? [String(source.message_de)] : [],
        fr: source.message_fr ? [String(source.message_fr)] : [],
        ar: source.message_ar ? [String(source.message_ar)] : [],
    }
    const legacyMessages = isRecord(source.messages) ? (source.messages as Record<string, string[]>) : legacy
    const groups: Record<string, GroupMessages> = {}
    GROUPS.forEach((g) => {
        const rawGroups = isRecord(source.groups) ? source.groups : {}
        const rawGroup = isRecord((rawGroups as Record<string, unknown>)[g.key])
            ? ((rawGroups as Record<string, unknown>)[g.key] as Record<string, unknown>)
            : {}
        const messages = (isRecord(rawGroup.messages) ? (rawGroup.messages as Record<string, string[]>) : (g.key === 'group1' ? legacyMessages : {})) as Record<string, string[]>
        const neutral = (isRecord(rawGroup.neutral) ? (rawGroup.neutral as Record<string, string[]>) : {}) as Record<string, string[]>
        const seededMessages: Record<string, string[]> = {}
        const seededNeutral: Record<string, string[]> = {}
        LANGS.forEach((l) => {
            seededMessages[l.key] = ensureMin(messages[l.key])
            seededNeutral[l.key] = ensureMin(neutral[l.key])
        })
        groups[g.key] = { messages: seededMessages, neutral: seededNeutral }
    })
    return {
        enabled: source.enabled !== false,
        delays: {
            group1: Number(isRecord(source.delays) ? (source.delays as Record<string, unknown>).group1 ?? 300 : 300),
            group2: Number(isRecord(source.delays) ? (source.delays as Record<string, unknown>).group2 ?? 600 : 600),
            group3: Number(isRecord(source.delays) ? (source.delays as Record<string, unknown>).group3 ?? 0 : 0),
        },
        groups,
    }
}

export default function AdminAiFallbackPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [settings, setSettings] = useState<FallbackSettings>(() => seedGroups({}))

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/admin/ai-fallback')
            if (!res.ok) {
                setError(await res.text())
                setLoading(false)
                return
            }
            const payload = await res.json()
            setSettings(seedGroups(payload?.value || {}))
            setLoading(false)
        }
        load()
    }, [])

    const updateMessage = (group: string, variant: 'messages' | 'neutral', lang: string, index: number, value: string) => {
        setSettings((prev) => {
            const next = { ...prev }
            const list = [...(next.groups[group][variant][lang] || [])]
            list[index] = value
            next.groups = {
                ...next.groups,
                [group]: {
                    ...next.groups[group],
                    [variant]: { ...next.groups[group][variant], [lang]: list },
                },
            }
            return next
        })
    }

    const addMessage = (group: string, variant: 'messages' | 'neutral', lang: string) => {
        setSettings((prev) => {
            const list = [...(prev.groups[group][variant][lang] || []), '']
            return {
                ...prev,
                groups: {
                    ...prev.groups,
                    [group]: {
                        ...prev.groups[group],
                        [variant]: { ...prev.groups[group][variant], [lang]: list },
                    },
                },
            }
        })
    }

    const removeMessage = (group: string, variant: 'messages' | 'neutral', lang: string, index: number) => {
        setSettings((prev) => {
            const list = [...(prev.groups[group][variant][lang] || [])]
            if (list.length <= MIN_MESSAGES) return prev
            list.splice(index, 1)
            return {
                ...prev,
                groups: {
                    ...prev.groups,
                    [group]: {
                        ...prev.groups[group],
                        [variant]: { ...prev.groups[group][variant], [lang]: list },
                    },
                },
            }
        })
    }

    const validateMinimums = () => {
        for (const g of GROUPS) {
            for (const l of LANGS) {
                const normal = settings.groups[g.key].messages[l.key].map((v) => v.trim()).filter(Boolean)
                const neutral = settings.groups[g.key].neutral[l.key].map((v) => v.trim()).filter(Boolean)
                if (normal.length < MIN_MESSAGES || neutral.length < MIN_MESSAGES) {
                    return `${g.label} - ${l.label} icin en az ${MIN_MESSAGES} mesaj gerekli.`
                }
            }
        }
        return null
    }

    const save = async () => {
        setSaving(true)
        setError(null)
        const validation = validateMinimums()
        if (validation) {
            setError(validation)
            setSaving(false)
            return
        }
        const cleaned: FallbackSettings = {
            enabled: settings.enabled,
            delays: settings.delays,
            groups: {},
        }
        GROUPS.forEach((g) => {
            const group = settings.groups[g.key]
            const messages: Record<string, string[]> = {}
            const neutral: Record<string, string[]> = {}
            LANGS.forEach((l) => {
                messages[l.key] = group.messages[l.key].map((v) => v.trim()).filter(Boolean)
                neutral[l.key] = group.neutral[l.key].map((v) => v.trim()).filter(Boolean)
            })
            cleaned.groups[g.key] = { messages, neutral }
        })
        const res = await fetch('/api/admin/ai-fallback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleaned),
        })
        if (!res.ok) setError(await res.text())
        setSaving(false)
    }

    const rows = useMemo(() => LANGS, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }

    return (
        <div className="admin-page space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">AI Fallback</h1>
                    <p className="text-sm text-slate-700">AI kesilirse gidecek yedek mesajlar</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs px-3 py-2 rounded-full border border-slate-200 bg-white">
                        <input
                            type="checkbox"
                            checked={settings.enabled}
                            onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                            className="w-5 h-5 rounded border-slate-300 text-pink-500 focus:ring-pink-500 cursor-pointer"
                        />
                        Fallback aktif
                    </label>
                    <button
                        onClick={save}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-xl font-bold admin-primary-btn shadow-sm hover:translate-y-[-1px] transition-all"
                    >
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 text-sm text-red-900 bg-red-100 border border-red-200 rounded-lg">
                    {error}
                </div>
            )}

            <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                    <div className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Zamanlama</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Dakika cinsinden</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Grup 1 (dk)</div>
                        <input
                            type="number"
                            min={1}
                            value={Math.round(settings.delays.group1 / 60)}
                            onChange={(e) => setSettings((prev) => ({
                                ...prev,
                                delays: { ...prev.delays, group1: Number(e.target.value) * 60 },
                            }))}
                            className="glass-input w-full px-4 py-2.5 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Grup 2 (dk)</div>
                        <input
                            type="number"
                            min={1}
                            value={Math.round(settings.delays.group2 / 60)}
                            onChange={(e) => setSettings((prev) => ({
                                ...prev,
                                delays: { ...prev.delays, group2: Number(e.target.value) * 60 },
                            }))}
                            className="glass-input w-full px-4 py-2.5 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Grup 3 (dk)</div>
                        <input
                            type="number"
                            min={0}
                            value={Math.round(settings.delays.group3 / 60)}
                            onChange={(e) => setSettings((prev) => ({
                                ...prev,
                                delays: { ...prev.delays, group3: Number(e.target.value) * 60 },
                            }))}
                            className="glass-input w-full px-4 py-2.5 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {GROUPS.map((group) => (
                    <div key={group.key} className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                        <div>
                            <div className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">{group.label}</div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{group.desc}</div>
                        </div>
                        {rows.map((lang) => (
                            <div key={`${group.key}-${lang.key}`} className="space-y-4">
                                <div className="text-sm font-semibold text-slate-700">{lang.label}</div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Normal (Flörtöz)</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(settings.groups[group.key].messages[lang.key] || []).map((value, idx) => (
                                                <div key={`${group.key}-n-${lang.key}-${idx}`} className="flex items-center gap-2">
                                                    <input
                                                        value={value}
                                                        onChange={(e) => updateMessage(group.key, 'messages', lang.key, idx, e.target.value)}
                                                        className="glass-input w-full px-4 py-2.5 text-sm"
                                                        placeholder={`Mesaj ${idx + 1}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMessage(group.key, 'messages', lang.key, idx)}
                                                        className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-rose-600"
                                                        disabled={(settings.groups[group.key].messages[lang.key]?.length || 0) <= MIN_MESSAGES}
                                                    >
                                                        Sil
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => addMessage(group.key, 'messages', lang.key)}
                                            className="px-3 py-2 text-xs rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        >
                                            + Mesaj Ekle
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nötr (Agresif Mesajda)</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(settings.groups[group.key].neutral[lang.key] || []).map((value, idx) => (
                                                <div key={`${group.key}-t-${lang.key}-${idx}`} className="flex items-center gap-2">
                                                    <input
                                                        value={value}
                                                        onChange={(e) => updateMessage(group.key, 'neutral', lang.key, idx, e.target.value)}
                                                        className="glass-input w-full px-4 py-2.5 text-sm"
                                                        placeholder={`Mesaj ${idx + 1}`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeMessage(group.key, 'neutral', lang.key, idx)}
                                                        className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-rose-600"
                                                        disabled={(settings.groups[group.key].neutral[lang.key]?.length || 0) <= MIN_MESSAGES}
                                                    >
                                                        Sil
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => addMessage(group.key, 'neutral', lang.key)}
                                            className="px-3 py-2 text-xs rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        >
                                            + Mesaj Ekle
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}
