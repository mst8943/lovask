'use client'

import { useEffect, useState } from 'react'

import { fetchBots, fetchBotGroups, createBotGroup } from '@/services/botAdminService'

import { formatHours, parseActiveHoursForSave, parseActiveHoursInput, toUtcHours } from '@/lib/activeHours'

import Spinner from '@/components/ui/Spinner'

import { usePresenceStore } from '@/store/usePresenceStore'

type BotRow = {

    id: string

    email?: string | null

    role?: string | null

    display_name: string | null

    age: number | null

    gender: string | null

    city: string | null

    bio: string | null

    photos: string[] | null

    coin_balance: number | null

    is_premium: boolean | null

    premium_expires_at: string | null

    last_active_at?: string | null

    active: boolean | null

    tone: string | null

    language_mode: string | null

    auto_like_rate: number | null

    engagement_intensity: string | null

    cooldown_hours: number | null

    response_delay_min_s: number | null

    response_delay_max_s: number | null

    profile_rotation_minutes: number | null

    group_id: string | null

    allow_initiate: boolean | null

    auto_story: boolean | null

    use_global: boolean | null

    personality_prompt: string | null

    profiles?: {

        display_name?: string | null

        age?: number | null

        gender?: string | null

        city?: string | null

        bio?: string | null

        photos?: string[] | null

    } | null

    bot_configs?: {

        personality_prompt?: string | null

        tone?: string | null

        language_mode?: string | null

        auto_like_rate?: number | null

        engagement_intensity?: string | null

        cooldown_hours?: number | null

        active_hours?: number[] | null

        response_delay_min_s?: number | null

        response_delay_max_s?: number | null

        allow_initiate?: boolean | null

        auto_story?: boolean | null

        profile_rotation_minutes?: number | null

        use_global?: boolean | null

        behavior_settings?: { group_id?: string | null; active?: boolean | null } | null

    } | null

}

type RawBot = {

    id: string

    email?: string | null

    role?: string | null

    coin_balance?: number | null

    is_premium?: boolean | null

    premium_expires_at?: string | null

    created_at?: string

    last_active_at?: string | null

    profiles?: Array<{

        display_name?: string | null

        age?: number | null

        gender?: string | null

        city?: string | null

        bio?: string | null

        photos?: string[] | null

    }> | {

        display_name?: string | null

        age?: number | null

        gender?: string | null

        city?: string | null

        bio?: string | null

        photos?: string[] | null

    } | null

    bot_configs?: Array<{

        personality_prompt?: string | null

        tone?: string | null

        language_mode?: string | null

        auto_like_rate?: number | null

        engagement_intensity?: string | null

        cooldown_hours?: number | null

        active_hours?: number[] | null

        response_delay_min_s?: number | null

        response_delay_max_s?: number | null

        allow_initiate?: boolean | null

        auto_story?: boolean | null

        profile_rotation_minutes?: number | null

        use_global?: boolean | null

        behavior_settings?: { group_id?: string | null; active?: boolean | null } | null

    }> | {

        personality_prompt?: string | null

        tone?: string | null

        language_mode?: string | null

        auto_like_rate?: number | null

        engagement_intensity?: string | null

        cooldown_hours?: number | null

        active_hours?: number[] | null

        response_delay_min_s?: number | null

        response_delay_max_s?: number | null

        allow_initiate?: boolean | null

        auto_story?: boolean | null

        profile_rotation_minutes?: number | null

        use_global?: boolean | null

        behavior_settings?: { group_id?: string | null; active?: boolean | null } | null

    } | null

}

type GroupRow = {

    id: string

    name: string | null

    prompt: string | null

}

type BotEdit = {

    id?: string

    display_name?: string

    age?: number

    gender?: string

    city?: string

    bio?: string

    photos?: string

    coin_balance?: number

    is_premium?: boolean

    premium_expires_at?: string

    active?: boolean

    tone?: string

    language_mode?: string

    auto_like_rate?: number

    engagement_intensity?: string

    cooldown_hours?: number

    active_hours_raw?: string

    response_delay_min_s?: number

    response_delay_max_s?: number

    profile_rotation_minutes?: number

    group_id?: string

    allow_initiate?: boolean

    auto_story?: boolean

    use_global?: boolean

    personality_prompt?: string

}

type NameRow = { name: string; gender?: string | null }

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

