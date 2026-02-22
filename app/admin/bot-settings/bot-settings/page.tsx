'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type Settings = {
    id?: string
    global_prompt: string
    tone: string
    language_mode: string
    auto_like_rate: number
    engagement_intensity: string
    cooldown_hours: number
    response_delay_min_s: number
    response_delay_max_s: number
    read_receipt_delay_s: number
    auto_story: boolean
    profile_rotation_minutes: number
    allow_initiate: boolean
    use_global?: boolean
    active_hours?: number[]
    active_hours_raw?: string
}
const defaultSettings: Settings = {
    global_prompt: '',
    tone: 'playful',
    language_mode: 'auto',
    auto_like_rate: 5,
    engagement_intensity: 'medium',
    cooldown_hours: 72,
    response_delay_min_s: 3,
    response_delay_max_s: 12,
    read_receipt_delay_s: 10,
    auto_story: false,
    profile_rotation_minutes: 0,
    allow_initiate: false,
    use_global: true,
    active_hours: [],
    active_hours_raw: '',
}
export default function BotSettingsPage() {
    const [settings, setSettings] = useState<Settings>(defaultSettings)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = useMemo(() => createClient(), [])
    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('bot_global_settings')
                .select('*')
                .limit(1)
                .maybeSingle()
            if (error) setError(error.message)
            if (data) {
                const activeHours = Array.isArray((data as { active_hours?: unknown }).active_hours)
                    ? (data as { active_hours?: number[] }).active_hours || []
                    : []
                setSettings({
                    ...(data as Settings),
                    active_hours_raw: activeHours.join(',')
                })
            }
            setLoading(false)
        }
        load()
    }, [supabase])
    const save = async () => {
        setSaving(true)
        setError(null)
        const hours = (settings.active_hours_raw || '')
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .map((v) => Number(v))
            .filter((v) => !Number.isNaN(v) && v >= 0 && v <= 23)
        const { active_hours_raw: _activeHoursRaw, ...rest } = settings
        void _activeHoursRaw
        const payload: Settings & { active_hours: number[] } = { ...rest, active_hours: hours }
        if (settings.id) {
            const { error } = await supabase.from('bot_global_settings').update(payload).eq('id', settings.id)
            if (error) setError(error.message)
        } else {
            const { data, error } = await supabase.from('bot_global_settings').insert(payload).select().single()
            if (error) setError(error.message)
            if (data) setSettings(data as Settings)
        }
        setSaving(false)
    }
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
            <h1 className="text-2xl font-bold">Bot Ayarlari</h1>
                    <p className="text-sm text-slate-500">Global davranis ve zamanlama</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                    Ayarlar
                </div>
            </div>
            {error && (
                <div className="p-3 text-sm text-red-900 bg-red-100 border border-red-200 rounded-lg">
                    {error}
                </div>
            )}
            <div className="glass-panel p-5 rounded-2xl space-y-4 border border-slate-200">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Genel</div>
                <div className="text-sm text-slate-600">Global prompt</div>
                <textarea
                    value={settings.global_prompt}
                    onChange={(e) => setSettings({ ...settings, global_prompt: e.target.value })}
                    placeholder="Global promptu"
                    className="w-full min-h-[120px] px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                />
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Ton</div>
                        <select
                            value={settings.tone}
                            onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                        >
                            <option value="playful">Eğlenceli</option>
                            <option value="flirty">Flörtöz</option>
                            <option value="serious">Ciddi</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Dil modu</div>
                        <select
                            value={settings.language_mode}
                            onChange={(e) => setSettings({ ...settings, language_mode: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                        >
                            <option value="auto">Otomatik</option>
                            <option value="tr">TR</option>
                            <option value="en">EN</option>
                        </select>
                    </div>
                </div>
                <div className="text-sm text-slate-600">Aktif saatler (UTC)</div>
                <input
                    value={settings.active_hours_raw || ''}
                    onChange={(e) => setSettings({ ...settings, active_hours_raw: e.target.value })}
                    placeholder="Aktif saatler UTC (ör. 9,10,11,20)"
                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                />
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Oto-beğeni oranı (%)</div>
                        <input
                            type="number"
                            value={settings.auto_like_rate}
                            onChange={(e) => setSettings({ ...settings, auto_like_rate: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            placeholder="Oto-beğeni %"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Etkileşim yoğunluğu</div>
                        <select
                            value={settings.engagement_intensity}
                            onChange={(e) => setSettings({ ...settings, engagement_intensity: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                        >
                            <option value="low">Düşük</option>
                            <option value="medium">Orta</option>
                            <option value="high">Yüksek</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Cooldown (saat)</div>
                        <input
                            type="number"
                            value={settings.cooldown_hours}
                            onChange={(e) => setSettings({ ...settings, cooldown_hours: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            placeholder="Bekleme saati"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Profil rotasyonu (dk)</div>
                        <input
                            type="number"
                            value={settings.profile_rotation_minutes}
                            onChange={(e) => setSettings({ ...settings, profile_rotation_minutes: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            placeholder="Rotasyon dakika"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Cevap gecikmesi min (sn)</div>
                        <input
                            type="number"
                            value={settings.response_delay_min_s}
                            onChange={(e) => setSettings({ ...settings, response_delay_min_s: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            placeholder="Min gecikme (sn)"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Cevap gecikmesi max (sn)</div>
                        <input
                            type="number"
                            value={settings.response_delay_max_s}
                            onChange={(e) => setSettings({ ...settings, response_delay_max_s: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            placeholder="Max gecikme (sn)"
                        />
                    </div>
                </div>
                <div className="text-sm text-slate-600">Görüldü sonrası cevap gecikmesi (sn)</div>
                <input
                    type="number"
                    value={settings.read_receipt_delay_s}
                    onChange={(e) => setSettings({ ...settings, read_receipt_delay_s: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    placeholder="Goruldu sonrasi cevap gecikmesi (sn)"
                />
                <div className="flex items-center gap-3">
                    <label className="text-sm">Otomatik Hikaye</label>
                    <input
                        type="checkbox"
                        checked={settings.auto_story}
                        onChange={(e) => setSettings({ ...settings, auto_story: e.target.checked })}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm">Sohbet Başlatmaya İzin Ver</label>
                    <input
                        type="checkbox"
                        checked={settings.allow_initiate}
                        onChange={(e) => setSettings({ ...settings, allow_initiate: e.target.checked })}
                    />
                </div>
                <button
                    onClick={save}
                    disabled={saving}
                    className="w-full py-3 rounded-xl bg-white"
                >
                    {saving ? 'Kaydediliyor...' : 'Ayarlar1 Kaydet'}
                </button>
            </div>
        </div>
    )
}
