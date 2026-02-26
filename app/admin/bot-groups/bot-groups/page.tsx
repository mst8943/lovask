'use client'
import { useCallback, useEffect, useState } from 'react'
import { formatHours, parseActiveHoursForSave, parseActiveHoursInput, toUtcHours } from '@/lib/activeHours'
import Spinner from '@/components/ui/Spinner'
type Group = {
    id: string
    name: string | null
    prompt: string | null
    tone: string | null
    language_mode: string | null
    auto_like_rate: number | null
    engagement_intensity: string | null
    cooldown_hours: number | null
    response_delay_min_s: number | null
    response_delay_max_s: number | null
    auto_story: boolean | null
    profile_rotation_minutes: number | null
    active_hours: number[] | null
    created_at?: string | null
}
const postJson = async <T,>(url: string, payload?: Record<string, unknown>) => {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
    })
    if (!res.ok) {
        throw new Error(await res.text())
    }
    return (await res.json()) as T
}
export default function BotGroupsPage() {
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({
        name: '',
        prompt: '',
        tone: 'playful',
        language_mode: 'auto',
        auto_like_rate: 5,
        engagement_intensity: 'medium',
        cooldown_hours: 72,
        response_delay_min_s: 3,
        response_delay_max_s: 12,
        auto_story: false,
        profile_rotation_minutes: 0,
        active_hours_raw: '',
    })
    const [activeHoursUseTr, setActiveHoursUseTr] = useState(true)
    const load = useCallback(async () => {
        setLoading(true)
        try {
            const payload = await postJson<{ rows: Group[] }>('/api/admin/bot-groups/list')
            setGroups(payload.rows || [])
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Bir hata oluştu.'
            setError(message)
        }
        setLoading(false)
    }, [])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const handleCreateGroup = async () => {
        const hours = parseActiveHoursForSave(form.active_hours_raw || '', activeHoursUseTr)
        const { active_hours_raw: _activeHoursRaw, ...rest } = form
        void _activeHoursRaw
        const payload: Record<string, unknown> = { ...rest, active_hours: hours }
        try {
            await postJson('/api/admin/bot-groups/create', payload)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Bir hata oluştu.'
            setError(message)
        }
        await load()
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
            <h1 className="text-2xl font-bold">Bot Gruplari</h1>
                    <p className="text-sm text-slate-500">Grup bazli davranis ve zamanlama</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                    Gruplar
                </div>
            </div>
            {error && (
                <div className="p-3 text-sm text-red-900 bg-red-100 border border-red-200 rounded-lg">
                    {error}
                </div>
            )}
            <div className="glass-panel p-5 rounded-2xl space-y-3 border border-slate-200">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Yeni Grup</div>
                <div className="text-sm text-slate-600">Grup adı</div>
                <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Grup adı"
                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                />
                <div className="text-sm text-slate-600">Grup prompt</div>
                <textarea
                    value={form.prompt}
                    onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                    placeholder="Grup prompt"
                    className="w-full min-h-[80px] px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                />
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Ton</div>
                        <select
                            value={form.tone}
                            onChange={(e) => setForm({ ...form, tone: e.target.value })}
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
                            value={form.language_mode}
                            onChange={(e) => setForm({ ...form, language_mode: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                        >
                            <option value="auto">Otomatik</option>
                            <option value="tr">TR</option>
                            <option value="en">EN</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Oto-beğeni oranı (%)</div>
                        <input
                            type="number"
                            value={form.auto_like_rate}
                            onChange={(e) => setForm({ ...form, auto_like_rate: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            placeholder="Oto-beğeni %"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Etkileşim yoğunluğu</div>
                        <select
                            value={form.engagement_intensity}
                            onChange={(e) => setForm({ ...form, engagement_intensity: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                        >
                            <option value="low">Düşük</option>
                            <option value="medium">Orta</option>
                            <option value="high">Yüksek</option>
                        </select>
                    </div>
                </div>
                <div className="text-sm text-slate-600">Aktif saatler</div>
                <input
                    value={form.active_hours_raw}
                    onChange={(e) => setForm({ ...form, active_hours_raw: e.target.value })}
                    placeholder="Örn: 02:00, 08:00 veya 10:00-23:00"
                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                />
                <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                        type="checkbox"
                        checked={activeHoursUseTr}
                        onChange={(e) => setActiveHoursUseTr(e.target.checked)}
                    />
                    TR saatine göre gir (UTC+3)
                </label>
                <div className="text-[10px] text-slate-500">
                    Genişletilmiş: {formatHours(parseActiveHoursInput(form.active_hours_raw || '')) || '-'}
                </div>
                {activeHoursUseTr && (
                    <div className="text-[10px] text-slate-500">
                        UTC karşılığı: {formatHours(toUtcHours(parseActiveHoursInput(form.active_hours_raw || ''))) || '-'}
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Cooldown (saat)</div>
                        <input
                            type="number"
                            value={form.cooldown_hours}
                            onChange={(e) => setForm({ ...form, cooldown_hours: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            placeholder="Bekleme saat"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Profil rotasyonu (dk)</div>
                        <input
                            type="number"
                            value={form.profile_rotation_minutes}
                            onChange={(e) => setForm({ ...form, profile_rotation_minutes: Number(e.target.value) })}
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
                            value={form.response_delay_min_s}
                            onChange={(e) => setForm({ ...form, response_delay_min_s: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            placeholder="Min gecikme"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Cevap gecikmesi max (sn)</div>
                        <input
                            type="number"
                            value={form.response_delay_max_s}
                            onChange={(e) => setForm({ ...form, response_delay_max_s: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            placeholder="Max gecikme"
                        />
                    </div>
                </div>
                <label className="text-xs flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={form.auto_story}
                        onChange={(e) => setForm({ ...form, auto_story: e.target.checked })}
                    />
                    Otomatik Hikaye
                </label>
                <button onClick={handleCreateGroup} className="w-full py-3 rounded-xl bg-white">
                    Grup Oluştur
                </button>
            </div>
            <div className="space-y-2">
                {groups.map((g) => (
                    <GroupRow key={g.id} group={g} onUpdated={load} />
                ))}
            </div>
        </div>
    )
}
function GroupRow({ group, onUpdated }: { group: Group; onUpdated: () => void }) {
    const [editing, setEditing] = useState(false)
    const [activeHoursUseTr, setActiveHoursUseTr] = useState(false)
    const [state, setState] = useState({
        name: group.name || '',
        prompt: group.prompt || '',
        tone: group.tone || 'playful',
        language_mode: group.language_mode || 'auto',
        auto_like_rate: group.auto_like_rate || 5,
        engagement_intensity: group.engagement_intensity || 'medium',
        cooldown_hours: group.cooldown_hours || 72,
        response_delay_min_s: group.response_delay_min_s || 3,
        response_delay_max_s: group.response_delay_max_s || 12,
        auto_story: !!group.auto_story,
        profile_rotation_minutes: group.profile_rotation_minutes || 0,
        active_hours_raw: Array.isArray(group.active_hours) ? group.active_hours.join(',') : '',
    })
    const save = async () => {
        const hours = parseActiveHoursForSave(state.active_hours_raw || '', activeHoursUseTr)
        const { active_hours_raw: _activeHoursRaw, ...rest } = state
        void _activeHoursRaw
        const payload: Record<string, unknown> = { ...rest, active_hours: hours }
        await postJson('/api/admin/bot-groups/update', { id: group.id, payload })
        setEditing(false)
        onUpdated()
    }
    return (
        <div className="glass-panel p-4 rounded-2xl space-y-2 border border-slate-200">
            <div className="flex items-center justify-between">
                <div className="font-semibold">{group.name}</div>
                <button onClick={() => setEditing(!editing)} className="text-xs px-2 py-1 rounded-full bg-white">
                    {editing ? 'Kapat' : 'D?zenle'}
                </button>
            </div>
            <div className="text-xs text-slate-500">{group.prompt?.slice(0, 80) || '?'}</div>
            {editing && (
                <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 text-xs uppercase tracking-[0.2em] text-slate-500">Duzenle</div>
                    <div className="col-span-2 text-sm text-slate-600">Grup adı</div>
                    <input
                        value={state.name}
                        onChange={(e) => setState({ ...state, name: e.target.value })}
                        className="px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    />
                    <div className="text-sm text-slate-600">Ton</div>
                    <select
                        value={state.tone}
                        onChange={(e) => setState({ ...state, tone: e.target.value })}
                        className="px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    >
                        <option value="playful">Eglenceli</option>
                        <option value="flirty">Flortoz</option>
                        <option value="serious">Ciddi</option>
                    </select>
                    <div className="text-sm text-slate-600">Dil modu</div>
                    <select
                        value={state.language_mode}
                        onChange={(e) => setState({ ...state, language_mode: e.target.value })}
                        className="px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    >
                        <option value="auto">Oto</option>
                        <option value="tr">TR</option>
                        <option value="en">EN</option>
                    </select>
                    <div className="text-sm text-slate-600">Oto-beğeni oranı (%)</div>
                    <input
                        type="number"
                        value={state.auto_like_rate}
                        onChange={(e) => setState({ ...state, auto_like_rate: Number(e.target.value) })}
                        className="px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    />
                    <div className="text-sm text-slate-600">Cooldown (saat)</div>
                    <input
                        type="number"
                        value={state.cooldown_hours}
                        onChange={(e) => setState({ ...state, cooldown_hours: Number(e.target.value) })}
                        className="px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    />
                    <div className="text-sm text-slate-600">Aktif saatler</div>
                    <input
                        value={state.active_hours_raw}
                        onChange={(e) => setState({ ...state, active_hours_raw: e.target.value })}
                        className="px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                        placeholder="Örn: 02:00, 08:00 veya 10:00-23:00"
                    />
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                            type="checkbox"
                            checked={activeHoursUseTr}
                            onChange={(e) => setActiveHoursUseTr(e.target.checked)}
                        />
                        TR saatine göre gir (UTC+3)
                    </label>
                    <div className="text-[10px] text-slate-500">
                        Genişletilmiş: {formatHours(parseActiveHoursInput(state.active_hours_raw || '')) || '-'}
                    </div>
                    {activeHoursUseTr && (
                        <div className="text-[10px] text-slate-500">
                            UTC karşılığı: {formatHours(toUtcHours(parseActiveHoursInput(state.active_hours_raw || ''))) || '-'}
                        </div>
                    )}
                    <div className="text-sm text-slate-600">Profil rotasyonu (dk)</div>
                    <input
                        type="number"
                        value={state.profile_rotation_minutes}
                        onChange={(e) => setState({ ...state, profile_rotation_minutes: Number(e.target.value) })}
                        className="px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    />
                    <div className="col-span-2">
                        <div className="text-sm text-slate-600 mb-1">Grup prompt</div>
                        <textarea
                            value={state.prompt}
                            onChange={(e) => setState({ ...state, prompt: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                        />
                    </div>
                    <div className="col-span-2 flex items-center gap-3">
                        <label className="text-xs flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={state.auto_story}
                                onChange={(e) => setState({ ...state, auto_story: e.target.checked })}
                            />
                            Oto Hikaye
                        </label>
                        <button onClick={save} className="ml-auto px-3 py-2 rounded-lg bg-white text-xs">
                            Kaydet
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