export default function AdminBotsPage() {

    const [bots, setBots] = useState<BotRow[]>([])

    const [groups, setGroups] = useState<GroupRow[]>([])

    const [loading, setLoading] = useState(true)

    const [error, setError] = useState<string | null>(null)

    const [creating, setCreating] = useState(false)

    const [selected, setSelected] = useState<Record<string, boolean>>({})

    const [bulkGroupId, setBulkGroupId] = useState('')

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

    const [bulkJson, setBulkJson] = useState('')

    const [poolBioGender, setPoolBioGender] = useState('')

    const [poolBios, setPoolBios] = useState('')

    const [poolStatus, setPoolStatus] = useState<string | null>(null)

    const [poolSummary, setPoolSummary] = useState<{

        photo_count: number

        bio_count: number

        name_count: number

        photos: { gender: string; size: number }[]

        bios: { gender: string | null }[]

        names: { gender: string | null }[]

    } | null>(null)

    const [groupOpen, setGroupOpen] = useState(false)

    const [groupName, setGroupName] = useState('')

    const [groupPrompt, setGroupPrompt] = useState('')

    const [autoCount, setAutoCount] = useState(10)

    const [autoFemalePercent, setAutoFemalePercent] = useState(50)

    const [autoAgeMin, setAutoAgeMin] = useState(20)

    const [autoAgeMax, setAutoAgeMax] = useState(35)

    const [autoCityMode, setAutoCityMode] = useState<'random' | 'fixed'>('random')

    const [autoCities, setAutoCities] = useState('Istanbul\nAnkara\nIzmir')

    const [autoFixedCity, setAutoFixedCity] = useState('')

    const [autoUseBioPool, setAutoUseBioPool] = useState(true)

    const [autoUsePhotoPool, setAutoUsePhotoPool] = useState(true)

    const [autoGroupId, setAutoGroupId] = useState('')

    const [autoActiveHoursRaw, setAutoActiveHoursRaw] = useState('02:00, 08:00')

    const [autoActiveHoursUseTr, setAutoActiveHoursUseTr] = useState(true)

    const [autoCreating, setAutoCreating] = useState(false)

    const [nameFemale, setNameFemale] = useState('')

    const [nameMale, setNameMale] = useState('')

    const [nameStatus, setNameStatus] = useState<string | null>(null)

    const totalBots = bots.length

    const activeBots = bots.filter((b) => b.bot_configs?.behavior_settings?.active !== false).length

    const groupCount = groups.length

    const poolPhotoCount = poolSummary?.photo_count || 0

    const poolBioCount = poolSummary?.bio_count || 0

    const poolNameCount = poolSummary?.name_count || 0

    const load = async () => {

        setLoading(true)

        setError(null)

        try {

            const [rawBots, groupRows] = await Promise.all([fetchBots(), fetchBotGroups()])

            const botRows: BotRow[] = (rawBots as RawBot[]).map((bot) => {

                const profile = Array.isArray(bot.profiles) ? bot.profiles[0] : bot.profiles

                const config = Array.isArray(bot.bot_configs) ? bot.bot_configs[0] : bot.bot_configs

                return {

                    ...bot,

                    coin_balance: bot.coin_balance ?? null,

                    is_premium: bot.is_premium ?? null,

                    premium_expires_at: bot.premium_expires_at ?? null,

                    last_active_at: bot.last_active_at ?? null,

                    profiles: profile || null,

                    bot_configs: config || null,

                    display_name: profile?.display_name ?? null,

                    age: profile?.age ?? null,

                    gender: profile?.gender ?? null,

                    city: profile?.city ?? null,

                    bio: profile?.bio ?? null,

                    photos: profile?.photos ?? null,

                    personality_prompt: config?.personality_prompt ?? null,

                    tone: config?.tone ?? null,

                    language_mode: config?.language_mode ?? null,

                    auto_like_rate: config?.auto_like_rate ?? null,

                    engagement_intensity: config?.engagement_intensity ?? null,

                    cooldown_hours: config?.cooldown_hours ?? null,

                    response_delay_min_s: config?.response_delay_min_s ?? null,

                    response_delay_max_s: config?.response_delay_max_s ?? null,

                    profile_rotation_minutes: config?.profile_rotation_minutes ?? null,

                    allow_initiate: config?.allow_initiate ?? null,

                    auto_story: config?.auto_story ?? null,

                    use_global: config?.use_global ?? null,

                    active: config?.behavior_settings?.active ?? null,

                    group_id: config?.behavior_settings?.group_id ?? null,

                }

            })

            setBots(botRows)

            setGroups(groupRows)

            const summaryRes = await fetch('/api/admin/bots/pool/summary')

            if (summaryRes.ok) {

                const summary = await summaryRes.json()

                setPoolSummary(summary)

            }

            const namesRes = await fetch('/api/admin/bots/pool/names')

            if (namesRes.ok) {

                const data = await namesRes.json()

                const names: NameRow[] = Array.isArray(data?.names) ? data.names : []

                const females = names.filter((n) => (n.gender || '').toLowerCase().startsWith('f')).map((n) => n.name)

                const males = names.filter((n) => (n.gender || '').toLowerCase().startsWith('m')).map((n) => n.name)

                setNameFemale(females.join('\n'))

                setNameMale(males.join('\n'))

            }

        } catch (err: unknown) {

            const message = err instanceof Error ? err.message : 'Bir hata oluştu.'

            setError(message)

        } finally {

            setLoading(false)

        }

    }

    useEffect(() => {

        load()

    }, [])

    const parseActiveHours = (raw: string, useTr: boolean) => parseActiveHoursForSave(raw, useTr)

    const handleCreate = async () => {

        setCreating(true)

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

                    active_hours: parseActiveHours(form.activeHoursRaw || '', activeHoursUseTr),

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

            await load()

        } catch (err: unknown) {

            const message = err instanceof Error ? err.message : 'Bir hata oluştu.'

            setError(message)

        } finally {

            setCreating(false)

        }

    }

    const handleBulk = async () => {

        try {

            const payload = JSON.parse(bulkJson)

            const res = await fetch('/api/admin/bots/bulk', {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({ items: payload }),

            })

            if (!res.ok) throw new Error(await res.text())

            setBulkJson('')

            await load()

        } catch (err: unknown) {

            const message = err instanceof Error ? err.message : 'Bir hata oluştu.'

            setError(message)

        }

    }

    const handlePoolZip = async (file: File | null) => {

        if (!file) return

        const form = new FormData()

        form.append('file', file)

        setPoolStatus('Zip Yükleniyor...')

        const res = await fetch('/api/admin/bots/pool/photos', { method: 'POST', body: form })

        if (!res.ok) {

            setPoolStatus('Yukleme basarisiz.')

            return

        }

        const data = await res.json()

        setPoolStatus(`Yuklendi: ${data.uploaded || 0}`)

        const summaryRes = await fetch('/api/admin/bots/pool/summary')

        if (summaryRes.ok) setPoolSummary(await summaryRes.json())

    }

    const handlePoolBios = async () => {

        const bios = poolBios.split('\n').map((b) => b.trim()).filter(Boolean)

        if (bios.length === 0) return

        setPoolStatus('Biyografiler kaydediliyor......')

        const res = await fetch('/api/admin/bots/pool/bios', {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ gender: poolBioGender || null, bios }),

        })

        if (!res.ok) {

            setPoolStatus('bio save failed.')

            return

        }

        setPoolStatus(`Biyografiler kaydedildi: ${bios.length}`)

        setPoolBios('')

        const summaryRes = await fetch('/api/admin/bots/pool/summary')

        if (summaryRes.ok) setPoolSummary(await summaryRes.json())

    }

    const handleSaveNames = async () => {

        setNameStatus(null)

        try {

            const femaleNames = nameFemale.split('\n').map((n) => n.trim()).filter(Boolean)

            const maleNames = nameMale.split('\n').map((n) => n.trim()).filter(Boolean)

            if (femaleNames.length === 0 && maleNames.length === 0) {

                setNameStatus('Isim listesi bos.')

                return

            }

            if (femaleNames.length > 0) {

                const res = await fetch('/api/admin/bots/pool/names', {

                    method: 'POST',

                    headers: { 'Content-Type': 'application/json' },

                    body: JSON.stringify({ gender: 'female', names: femaleNames, replace: true }),

                })

                if (!res.ok) throw new Error(await res.text())

            }

            if (maleNames.length > 0) {

                const res = await fetch('/api/admin/bots/pool/names', {

                    method: 'POST',

                    headers: { 'Content-Type': 'application/json' },

                    body: JSON.stringify({ gender: 'male', names: maleNames, replace: true }),

                })

                if (!res.ok) throw new Error(await res.text())

            }

            setNameStatus('Isimler kaydedildi.')

            const summaryRes = await fetch('/api/admin/bots/pool/summary')

            if (summaryRes.ok) setPoolSummary(await summaryRes.json())

        } catch (err: unknown) {

            const message = err instanceof Error ? err.message : 'Bir hata oluştu.'

            setNameStatus(message)

        }

    }

    const handleAutoCreate = async () => {

        setAutoCreating(true)

        setError(null)

        try {

            const cities = autoCities

                .split(/[\n,]/)

                .map((c) => c.trim())

                .filter(Boolean)

            const res = await fetch('/api/admin/bots/auto-create', {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    count: autoCount,

                    female_percent: autoFemalePercent,

                    age_min: autoAgeMin,

                    age_max: autoAgeMax,

                    city_mode: autoCityMode,

                    cities,

                    fixed_city: autoFixedCity,

                    use_photo_pool: autoUsePhotoPool,

                    use_bio_pool: autoUseBioPool,

                    group_id: autoGroupId || null,

                    active_hours: parseActiveHours(autoActiveHoursRaw || '', autoActiveHoursUseTr),

                }),

            })

            if (!res.ok) throw new Error(await res.text())

            await load()

        } catch (err: unknown) {

            const message = err instanceof Error ? err.message : 'Bir hata oluştu.'

            setError(message)

        } finally {

            setAutoCreating(false)

        }

    }

    const handleCreateGroup = async () => {

        if (!groupName.trim()) return

        await createBotGroup(groupName.trim(), groupPrompt.trim())

        setGroupName('')

        setGroupPrompt('')

        setGroupOpen(false)

        await load()

    }

    const runMaintenance = async () => {

        await fetch('/api/admin/bots/maintenance', { method: 'POST' })

    }

    const UygulaBulkGroup = async () => {

        const ids = Object.entries(selected).filter(([, v]) => v).map(([id]) => id)

        if (ids.length === 0 || !bulkGroupId) return

        for (const id of ids) {

            const bot = bots.find((b) => b.id === id)

            const current = bot?.bot_configs?.behavior_settings || {}

            await postJson('/api/admin/bots/update', {

                bot_id: id,

                config: {

                    behavior_settings: {

                        ...current,

                        group_id: bulkGroupId,

                    },

                },

            })

        }

        setSelected({})

        await load()

    }

    const cityOptions = autoCities

        .split(/[\n,]/)

        .map((c) => c.trim())

        .filter(Boolean)

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

                    <h1 className="text-2xl font-bold">Botlar</h1>

                    <p className="text-sm text-slate-700">Bot oluşturma, havuz ve bakım</p>

                </div>

                <div className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">

                    Bot Yönetimi

                </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

                <div className="glass-panel p-4 rounded-xl border border-slate-200">

                    <div className="text-xs uppercase tracking-[0.2em] text-slate-600">Toplam</div>

                    <div className="text-2xl font-semibold text-slate-800 mt-2">{totalBots}</div>

                    <div className="text-xs text-slate-600">Bot</div>

                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-200">

                    <div className="text-xs uppercase tracking-[0.2em] text-slate-600">Aktif</div>

                    <div className="text-2xl font-semibold text-slate-800 mt-2">{activeBots}</div>

                    <div className="text-xs text-slate-600">Bot</div>

                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-200">

                    <div className="text-xs uppercase tracking-[0.2em] text-slate-600">Gruplar</div>

                    <div className="text-2xl font-semibold text-slate-800 mt-2">{groupCount}</div>

                    <div className="text-xs text-slate-600">Bot Grubu</div>

                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-200">

                    <div className="text-xs uppercase tracking-[0.2em] text-slate-600">Havuz</div>

                    <div className="text-sm text-slate-700 mt-2">Foto: {poolPhotoCount}</div>

                    <div className="text-sm text-slate-700">Bio: {poolBioCount}</div>

                    <div className="text-sm text-slate-700">İsim: {poolNameCount}</div>

                </div>

            </div>

            <div id="bot-create" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-3">

                <div className="text-xs uppercase tracking-[0.2em] text-slate-600">Sayfa İçeriği</div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">

                    <a className="px-3 py-2 rounded-lg bg-white border border-slate-200" href="#bot-create">Bot Oluştur</a>

                    <a className="px-3 py-2 rounded-lg bg-white border border-slate-200" href="#bot-auto">Otomatik Toplu Bot</a>

                    <a className="px-3 py-2 rounded-lg bg-white border border-slate-200" href="#name-pool">İsim Havuzu</a>

                    <a className="px-3 py-2 rounded-lg bg-white border border-slate-200" href="#bulk-import">Toplu İçe Aktar</a>

                    <a className="px-3 py-2 rounded-lg bg-white border border-slate-200" href="#media-pool">Foto/Bio Havuzu</a>

                    <a className="px-3 py-2 rounded-lg bg-white border border-slate-200" href="#bulk-group">Toplu Grup Ata</a>

                    <a className="px-3 py-2 rounded-lg bg-white border border-slate-200" href="#bot-list">Bot Listesi</a>

                </div>

            </div>

            {error && (

                <div className="p-3 text-sm text-red-900 bg-red-100 border border-red-200 rounded-lg">

                    {error}

                </div>

            )}

            <div id="bot-auto" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-3">

                <div className="text-xs uppercase tracking-[0.2em] text-slate-600">Bot Oluşturma</div>

                <div className="flex items-center justify-between">

                    <h2 className="text-lg font-semibold">Bot Oluştur</h2>

                    <div className="flex items-center gap-2">

                        <button onClick={() => setGroupOpen(true)} className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">

                            Yeni Grup

                        </button>

                        <button onClick={runMaintenance} className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">

                            Bakım Çalıştır

                        </button>

                    </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Ad</div>

                        <input

                            value={form.name}

                            onChange={(e) => setForm({ ...form, name: e.target.value })}

                            placeholder="ad"

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Yaş</div>

                        <input

                            type="number"

                            value={form.age}

                            onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}

                            placeholder="yas"

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Cinsiyet</div>

                        <input

                            value={form.gender}

                            onChange={(e) => setForm({ ...form, gender: e.target.value })}

                            placeholder="cinsiyet"

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Şehir</div>

                        <input

                            value={form.city}

                            onChange={(e) => setForm({ ...form, city: e.target.value })}

                            placeholder="sehir"

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Biyografi</div>

                        <input

                            value={form.bio}

                            onChange={(e) => setForm({ ...form, bio: e.target.value })}

                            placeholder="biyografi"

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Foto URL (virgül ile)</div>

                        <input

                            value={form.photos}

                            onChange={(e) => setForm({ ...form, photos: e.target.value })}

                            placeholder="Foto URL (virgül ile)"

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        />

                    </div>

                </div>

                <div className="grid grid-cols-2 gap-3">

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Ton</div>

                        <select

                            value={form.tone}

                            onChange={(e) => setForm({ ...form, tone: e.target.value })}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        >

                            <option value="playful">Eğlenceli</option>

                            <option value="flirty">Flörtöz</option>

                            <option value="serious">Ciddi</option>

                        </select>

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Dil modu</div>

                        <select

                            value={form.languageMode}

                            onChange={(e) => setForm({ ...form, languageMode: e.target.value })}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        >

                            <option value="auto">Oto</option>

                            <option value="tr">TR</option>

                            <option value="en">EN</option>

                        </select>

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Oto-beğeni oranı (%)</div>

                        <input

                            type="number"

                            value={form.autoLikeRate}

                            onChange={(e) => setForm({ ...form, autoLikeRate: Number(e.target.value) })}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                            placeholder="Oto-beğen %"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Etkileşim yoğunluğu</div>

                        <select

                            value={form.engagement}

                            onChange={(e) => setForm({ ...form, engagement: e.target.value })}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        >

                            <option value="low">Düşük</option>

                            <option value="medium">Orta</option>

                            <option value="high">Yüksek</option>

                        </select>

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Cooldown (saat)</div>

                        <input

                            type="number"

                            value={form.cooldownHours}

                            onChange={(e) => setForm({ ...form, cooldownHours: Number(e.target.value) })}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                            placeholder="Bekleme saat"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Aktif saatler</div>

                        <input

                            value={form.activeHoursRaw}

                            onChange={(e) => setForm({ ...form, activeHoursRaw: e.target.value })}

                            className="glass-input w-full px-4 py-2.5 text-sm"

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

                            Genişletilmiş: {formatHours(parseActiveHoursInput(form.activeHoursRaw || '')) || '-'}

                        </div>

                        {activeHoursUseTr && (

                            <div className="text-[10px] text-slate-500">

                                UTC kar?l??: {formatHours(toUtcHours(parseActiveHoursInput(form.activeHoursRaw || ''))) || '-'}

                            </div>

                        )}

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Cevap gecikmesi min (sn)</div>

                        <input

                            type="number"

                            value={form.delayMin}

                            onChange={(e) => setForm({ ...form, delayMin: Number(e.target.value) })}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                            placeholder="Min gecikme"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Cevap gecikmesi max (sn)</div>

                        <input

                            type="number"

                            value={form.delayMax}

                            onChange={(e) => setForm({ ...form, delayMax: Number(e.target.value) })}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                            placeholder="Max gecikme"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Profil rotasyonu (dk)</div>

                        <input

                            type="number"

                            value={form.rotationMinutes}

                            onChange={(e) => setForm({ ...form, rotationMinutes: Number(e.target.value) })}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                            placeholder="Rotasyon dakika"

                        />

                    </div>

                </div>

                <div className="flex flex-wrap gap-4">

                    <label className="text-xs flex items-center gap-2">

                        <input

                            type="checkbox"

                            checked={form.allowInitiate}

                            onChange={(e) => setForm({ ...form, allowInitiate: e.target.checked })}

                        />

                        Başlatmaya izin

                    </label>

                    <label className="text-xs flex items-center gap-2">

                        <input

                            type="checkbox"

                            checked={form.autoStory}

                            onChange={(e) => setForm({ ...form, autoStory: e.target.checked })}

                        />

                        Oto Hikaye

                    </label>

                    <label className="text-xs flex items-center gap-2">

                        <input

                            type="checkbox"

                            checked={form.useGlobal}

                            onChange={(e) => setForm({ ...form, useGlobal: e.target.checked })}

                        />

                        Global Ayarlar

                    </label>

                </div>

                <div className="text-sm text-slate-700">Bot özel prompt</div>

                <textarea

                    value={form.prompt}

                    onChange={(e) => setForm({ ...form, prompt: e.target.value })}

                    placeholder="Bot Özel prompt"

                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30 min-h-[90px]"

                />

                <div className="text-sm text-slate-700">Grup</div>

                <select

                    value={form.groupId}

                    onChange={(e) => setForm({ ...form, groupId: e.target.value })}

                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                >

                    <option value="">Grup yok</option>

                    {groups.map((g) => (

                        <option key={g.id} value={g.id}>{g.name}</option>

                    ))}

                </select>

                <button

                    onClick={handleCreate}

                    disabled={creating}

                    className="w-full py-3 rounded-xl font-semibold admin-primary-btn"

                >

                    {creating ? 'Oluşturuluyor...' : 'Bot Oluştur'}

                </button>

            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-3">

                <div className="flex items-center justify-between">

                    <h2 className="font-semibold">Otomatik Toplu Bot</h2>

                    {poolSummary && (

                        <div className="text-xs text-slate-600">

                            Foto havuzu: {poolSummary.photo_count || 0} · Bio havuzu: {poolSummary.bio_count || 0} · İsim havuzu: {poolSummary.name_count || 0}

                        </div>

                    )}

                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Adet</div>

                        <input

                            type="number"

                            value={autoCount}

                            onChange={(e) => setAutoCount(Number(e.target.value))}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Kadın yüzdesi</div>

                        <input

                            type="number"

                            value={autoFemalePercent}

                            onChange={(e) => setAutoFemalePercent(Number(e.target.value))}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Yaş aralığı</div>

                        <div className="flex gap-2">

                            <input

                                type="number"

                                value={autoAgeMin}

                                onChange={(e) => setAutoAgeMin(Number(e.target.value))}

                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                                placeholder="Min"

                            />

                            <input

                                type="number"

                                value={autoAgeMax}

                                onChange={(e) => setAutoAgeMax(Number(e.target.value))}

                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                                placeholder="Max"

                            />

                        </div>

                    </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Şehir modu</div>

                        <select

                            value={autoCityMode}

                            onChange={(e) => setAutoCityMode(e.target.value === 'fixed' ? 'fixed' : 'random')}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        >

                            <option value="random">Rastgele</option>

                            <option value="fixed">Sabit</option>

                        </select>

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Grup</div>

                        <select

                            value={autoGroupId}

                            onChange={(e) => setAutoGroupId(e.target.value)}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        >

                            <option value="">Grup yok</option>

                            {groups.map((g) => (

                                <option key={g.id} value={g.id}>{g.name}</option>

                            ))}

                        </select>

                    </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <div className="space-y-1">

                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Aktif saatler</div>

                        <input

                            value={autoActiveHoursRaw}

                            onChange={(e) => setAutoActiveHoursRaw(e.target.value)}

                            className="glass-input w-full px-4 py-2.5 text-sm"

                            placeholder="Örn: 02:00, 08:00 veya 10:00-23:00"

                        />

                        <label className="flex items-center gap-2 text-xs text-slate-600">

                            <input

                                type="checkbox"

                                checked={autoActiveHoursUseTr}

                                onChange={(e) => setAutoActiveHoursUseTr(e.target.checked)}

                            />

                            TR saatine göre gir (UTC+3)

                        </label>

                        <div className="text-[10px] text-slate-500">

                            Genişletilmiş: {formatHours(parseActiveHoursInput(autoActiveHoursRaw || '')) || '-'}

                        </div>

                        {autoActiveHoursUseTr && (

                            <div className="text-[10px] text-slate-500">

                                UTC kar?l??: {formatHours(toUtcHours(parseActiveHoursInput(autoActiveHoursRaw || ''))) || '-'}

                            </div>

                        )}

                    </div>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Şehir listesi (her satır bir Şehir)</div>

                        <textarea

                            value={autoCities}

                            onChange={(e) => setAutoCities(e.target.value)}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30 min-h-[90px]"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Sabit Şehir</div>

                        {cityOptions.length > 0 ? (

                            <select

                                value={autoFixedCity || cityOptions[0]}

                                onChange={(e) => setAutoFixedCity(e.target.value)}

                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                                disabled={autoCityMode !== 'fixed'}

                            >

                                {cityOptions.map((c) => (

                                    <option key={c} value={c}>{c}</option>

                                ))}

                            </select>

                        ) : (

                            <input

                                value={autoFixedCity}

                                onChange={(e) => setAutoFixedCity(e.target.value)}

                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                                disabled={autoCityMode !== 'fixed'}

                                placeholder="Sabit Şehir"

                            />

                        )}

                        <div className="text-xs text-slate-500">Rastgele modda Şehir listesi kullanılır.</div>

                    </div>

                </div>

                <div className="flex flex-wrap gap-4">

                    <label className="text-xs flex items-center gap-2">

                        <input

                            type="checkbox"

                            checked={autoUsePhotoPool}

                            onChange={(e) => setAutoUsePhotoPool(e.target.checked)}

                        />

                        Foto havuzundan kullan

                    </label>

                    <label className="text-xs flex items-center gap-2">

                        <input

                            type="checkbox"

                            checked={autoUseBioPool}

                            onChange={(e) => setAutoUseBioPool(e.target.checked)}

                        />

                        Bio havuzundan kullan

                    </label>

                </div>

                <button

                    onClick={handleAutoCreate}

                    disabled={autoCreating}

                    className="w-full py-3 rounded-xl font-semibold admin-primary-btn"

                >

                    {autoCreating ? 'Oluşturuluyor...' : 'Toplu Oluştur'}

                </button>

            </div>

            <div id="name-pool" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-3">

                <h2 className="font-semibold">İsim Havuzu</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Kadın isimleri (her satır bir isim)</div>

                        <textarea

                            value={nameFemale}

                            onChange={(e) => setNameFemale(e.target.value)}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30 min-h-[140px]"

                        />

                    </div>

                    <div className="space-y-1">

                        <div className="text-sm text-slate-700">Erkek isimleri (her satır bir isim)</div>

                        <textarea

                            value={nameMale}

                            onChange={(e) => setNameMale(e.target.value)}

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30 min-h-[140px]"

                        />

                    </div>

                </div>

                <div className="flex items-center gap-3">

                    <button onClick={handleSaveNames} className="px-4 py-2 rounded-lg admin-primary-btn text-sm">

                        İsimleri Kaydet

                    </button>

                    {nameStatus && <div className="text-xs text-slate-600">{nameStatus}</div>}

                </div>

            </div>

            <div id="bulk-import" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-3">

                <h2 className="font-semibold">Toplu İçe Aktar (JSON)</h2>

                <textarea

                    value={bulkJson}

                    onChange={(e) => setBulkJson(e.target.value)}

                    placeholder='[{"display_name":"Ayla","age":23,"gender":"Female","city":"Istanbul","bio":"...","photos":["..."],"prompt":"...","group_id":null,"active_hours":[2,8]}]'

                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30 min-h-[120px]"

                />

                <div className="text-[10px] text-slate-500">active_hours saat listesi (UTC) olarak girilir: [2,8,14]</div>

                <button

                    onClick={handleBulk}

                    className="w-full py-3 rounded-xl font-semibold admin-primary-btn"

                >

                    Botları İçe Aktar

                </button>

            </div>

            <div id="media-pool" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-3">

                <h2 className="font-semibold">Bot Foto/Bio Havuzu</h2>

                <input

                    type="file"

                    accept=".zip"

                    onChange={(e) => handlePoolZip(e.target.files?.[0] || null)}

                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                />

                <div className="text-xs text-slate-600">

                    Zip içinde `female/` veya `male/` klasörleri olmalidir. Görseller WebP (512/1024) olarak çevrilir.

                </div>

                <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">

                    <select

                        value={poolBioGender}

                        onChange={(e) => setPoolBioGender(e.target.value)}

                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                    >

                        <option value="">Bio cinsiyet: Fark etmez</option>

                        <option value="female">Kadın</option>

                        <option value="male">Erkek</option>

                    </select>

                    <textarea

                        value={poolBios}

                        onChange={(e) => setPoolBios(e.target.value)}

                        placeholder="Her satıra bir bio"

                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30 min-h-[80px]"

                    />

                </div>

                <button onClick={handlePoolBios} className="px-3 py-2 rounded-lg admin-primary-btn text-xs">

                    Biyografileri Kaydet

                </button>

                {poolStatus && <div className="text-xs text-slate-600">{poolStatus}</div>}

            </div>

            <div id="bulk-group" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-3">

                <h2 className="font-semibold">Toplu Grup Ata</h2>

                <div className="flex items-center gap-3">

                    <select

                        value={bulkGroupId}

                        onChange={(e) => setBulkGroupId(e.target.value)}

                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                    >

                        <option value="">Grup seç</option>

                        {groups.map((g) => (

                            <option key={g.id} value={g.id}>{g.name}</option>

                        ))}

                    </select>

                    <button onClick={UygulaBulkGroup} className="px-3 py-2 rounded-lg admin-primary-btn text-xs">

                        Uygula

                    </button>

                </div>

            </div>

            <div id="bot-list" className="space-y-3">

                {bots.map((b) => (

                    <BotRowItem

                        key={b.id}

                        bot={b}

                        selected={!!selected[b.id]}

                        onSelect={(value) => setSelected((prev) => ({ ...prev, [b.id]: value }))}

                    />

                ))}

            </div>

            {groupOpen && (

                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">

                    <div className="glass-panel w-full max-w-lg p-5 rounded-2xl space-y-4 border border-slate-200">

                        <div className="flex items-center justify-between">

                            <div>

                        <h2 className="text-lg font-semibold">Yeni Bot Grubu</h2>

                                <div className="text-xs text-slate-600">Botları kategoriye ayır</div>

                            </div>

                            <button onClick={() => setGroupOpen(false)} className="px-3 py-1 rounded-full bg-white text-xs">

                                Kapat

                            </button>

                        </div>

                        <input

                            value={groupName}

                            onChange={(e) => setGroupName(e.target.value)}

                            placeholder="Grup adı"

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30"

                        />

                        <textarea

                            value={groupPrompt}

                            onChange={(e) => setGroupPrompt(e.target.value)}

                            placeholder="Grup promptu (opsiyonel)"

                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30 min-h-[90px]"

                        />

                        <button

                            onClick={handleCreateGroup}

                            className="w-full py-3 rounded-xl font-semibold admin-primary-btn"

                        >

                            Grubu Kaydet

                        </button>

                    </div>

                </div>

            )}

        </div>

    )

}

