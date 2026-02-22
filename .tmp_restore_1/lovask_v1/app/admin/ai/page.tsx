'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type AiRow = {
    id: string
    user_id: string | null
    bot_id: string | null
    model: string | null
    tokens_in: number | null
    tokens_out: number | null
    cost_usd: number | null
    created_at: string
}
export default function AdminAiPage() {
    const [rows, setRows] = useState<AiRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState('')
    const supabase = createClient()
    useEffect(() => {
        const load = async () => {
            setLoading(true)
            setError(null)
            const { data, error } = await supabase
                .from('ai_usage')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200)
            if (error) setError(error.message)
            if (data) setRows(data as AiRow[])
            setLoading(false)
        }
        load()
    }, [supabase])
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
                    <h1 className="text-2xl font-bold">AI Kullanimi</h1>
                    <p className="text-sm text-gray-400">Token ve maliyet raporu</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                    Analitik
                </div>
            </div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Model veya kullanıcı ID ile filtrele"
                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10"
            />
            {error && (
                <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg">
                    {error}
                </div>
            )}
            <div className="space-y-3">
                {rows
                    .filter((r) =>
                        [r.model, r.user_id, r.bot_id].some((v) =>
                            (v || '').toLowerCase().includes(query.toLowerCase())
                        )
                    )
                    .map((r) => (
                    <div key={r.id} className="glass-panel p-4 rounded-2xl text-sm border border-white/10">
                        <div className="font-semibold">{r.model || 'model'}</div>
                        <div className="text-xs text-gray-400">
                            {new Date(r.created_at).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            Kullanıcı: {r.user_id || ''}  Bot: {r.bot_id || ''}
                        </div>
                        <div className="text-xs text-gray-300 mt-1">
                            Girdi: {r.tokens_in || 0}  Çıktı: {r.tokens_out || 0}  Maliyet: ${r.cost_usd || 0}
                        </div>
                    </div>
                ))}
                {rows.length === 0 && (
                    <div className="text-sm text-gray-400">AI kullanımı yok.</div>
                )}
            </div>
        </div>
    )
}
