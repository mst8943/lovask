'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Star } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
export default function AdminStoriesPage() {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<Array<{
        id: string
        user_id: string
        media_url: string | null
        media_type: string | null
        highlight: boolean | null
        expires_at: string
        created_at: string
    }>>([])
    const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'highlight'>('all')
    const [now, setNow] = useState(0)
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('stories')
            .select('id,user_id,media_url,media_type,highlight,expires_at,created_at')
            .order('created_at', { ascending: false })
        setRows(data || [])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    useEffect(() => {
        const tick = () => setNow(Date.now())
        const id = setTimeout(tick, 0)
        const timer = setInterval(tick, 60000)
        return () => {
            clearTimeout(id)
            clearInterval(timer)
        }
    }, [])
    const handleDelete = async (id: string) => {
        await supabase.from('stories').delete().eq('id', id)
        await supabase.from('admin_audit_logs').insert({
            action: 'story_delete',
            target_table: 'stories',
            target_id: id,
        })
        await load()
    }
    const toggleHighlight = async (row: {
        id: string
        highlight: boolean | null
    }) => {
        await supabase.from('stories').update({ highlight: !row.highlight }).eq('id', row.id)
        await supabase.from('admin_audit_logs').insert({
            action: 'story_highlight',
            target_table: 'stories',
            target_id: row.id,
            metadata: { highlight: !row.highlight },
        })
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
            <div>
                <h1 className="text-2xl font-bold">Hikaye Yönetimi</h1>
                <p className="text-sm text-gray-400">Hikayeleri yönet, öne çıkar veya sil</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl">
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">Filtre</span>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as typeof filter)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                    >
                        <option value="all">Tümü</option>
                        <option value="active">Aktif</option>
                        <option value="expired">Süresi doldu</option>
                        <option value="highlight">Öne çıkan</option>
                    </select>
                </div>
            </div>
            {rows.filter((r) => {
                const active = new Date(r.expires_at).getTime() > now
                if (filter === 'active') return active
                if (filter === 'expired') return !active
                if (filter === 'highlight') return !!r.highlight
                return true
            }).length === 0 ? (
                <div className="glass-panel p-6 rounded-2xl text-sm text-gray-400">Kayıt yok.</div>
            ) : (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_1.4fr_1fr_0.8fr_1fr] gap-0 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10 bg-white/5">
                        <div className="px-4 py-3">Medya</div>
                        <div className="px-4 py-3">URL</div>
                        <div className="px-4 py-3">Kullanıcı</div>
                        <div className="px-4 py-3">Durum</div>
                        <div className="px-4 py-3">Islem</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {rows
                            .filter((r) => {
                                const active = new Date(r.expires_at).getTime() > now
                                if (filter === 'active') return active
                                if (filter === 'expired') return !active
                                if (filter === 'highlight') return !!r.highlight
                                return true
                            })
                            .map((r) => {
                                const active = new Date(r.expires_at).getTime() > now
                                return (
                                    <div key={r.id} className="grid grid-cols-[1fr_1.4fr_1fr_0.8fr_1fr] gap-0 text-sm">
                                        <div className="px-4 py-3">
                                            <div className="font-semibold">{r.media_type}</div>
                                            <div className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                                        </div>
                                        <div className="px-4 py-3 text-xs text-gray-300 break-words">
                                            {r.media_url}
                                        </div>
                                        <div className="px-4 py-3 text-xs text-gray-300 break-words">
                                            {r.user_id}
                                        </div>
                                        <div className="px-4 py-3 text-xs">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${active ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-900 border-red-200'}`}>
                                                {active ? 'Aktif' : 'S?resi doldu'}
                                            </span>
                                            {r.highlight && (
                                                <div className="mt-1 text-[10px] text-yellow-300">Öne çıkan</div>
                                            )}
                                        </div>
                                        <div className="px-4 py-3 text-xs flex items-center gap-2">
                                            <button
                                                onClick={() => toggleHighlight(r)}
                                                className="px-3 py-2 rounded-lg bg-white/10 text-xs flex items-center gap-2"
                                            >
                                                <Star size={14} className={r.highlight ? 'text-yellow-300' : 'text-gray-300'} />
                                                {r.highlight ? 'Kald?r' : '?ne ??kar'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(r.id)}
                                                className="px-3 py-2 rounded-lg border border-red-200 bg-red-100 text-red-900 text-xs flex items-center gap-2"
                                            >
                                                <Trash2 size={14} />
                                                Sil
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            )}
        </div>
    )
}
