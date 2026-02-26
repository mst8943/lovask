'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatHours, parseActiveHoursForSave, parseActiveHoursInput, toUtcHours } from '@/lib/activeHours'
import Spinner from '@/components/ui/Spinner'

type GroupRow = {
    id: string
    name: string | null
    prompt: string | null
}

export default function AdminBotAddPage() {
    const supabase = useMemo(() => createClient(), [])
    const [groups, setGroups] = useState<GroupRow[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [form, setForm] = useState({
        name: '',
        age: 24,
        gender: 'Female',
        city: 'Istanbul',
        bio: '',
        prompt: '',
        groupId: '',
        photos: '',
        tone: 'playful',
        languageMode: 'auto',
        autoLikeRate: 5,
        engagement: 'medium',
        cooldownHours: 72,
        activeHoursRaw: '02:00, 08:00',
        delayMin: 3,
        delayMax: 12,
        allowInitiate: false,
        autoStory: false,
        rotationMinutes: 0,
        useGlobal: true,
    })
    const [activeHoursUseTr, setActiveHoursUseTr] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const { data } = await supabase.from('bot_groups').select('id,name,prompt').order('name')
            setGroups((data || []) as GroupRow[])
            setLoading(false)
        }
        load()
    }, [supabase])

    const handleCreate = async () => {
        setCreating(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/bots/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    display_name: form.name,
                    age: form.age,
                    gender: form.gender,
                    city: form.city,
                    bio: form.bio,
                    prompt: form.prompt,
                    group_id: form.groupId || null,
                    photos: form.photos
                        .split(',')
                        .map((p) => p.trim())
                        .filter(Boolean),
                    tone: form.tone,
                    language_mode: form.languageMode,
                    auto_like_rate: form.autoLikeRate,
                    engagement_intensity: form.engagement,
                    cooldown_hours: form.cooldownHours,
                    active_hours: parseActiveHoursForSave(form.activeHoursRaw || '', activeHoursUseTr),
                    response_delay_min_s: form.delayMin,
                    response_delay_max_s: form.delayMax,
                    allow_initiate: form.allowInitiate,
                    auto_story: form.autoStory,
                    profile_rotation_minutes: form.rotationMinutes,
                    use_global: form.useGlobal,
                }),
            })
            if (!res.ok) {
                throw new Error(await res.text())
            }
            setForm({ ...form, name: '', bio: '', prompt: '', photos: '' })
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Bir hata olustu.'
            setError(message)
        } finally {
            setCreating(false)
        }
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
                    <h1 className="text-2xl font-bold">Bot Ekle</h1>
                    <p className="text-sm text-slate-500">Yeni bot oluştur ve yapılandır</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                    Bot Yönetimi
                </div>
            </div>

            {error && (
                <div className="p-3 text-sm text-red-900 bg-red-100 border border-red-200 rounded-lg">
                    {error}
                </div>
            )}

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Form</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Ad</div>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Ad"
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Yaş</div>
                        <input
                            type="number"
                            value={form.age}
                            onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                            placeholder="Yaş"
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Cinsiyet</div>
                        <input
                            value={form.gender}
                            onChange={(e) => setForm({ ...form, gender: e.target.value })}
                            placeholder="Cinsiyet"
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Şehir</div>
                        <input
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                            placeholder="Şehir"
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <div className="text-sm text-slate-600">Biyografi</div>
                        <input
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            placeholder="Biyografi"
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <div className="text-sm text-slate-600">Foto URL (virgül ile)</div>
                        <input
                            value={form.photos}
                            onChange={(e) => setForm({ ...form, photos: e.target.value })}
                            placeholder="Foto URL"
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Bot Grubu</div>
                        <select
                            value={form.groupId}
                            onChange={(e) => setForm({ ...form, groupId: e.target.value })}
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        >
                            <option value="">Grup yok</option>
                            {groups.map((g) => (
                                <option key={g.id} value={g.id}>{g.name || g.id}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Ton</div>
                        <select
                            value={form.tone}
                            onChange={(e) => setForm({ ...form, tone: e.target.value })}
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        >
                            <option value="playful">Eğlenceli</option>
                            <option value="flirty">Flörtöz</option>
                            <option value="serious">Ciddi</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Dil Modu</div>
                        <select
                            value={form.languageMode}
                            onChange={(e) => setForm({ ...form, languageMode: e.target.value })}
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
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
                            value={form.autoLikeRate}
                            onChange={(e) => setForm({ ...form, autoLikeRate: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Etkileşim yoğunluğu</div>
                        <select
                            value={form.engagement}
                            onChange={(e) => setForm({ ...form, engagement: e.target.value })}
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        >
                            <option value="low">Düşük</option>
                            <option value="medium">Orta</option>
                            <option value="high">Yüksek</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Cooldown (saat)</div>
                        <input
                            type="number"
                            value={form.cooldownHours}
                            onChange={(e) => setForm({ ...form, cooldownHours: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Aktif saatler</div>
                        <input
                            value={form.activeHoursRaw}
                            onChange={(e) => setForm({ ...form, activeHoursRaw: e.target.value })}
                            placeholder="Örn: 02:00, 08:00 veya 10:00-23:00"
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
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
                            Genişletilmiş: {formatHours(parseActiveHoursInput(form.activeHoursRaw || '')) || '-'}
                        </div>
                        {activeHoursUseTr && (
                            <div className="text-[10px] text-slate-500">
                                UTC karşılığı: {formatHours(toUtcHours(parseActiveHoursInput(form.activeHoursRaw || ''))) || '-'}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Cevap gecikmesi min (sn)</div>
                        <input
                            type="number"
                            value={form.delayMin}
                            onChange={(e) => setForm({ ...form, delayMin: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Cevap gecikmesi max (sn)</div>
                        <input
                            type="number"
                            value={form.delayMax}
                            onChange={(e) => setForm({ ...form, delayMax: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Profil rotasyonu (dk)</div>
                        <input
                            type="number"
                            value={form.rotationMinutes}
                            onChange={(e) => setForm({ ...form, rotationMinutes: Number(e.target.value) })}
                            className="w-full px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <div className="text-sm text-slate-600">Prompt</div>
                        <textarea
                            value={form.prompt}
                            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                            placeholder="Bot prompt"
                            className="w-full min-h-[100px] px-3 py-2 bg-black/20 border border-slate-200 rounded-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={form.allowInitiate}
                                onChange={(e) => setForm({ ...form, allowInitiate: e.target.checked })}
                            />
                            Sohbet başlatmaya izin
                        </label>
                        <label className="text-xs flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={form.autoStory}
                                onChange={(e) => setForm({ ...form, autoStory: e.target.checked })}
                            />
                            Otomatik hikaye
                        </label>
                        <label className="text-xs flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={form.useGlobal}
                                onChange={(e) => setForm({ ...form, useGlobal: e.target.checked })}
                            />
                            Global ayarları kullan
                        </label>
                    </div>
                </div>

                <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="w-full py-3 rounded-xl bg-white"
                >
                    {creating ? 'Kaydediliyor...' : 'Bot Ekle'}
                </button>
            </div>
        </div>
    )
}
