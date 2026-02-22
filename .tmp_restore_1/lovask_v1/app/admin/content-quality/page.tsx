'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type ProfileRow = {
    id: string
    display_name: string | null
    bio: string | null
    city: string | null
    photos: unknown
    interests: string[] | null
    hide_from_discovery: boolean | null
    updated_at: string
}
const parsePhotos = (raw: unknown) => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.filter(Boolean)
    if (typeof raw === 'string') {
        try {
            const arr = JSON.parse(raw)
            return Array.isArray(arr) ? arr.filter(Boolean) : []
        } catch {
            return []
        }
    }
    return []
}
export default function AdminContentQualityPage() {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<ProfileRow[]>([])
    const [filter, setFilter] = useState<'all' | 'low'>('low')
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('profiles')
            .select('id,display_name,bio,city,photos,interests,hide_from_discovery,updated_at')
            .order('updated_at', { ascending: false })
            .limit(500)
        setRows((data || []) as ProfileRow[])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const score = (row: ProfileRow) => {
        const photos = parsePhotos(row.photos).length
        const bioLen = (row.bio || '').trim().length
        const interests = row.interests?.length || 0
        let s = 0
        if (photos >= 2) s += 40
        if (bioLen >= 40) s += 30
        if (interests >= 3) s += 20
        if ((row.city || '').trim()) s += 10
        return s
    }
    const filtered = rows.filter((r) => {
        if (filter === 'all') return true
        return score(r) < 60
    })
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
                    <h1 className="text-2xl font-bold">İçerik Kalitesi</h1>
                    <p className="text-sm text-gray-400">Düşük kaliteli profiller</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setFilter('low')} className={`text-xs px-3 py-1 rounded-full border ${filter === 'low' ? 'bg-pink-500/20 text-pink-200 border-pink-500/40' : 'bg-white/10 text-gray-300 border-white/10'}`}>
                        Düşük
                    </button>
                    <button onClick={() => setFilter('all')} className={`text-xs px-3 py-1 rounded-full border ${filter === 'all' ? 'bg-pink-500/20 text-pink-200 border-pink-500/40' : 'bg-white/10 text-gray-300 border-white/10'}`}>
                        Tümü
                    </button>
                    <button onClick={() => void load()} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                        Yenile
                    </button>
                </div>
            </div>
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.8fr] gap-0 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10 bg-white/5">
                    <div className="px-4 py-3">Profil</div>
                    <div className="px-4 py-3">Skor</div>
                    <div className="px-4 py-3">Medya</div>
                    <div className="px-4 py-3">Aksiyon</div>
                </div>
                <div className="divide-y divide-white/5">
                    {filtered.map((r) => {
                        const photos = parsePhotos(r.photos).length
                        const s = score(r)
                        return (
                            <div key={r.id} className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.8fr] gap-0 text-sm">
                                <div className="px-4 py-3 text-xs text-gray-300">
                                    <div className="font-semibold">{r.display_name || r.id}</div>
                                    <div className="text-[10px] text-gray-500">{r.city || '—'}</div>
                                </div>
                                <div className="px-4 py-3 text-xs text-gray-300">{s}</div>
                                <div className="px-4 py-3 text-xs text-gray-300">{photos} foto</div>
                                <div className="px-4 py-3 flex items-center gap-2 text-xs">
                                    <button
                                        onClick={async () => {
                                            await supabase.from('profiles').update({ hide_from_discovery: !r.hide_from_discovery }).eq('id', r.id)
                                            await load()
                                        }}
                                        className="px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700"
                                    >
                                        {r.hide_from_discovery ? 'Göster' : 'Gizle'}
                                    </button>
                                    <a href={`/admin/users?q=${r.id}`} className="px-2 py-1 rounded-full border border-white/10 bg-white/5 text-gray-300">Profil</a>
                                </div>
                            </div>
                        )
                    })}
                    {filtered.length === 0 && (
                        <div className="px-4 py-6 text-xs text-gray-500">Kayıt yok</div>
                    )}
                </div>
            </div>
        </div>
    )
}