function BotRowItem({ bot, selected, onSelect }: { bot: BotRow; selected: boolean; onSelect: (v: boolean) => void }) {

    const [stats, setStats] = useState<{ likes: number; matches: number; messages: number } | null>(null)

    const [loading, setLoading] = useState(false)

    const [expanded, setExpanded] = useState(false)

    const [saving, setSaving] = useState(false)

    const [editActiveHoursUseTr, setEditActiveHoursUseTr] = useState(false)

    const [now, setNow] = useState(() => Date.now())

    const onlineUsers = usePresenceStore((s) => s.onlineUsers)

    const [edit, setEdit] = useState<BotEdit>(() => ({

        display_name: bot.profiles?.display_name || '',

        age: bot.profiles?.age || 0,

        gender: bot.profiles?.gender || '',

        city: bot.profiles?.city || '',

        bio: bot.profiles?.bio || '',

        photos: Array.isArray(bot.profiles?.photos) ? bot.profiles.photos.join(', ') : '',

        coin_balance: Number(bot.coin_balance || 0),

        is_premium: !!bot.is_premium,

        premium_expires_at: bot.premium_expires_at || '',

        role: bot.role || 'bot',

        personality_prompt: bot.bot_configs?.personality_prompt || '',

        tone: bot.bot_configs?.tone || 'playful',

        language_mode: bot.bot_configs?.language_mode || 'auto',

        auto_like_rate: bot.bot_configs?.auto_like_rate || 5,

        engagement_intensity: bot.bot_configs?.engagement_intensity || 'medium',

        cooldown_hours: bot.bot_configs?.cooldown_hours || 72,

        active_hours_raw: Array.isArray(bot.bot_configs?.active_hours)

            ? bot.bot_configs?.active_hours?.map((h) => String(h).padStart(2, '0') + ':00').join(', ')

            : '',

        response_delay_min_s: bot.bot_configs?.response_delay_min_s || 2,

        response_delay_max_s: bot.bot_configs?.response_delay_max_s || 8,

        allow_initiate: bot.bot_configs?.allow_initiate || false,

        auto_story: bot.bot_configs?.auto_story || false,

        profile_rotation_minutes: bot.bot_configs?.profile_rotation_minutes || 0,

        use_global: bot.bot_configs?.use_global !== false,

        active: bot.bot_configs?.behavior_settings?.active !== false,

        group_id: bot.bot_configs?.behavior_settings?.group_id || '',

    }))

    const toLocalInput = (value?: string | null) => {

        if (!value) return ''

        if (value.includes('T') && value.length >= 16 && !value.endsWith('Z')) return value.slice(0, 16)

        const d = new Date(value)

        if (Number.isNaN(d.getTime())) return ''

        const pad = (n: number) => n.toString().padStart(2, '0')

        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

    }

    const fromLocalInput = (value: string) => {

        if (!value) return null

        const d = new Date(value)

        if (Number.isNaN(d.getTime())) return null

        return d.toISOString()

    }

    const loadStats = async () => {

        setLoading(true)

        try {

            const data = await postJson<{ likes: number; matches: number; messages: number }>('/api/admin/bots/stats', {

                bot_id: bot.id,

            })

            setStats({

                likes: data.likes || 0,

                matches: data.matches || 0,

                messages: data.messages || 0,

            })

        } finally {

            setLoading(false)

        }

    }

    const toggleActive = async () => {

        const current = bot.bot_configs?.behavior_settings?.active !== false

        const next = !current

        const data = await postJson<{ ok: boolean; behavior_settings: Record<string, unknown> }>('/api/admin/bots/toggle-active', {

            bot_id: bot.id,

            active: next,

            behavior_settings: bot.bot_configs?.behavior_settings || {},

        })

        if (!bot.bot_configs) {

            bot.bot_configs = { behavior_settings: { active: next } }

        } else {

            bot.bot_configs.behavior_settings = (data?.behavior_settings as Record<string, unknown>) || {

                ...(bot.bot_configs.behavior_settings || {}),

                active: next,

            }

        }

    }

    const toggleUseGlobal = async () => {

        const next = !(bot.bot_configs?.use_global !== false)

        await postJson('/api/admin/bots/toggle-global', { bot_id: bot.id, use_global: next })

        if (!bot.bot_configs) {

            bot.bot_configs = { use_global: next }

        } else {

            bot.bot_configs.use_global = next

        }

    }

    const normalizeActiveHours = (raw: string, useTr: boolean) => parseActiveHoursForSave(raw, useTr)

    const saveQuick = async (patch: Partial<BotEdit>) => {

        const { active_hours_raw, ...rest } = patch

        const payload: Record<string, unknown> = { ...rest }

        if (active_hours_raw !== undefined) {

            payload.active_hours = normalizeActiveHours(active_hours_raw)

        }

        await postJson('/api/admin/bots/update', {

            bot_id: bot.id,

            config: payload,

        })

    }

    const isOnlineFallback = bot.last_active_at ? now - new Date(bot.last_active_at).getTime() < 10 * 60 * 1000 : false

    const isOnline = onlineUsers.has(bot.id) || isOnlineFallback

    useEffect(() => {

        const id = setInterval(() => setNow(Date.now()), 60000)

        return () => clearInterval(id)

    }, [])

    return (

        <div className="glass-panel p-4 rounded-2xl border border-slate-200 space-y-3">

            <div className="flex items-start justify-between gap-4">

                <div className="space-y-2">

                    <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-600">

                        <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} />

                        Seç

                    </label>

                    <div className="flex items-center gap-3">

                        <button

                            type="button"

                            onClick={() => setExpanded((v) => !v)}

                            className="text-base font-semibold text-left"

                        >

                            {bot.profiles?.display_name || bot.email}

                        </button>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>

                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />

                            {isOnline ? 'Çevrim içi' : '?evrimd???'}

                        </span>

                        <button

                            type="button"

                            onClick={() => setExpanded(true)}

                            className="text-[11px] uppercase tracking-[0.18em] text-slate-600 px-2 py-1 rounded-full border border-slate-200 bg-white"

                        >

                            Hızlı Düzenle

                        </button>

                    </div>

                    <div className="text-xs text-slate-600">

                        {bot.profiles?.age} • {bot.profiles?.gender} • {bot.profiles?.city}

                    </div>

                </div>

                <div className="flex items-center gap-2">

                    <button onClick={toggleActive} className="text-xs px-2.5 py-1.5 rounded-full bg-white border border-slate-200">

                        {bot.bot_configs?.behavior_settings?.active === false ? 'Pasif' : 'Aktif'}

                    </button>

                    <button onClick={toggleUseGlobal} className="text-xs px-2.5 py-1.5 rounded-full bg-white border border-slate-200">

                        {bot.bot_configs?.use_global === false ? 'Özel' : 'Global'}

                    </button>

                </div>

            </div>

            <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">

                Prompt: {bot.bot_configs?.personality_prompt?.slice(0, 80) || '—'}

            </div>

            <div className="flex items-center gap-2">

                <button onClick={loadStats} className="text-xs px-2.5 py-1.5 rounded-full bg-white border border-slate-200">

                    {loading ? 'Yükleniyor...' : 'İstatistik Yükle'}

                </button>

                {stats && (

                    <span className="text-xs text-slate-600">Beğeni {stats.likes} • Eşleşme {stats.matches} • Mesaj {stats.messages}</span>

                )}

            </div>

            <div className="grid grid-cols-2 gap-2">

                <div className="space-y-1">

                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-600">Oto-beğeni (%)</div>

                    <input

                        type="number"

                        defaultValue={bot.bot_configs?.auto_like_rate || 5}

                        onBlur={(e) => saveQuick({ auto_like_rate: Number(e.target.value) })}

                        className="bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30 px-3 py-2"

                        placeholder="Örn: 5"

                    />

                </div>

                <div className="space-y-1">

                    <div className="text-[11px] uppercase tracking-[0.14em] text-slate-600">Cooldown (saat)</div>

                    <input

                        type="number"

                        defaultValue={bot.bot_configs?.cooldown_hours || 72}

                        onBlur={(e) => saveQuick({ cooldown_hours: Number(e.target.value) })}

                        className="bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-white/30 px-3 py-2"

                        placeholder="Örn: 72"

                    />

                </div>

            </div>

            {expanded && (

                <div className="mt-3 border-t border-slate-200 pt-3 space-y-3">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Ad</div>

                            <input

                                value={edit.display_name}

                                onChange={(e) => setEdit((prev) => ({ ...prev, display_name: e.target.value }))}

                                placeholder="Ad"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Yaş</div>

                            <input

                                type="number"

                                value={edit.age}

                                onChange={(e) => setEdit((prev) => ({ ...prev, age: Number(e.target.value) }))}

                                placeholder="Yas"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Cinsiyet</div>

                            <input

                                value={edit.gender}

                                onChange={(e) => setEdit((prev) => ({ ...prev, gender: e.target.value }))}

                                placeholder="Cinsiyet"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Şehir</div>

                            <input

                                value={edit.city}

                                onChange={(e) => setEdit((prev) => ({ ...prev, city: e.target.value }))}

                                placeholder="Sehir"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1 md:col-span-2">

                            <div className="text-sm text-slate-700">Foto URL (virgül ile)</div>

                            <input

                                value={edit.photos}

                                onChange={(e) => setEdit((prev) => ({ ...prev, photos: e.target.value }))}

                                placeholder="Foto URL (virgül ile)"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1 md:col-span-2">

                            <div className="text-sm text-slate-700">Biyografi</div>

                            <textarea

                                value={edit.bio}

                                onChange={(e) => setEdit((prev) => ({ ...prev, bio: e.target.value }))}

                                placeholder="Biyografi"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200 min-h-[80px]"

                            />

                        </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Jeton bakiyesi</div>

                            <input

                                type="number"

                                value={edit.coin_balance}

                                onChange={(e) => setEdit((prev) => ({ ...prev, coin_balance: Number(e.target.value) }))}

                                placeholder="Jeton"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Premium</div>

                            <label className="text-xs flex items-center gap-2">

                                <input

                                    type="checkbox"

                                    checked={edit.is_premium}

                                    onChange={(e) => setEdit((prev) => ({ ...prev, is_premium: e.target.checked }))}

                                />

                                Aktif

                            </label>

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Premium bitiş tarihi</div>

                            <input

                                type="datetime-local"

                                value={toLocalInput(edit.premium_expires_at)}

                                onChange={(e) => setEdit((prev) => ({ ...prev, premium_expires_at: e.target.value }))}

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Bot aktif</div>

                            <label className="text-xs flex items-center gap-2">

                                <input

                                    type="checkbox"

                                    checked={edit.active}

                                    onChange={(e) => setEdit((prev) => ({ ...prev, active: e.target.checked }))}

                                />

                                Aktif

                            </label>

                        </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Ton</div>

                            <select

                                value={edit.tone}

                                onChange={(e) => setEdit((prev) => ({ ...prev, tone: e.target.value }))}

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            >

                                <option value="playful">Eğlenceli</option>

                                <option value="flirty">Flörtöz</option>

                                <option value="serious">Ciddi</option>

                            </select>

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Dil modu</div>

                            <select

                                value={edit.language_mode}

                                onChange={(e) => setEdit((prev) => ({ ...prev, language_mode: e.target.value }))}

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            >

                                <option value="auto">Oto</option>

                                <option value="tr">TR</option>

                                <option value="en">EN</option>

                            </select>

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Oto-beğeni oranı (%)</div>

                            <input

                                type="number"

                                value={edit.auto_like_rate}

                                onChange={(e) => setEdit((prev) => ({ ...prev, auto_like_rate: Number(e.target.value) }))}

                                placeholder="Oto-beğen %"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Etkileşim yoğunluğu</div>

                            <select

                                value={edit.engagement_intensity}

                                onChange={(e) => setEdit((prev) => ({ ...prev, engagement_intensity: e.target.value }))}

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            >

                                <option value="low">Düşük</option>

                                <option value="medium">Orta</option>

                                <option value="high">Yüksek</option>

                            </select>

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Cooldown (saat)</div>

                            <input

                                type="number"

                                value={edit.cooldown_hours}

                                onChange={(e) => setEdit((prev) => ({ ...prev, cooldown_hours: Number(e.target.value) }))}

                                placeholder="Bekleme saat"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1">

                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Aktif saatler</div>

                            <input

                                value={edit.active_hours_raw || ''}

                                onChange={(e) => setEdit((prev) => ({ ...prev, active_hours_raw: e.target.value }))}

                                className="glass-input w-full px-3 py-2 text-sm"

                                placeholder="Örn: 02:00, 08:00 veya 10:00-23:00"

                            />

                            <label className="flex items-center gap-2 text-xs text-slate-600">

                                <input

                                    type="checkbox"

                                    checked={editActiveHoursUseTr}

                                    onChange={(e) => setEditActiveHoursUseTr(e.target.checked)}

                                />

                                TR saatine göre gir (UTC+3)

                            </label>

                            <div className="text-[10px] text-slate-500">

                                Genişletilmiş: {formatHours(parseActiveHoursInput(edit.active_hours_raw || '')) || '-'}

                            </div>

                            {editActiveHoursUseTr && (

                                <div className="text-[10px] text-slate-500">

                                    UTC kar?l??: {formatHours(toUtcHours(parseActiveHoursInput(edit.active_hours_raw || ''))) || '-'}

                                </div>

                            )}

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Cevap gecikmesi min (sn)</div>

                            <input

                                type="number"

                                value={edit.response_delay_min_s}

                                onChange={(e) => setEdit((prev) => ({ ...prev, response_delay_min_s: Number(e.target.value) }))}

                                placeholder="Min gecikme"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Cevap gecikmesi max (sn)</div>

                            <input

                                type="number"

                                value={edit.response_delay_max_s}

                                onChange={(e) => setEdit((prev) => ({ ...prev, response_delay_max_s: Number(e.target.value) }))}

                                placeholder="Max gecikme"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Profil rotasyonu (dk)</div>

                            <input

                                type="number"

                                value={edit.profile_rotation_minutes}

                                onChange={(e) => setEdit((prev) => ({ ...prev, profile_rotation_minutes: Number(e.target.value) }))}

                                placeholder="Rotasyon dakika"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                        <div className="space-y-1">

                            <div className="text-sm text-slate-700">Grup ID</div>

                            <input

                                value={edit.group_id}

                                onChange={(e) => setEdit((prev) => ({ ...prev, group_id: e.target.value }))}

                                placeholder="Grup ID (opsiyonel)"

                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"

                            />

                        </div>

                    </div>

                    <div className="flex flex-wrap gap-4 text-xs">

                        <label className="flex items-center gap-2">

                            <input

                                type="checkbox"

                                checked={edit.allow_initiate}

                                onChange={(e) => setEdit((prev) => ({ ...prev, allow_initiate: e.target.checked }))}

                            />

                            Başlatmaya izin

                        </label>

                        <label className="flex items-center gap-2">

                            <input

                                type="checkbox"

                                checked={edit.auto_story}

                                onChange={(e) => setEdit((prev) => ({ ...prev, auto_story: e.target.checked }))}

                            />

                            Oto Hikaye

                        </label>

                        <label className="flex items-center gap-2">

                            <input

                                type="checkbox"

                                checked={edit.use_global}

                                onChange={(e) => setEdit((prev) => ({ ...prev, use_global: e.target.checked }))}

                            />

                            Global Ayarlar

                        </label>

                    </div>

                    <div className="text-sm text-slate-700">Bot özel prompt</div>

                    <textarea

                        value={edit.personality_prompt}

                        onChange={(e) => setEdit((prev) => ({ ...prev, personality_prompt: e.target.value }))}

                        placeholder="Bot Özel prompt"

                        className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200 min-h-[90px]"

                    />

                    <button

                        onClick={async () => {

                            setSaving(true)

                            try {

                                await postJson('/api/admin/bots/update', {

                                    bot_id: bot.id,

                                    profile: {

                                        display_name: edit.display_name,

                                        age: edit.age,

                                        gender: edit.gender,

                                        city: edit.city,

                                        bio: edit.bio,

                                        photos: (edit.photos || '')

                                            .split(',')

                                            .map((p: string) => p.trim())

                                            .filter(Boolean),

                                    },

                                    user: {

                                        coin_balance: Number(edit.coin_balance || 0),

                                        is_premium: !!edit.is_premium,

                                        premium_expires_at: edit.is_premium ? (fromLocalInput(edit.premium_expires_at || '') || null) : null,

                                    },

                                    config: {

                                        personality_prompt: edit.personality_prompt,

                                        tone: edit.tone,

                                        language_mode: edit.language_mode,

                                        auto_like_rate: edit.auto_like_rate,

                                        engagement_intensity: edit.engagement_intensity,

                                        cooldown_hours: edit.cooldown_hours,

                                        active_hours: normalizeActiveHours(edit.active_hours_raw || '', editActiveHoursUseTr),

                                        response_delay_min_s: edit.response_delay_min_s,

                                        response_delay_max_s: edit.response_delay_max_s,

                                        allow_initiate: edit.allow_initiate,

                                        auto_story: edit.auto_story,

                                        profile_rotation_minutes: edit.profile_rotation_minutes,

                                        use_global: edit.use_global,

                                        behavior_settings: {

                                            ...(bot.bot_configs?.behavior_settings || {}),

                                            active: edit.active,

                                            group_id: edit.group_id || null,

                                        },

                                    },

                                })

                            } finally {

                                setSaving(false)

                            }

                        }}

                        disabled={saving}

                        className="w-full py-3 rounded-xl font-semibold admin-primary-btn"

                    >

                        {saving ? 'Kaydediliyor...' : 'Kaydet'}

                    </button>

                </div>

            )}

        </div>

    )

}

