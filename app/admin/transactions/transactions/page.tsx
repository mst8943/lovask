'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type TxRow = {
    id: string
    user_id: string
    amount: number
    type: string
    metadata: Record<string, unknown> | null
    created_at: string
}
const getMetadataValue = (metadata: Record<string, unknown> | null, key: string) => {
    if (!metadata || typeof metadata !== 'object') return null
    const val = (metadata as Record<string, unknown>)[key]
    if (val === null || val === undefined) return null
    return typeof val === 'string' ? val : JSON.stringify(val)
}
const TYPE_LABELS: Record<string, string> = {
    spend: 'Harcama',
    purchase: 'Satın alma',
    refund: 'İade',
    bonus: 'Bonus',
    credit: 'Kredi',
    debit: 'Borç',
}
const REASON_LABELS: Record<string, string> = {
    read_receipts: 'Okundu bilgisi',
    chat_initiation: 'Sohbet baslatma',
    read_receipt_unlock: 'Okundu bilgisi',
    premium: 'Premium',
    boost: 'Boost',
    boost_plus: 'Boost+',
    boost_lite: 'Mini Boost',
    gift: 'Hediye',
    super_like: 'Süper Like',
    like: 'Beğeni',
    message_refund: 'Mesaj iadesi',
}
const labelType = (type: string) => TYPE_LABELS[type] || type
const labelReason = (reason?: string | null) => {
    if (!reason) return '—'
    return REASON_LABELS[reason] || reason.replace(/_/g, ' ')
}
export default function AdminTransactionsPage() {
    const searchParams = useSearchParams()
    const [rows, setRows] = useState<TxRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [riskOnly, setRiskOnly] = useState(false)
    const [largeNegativeOnly, setLargeNegativeOnly] = useState(false)
    const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all')
    const [purchaseOnly, setPurchaseOnly] = useState(false)
    const [direction, setDirection] = useState<'all' | 'in' | 'out'>('all')
    const [now, setNow] = useState(0)
    const [nameMap, setNameMap] = useState<Record<string, string>>({})
    const [matchMap, setMatchMap] = useState<Record<string, { user_a: string; user_b: string }>>({})
    const supabase = useMemo(() => createClient(), [])
    const checkLimit = async (action: string) => {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user?.id) return false
        const { data } = await supabase.rpc('check_admin_rate_limit', {
            p_admin_id: auth.user.id,
            p_action: action,
            p_window_seconds: 60,
            p_max_count: 10,
        })
        return data === true
    }
    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)
        if (error) setError(error.message)
        if (data) {
            const txRows = data as TxRow[]
            setRows(txRows)
            const userIds = Array.from(new Set(txRows.map((r) => r.user_id).filter(Boolean)))
            const matchIds = Array.from(new Set(
                txRows
                    .map((r) => getMetadataValue(r.metadata, 'match_id'))
                    .filter((v): v is string => !!v)
            ))
            const emptyProfilesRes: { data: Array<{ id: string; display_name: string | null }>; error: null } = {
                data: [],
                error: null,
            }
            const emptyMatchesRes: { data: Array<{ id: string; user_a: string; user_b: string }>; error: null } = {
                data: [],
                error: null,
            }
            const [profilesRes, matchesRes] = await Promise.all([
                userIds.length > 0
                    ? supabase.from('profiles').select('id,display_name').in('id', userIds)
                    : Promise.resolve(emptyProfilesRes),
                matchIds.length > 0
                    ? supabase.from('matches').select('id,user_a,user_b').in('id', matchIds)
                    : Promise.resolve(emptyMatchesRes),
            ])
            const nameEntries = new Map<string, string>()
            for (const p of profilesRes.data || []) {
                if (p?.id) nameEntries.set(p.id, p.display_name || p.id)
            }
            const matchEntries: Record<string, { user_a: string; user_b: string }> = {}
            const matchUserIds = new Set<string>()
            for (const m of matchesRes.data || []) {
                if (m?.id) {
                    matchEntries[m.id] = { user_a: m.user_a, user_b: m.user_b }
                    if (m.user_a) matchUserIds.add(m.user_a)
                    if (m.user_b) matchUserIds.add(m.user_b)
                }
            }
            const missingMatchUserIds = Array.from(matchUserIds).filter((id) => !nameEntries.has(id))
            if (missingMatchUserIds.length > 0) {
                const { data: matchProfiles } = await supabase
                    .from('profiles')
                    .select('id,display_name')
                    .in('id', missingMatchUserIds)
                for (const p of matchProfiles || []) {
                    if (p?.id) nameEntries.set(p.id, p.display_name || p.id)
                }
            }
            setNameMap(Object.fromEntries(nameEntries.entries()))
            setMatchMap(matchEntries)
        }
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    useEffect(() => {
        const id = setTimeout(() => setNow(Date.now()), 0)
        return () => clearTimeout(id)
    }, [dateFilter, direction, largeNegativeOnly, purchaseOnly, query, riskOnly, typeFilter])
    useEffect(() => {
        const id = setTimeout(() => {
            const q = searchParams.get('q')
            if (q) setQuery(q)
        }, 0)
        return () => clearTimeout(id)
    }, [searchParams])
    const formatAmount = (amount: number) => {
        const value = Math.abs(amount)
        return `${amount < 0 ? '-' : ''}${new Intl.NumberFormat('tr-TR').format(value)}`
    }
    const shortId = (id?: string | null) => {
        if (!id) return '—'
        if (id.length <= 10) return id
        return `${id.slice(0, 6)}…${id.slice(-4)}`
    }
    const getUserLabel = (id?: string | null) => {
        if (!id) return '—'
        return nameMap[id] || shortId(id)
    }
    const getMatchLabel = (matchId?: string | null) => {
        if (!matchId) return '—'
        const match = matchMap[matchId]
        if (!match) return shortId(matchId)
        const left = getUserLabel(match.user_a)
        const right = getUserLabel(match.user_b)
        return `${left} ↔ ${right}`
    }
    const filtered = useMemo(() => rows.filter((r) => {
        const q = query.trim().toLowerCase()
        const reason = getMetadataValue(r.metadata, 'reason') || ''
        const matchId = getMetadataValue(r.metadata, 'match_id') || ''
        const matchQuery = !q || [r.user_id, r.type, r.id, reason, matchId].some((v) => (v || '').toLowerCase().includes(q))
        const matchType = typeFilter === 'all' || r.type === typeFilter
        if (!matchQuery || !matchType) return false
        const amount = Math.abs(Number(r.amount || 0))
        if (riskOnly && amount < 500) return false
        if (largeNegativeOnly && r.amount >= 0) return false
        if (purchaseOnly && r.type !== 'purchase') return false
        if (direction === 'in' && r.amount <= 0) return false
        if (direction === 'out' && r.amount >= 0) return false
        if (dateFilter !== 'all') {
            const days = dateFilter === '7d' ? 7 : 30
            const cutoff = now - days * 24 * 60 * 60 * 1000
            if (new Date(r.created_at).getTime() < cutoff) return false
        }
        return true
    }), [dateFilter, direction, largeNegativeOnly, now, purchaseOnly, query, riskOnly, rows, typeFilter])
    const types = Array.from(new Set(rows.map((r) => r.type))).filter(Boolean)
    const totalIn = filtered.filter((r) => r.amount > 0).reduce((acc, r) => acc + r.amount, 0)
    const totalOut = filtered.filter((r) => r.amount < 0).reduce((acc, r) => acc + r.amount, 0)
    const net = totalIn + totalOut
    const avgAmount = filtered.length > 0 ? filtered.reduce((acc, r) => acc + r.amount, 0) / filtered.length : 0
    const maxAmount = filtered.reduce((max, r) => Math.max(max, Math.abs(r.amount)), 0)
    const topReasons = useMemo(() => {
        const counts = new Map<string, number>()
        filtered.forEach((row) => {
            const reason = getMetadataValue(row.metadata, 'reason') || 'unknown'
            counts.set(reason, (counts.get(reason) || 0) + 1)
        })
        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3)
    }, [filtered])
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
                    <h1 className="text-2xl font-bold">Islemler</h1>
                    <p className="text-sm text-slate-500">Jeton ve odeme hareketleri</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                    Finans
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-xs text-slate-500">Toplam kayıt</div>
                    <div className="text-xl font-semibold">{filtered.length}</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-xs text-slate-500">Toplam gelir</div>
                    <div className="text-xl font-semibold text-emerald-700">
                        +{new Intl.NumberFormat('tr-TR').format(totalIn)}
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-xs text-slate-500">Toplam gider</div>
                    <div className="text-xl font-semibold text-rose-300">
                        {new Intl.NumberFormat('tr-TR').format(totalOut)}
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-xs text-slate-500">Net</div>
                    <div className={`text-xl font-semibold ${net >= 0 ? 'text-emerald-700' : 'text-rose-300'}`}>
                        {new Intl.NumberFormat('tr-TR').format(net)}
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-xs text-slate-500">Ortalama</div>
                    <div className="text-xl font-semibold">
                        {new Intl.NumberFormat('tr-TR').format(Math.round(avgAmount))}
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-xs text-slate-500">Max Islem</div>
                    <div className="text-xl font-semibold">
                        {new Intl.NumberFormat('tr-TR').format(Math.round(maxAmount))}
                    </div>
                </div>
            </div>
            <div className="glass-panel p-4 rounded-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                    <button
                        onClick={() => void load()}
                        className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                    >
                        Yenile
                    </button>
                    <button
                        onClick={() => {
                            const header = ['id', 'user_id', 'type', 'amount', 'reason', 'match_id', 'created_at']
                            const lines = filtered.map((r) => {
                                const reason = getMetadataValue(r.metadata, 'reason') || ''
                                const matchId = getMetadataValue(r.metadata, 'match_id') || ''
                                return [r.id, r.user_id, r.type, r.amount, reason, matchId, r.created_at]
                                    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                                    .join(',')
                            })
                            const csv = [header.join(','), ...lines].join('\n')
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                            const url = URL.createObjectURL(blob)
                            const link = document.createElement('a')
                            link.href = url
                            link.download = `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`
                            link.click()
                            URL.revokeObjectURL(url)
                        }}
                        className="px-3 py-1.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200"
                    >
                        CSV
                    </button>
                    <button
                        onClick={() => {
                            setQuery('')
                            setTypeFilter('all')
                            setRiskOnly(false)
                            setLargeNegativeOnly(false)
                            setDateFilter('all')
                            setPurchaseOnly(false)
                            setDirection('all')
                        }}
                        className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                    >
                        Filtreleri temizle
                    </button>
                    <button
                        onClick={() => setDateFilter('all')}
                        className={`px-3 py-1.5 rounded-full border ${dateFilter === 'all' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        Tum zaman
                    </button>
                    <button
                        onClick={() => setDateFilter('7d')}
                        className={`px-3 py-1.5 rounded-full border ${dateFilter === '7d' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        7 gun
                    </button>
                    <button
                        onClick={() => setDateFilter('30d')}
                        className={`px-3 py-1.5 rounded-full border ${dateFilter === '30d' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        30 gun
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ID, kullanici, reason, match"
                        className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    >
                        <option value="all">Tüm türler</option>
                        {types.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                    <button
                        onClick={() => setRiskOnly((prev) => !prev)}
                        className={`px-3 py-1.5 rounded-full border ${riskOnly ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        Yüksek tutar (&gt;= 500)
                    </button>
                    <button
                        onClick={() => setLargeNegativeOnly((prev) => !prev)}
                        className={`px-3 py-1.5 rounded-full border ${largeNegativeOnly ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        Yüksek iade/negatif
                    </button>
                    <button
                        onClick={() => setPurchaseOnly((prev) => !prev)}
                        className={`px-3 py-1.5 rounded-full border ${purchaseOnly ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        Sadece satın alma
                    </button>
                    <button
                        onClick={() => {
                            setRiskOnly(true)
                            setLargeNegativeOnly(true)
                        }}
                        className="px-3 py-1.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200"
                    >
                        Risk preset
                    </button>
                    <button
                        onClick={() => setDirection('in')}
                        className={`px-3 py-1.5 rounded-full border ${direction === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        Pozitif
                    </button>
                    <button
                        onClick={() => setDirection('out')}
                        className={`px-3 py-1.5 rounded-full border ${direction === 'out' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        Negatif
                    </button>
                    <button
                        onClick={() => setDirection('all')}
                        className={`px-3 py-1.5 rounded-full border ${direction === 'all' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        Tum
                    </button>
                </div>
                {topReasons.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        <span className="uppercase tracking-wider">Top reason</span>
                        {topReasons.map(([reason, count]) => (
                            <span key={reason} className="px-2 py-1 rounded-full border border-slate-200 bg-white">
                                {labelReason(reason)} · {count}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            {error && (
                <div className="p-3 text-sm text-red-900 bg-red-100 border border-red-200 rounded-lg">
                    {error}
                </div>
            )}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1fr_1.3fr_1.2fr_1.1fr_1fr_1.2fr] gap-0 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-white">
                    <div className="px-4 py-3">Tür</div>
                    <div className="px-4 py-3">Sebep</div>
                    <div className="px-4 py-3">Eslestirme ID</div>
                    <div className="px-4 py-3">Kullanıcı ID</div>
                    <div className="px-4 py-3">Tutar</div>
                    <div className="px-4 py-3">Tarih</div>
                </div>
                <div className="divide-y divide-white/5">
                    {filtered.map((r) => {
                        const reason = getMetadataValue(r.metadata, 'reason')
                        const matchId = getMetadataValue(r.metadata, 'match_id')
                        return (
                            <div key={r.id} className="grid grid-cols-[1fr_1.3fr_1.2fr_1.1fr_1fr_1.2fr] gap-0 text-sm">
                                <div className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white border border-slate-200">
                                        {labelType(r.type)}
                                    </span>
                                    {r.amount < 0 && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-200 border border-rose-500/30">
                                            Negatif
                                        </span>
                                    )}
                                    {Math.abs(r.amount) >= 500 && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-200 border border-amber-500/30">
                                            High
                                        </span>
                                    )}
                                </div>
                                <div className="px-4 py-3 text-xs text-slate-600 break-words">
                                    {labelReason(reason)}
                                </div>
                                <div className="px-4 py-3 text-xs text-slate-600 break-words">
                                    <div className="text-slate-600">{getMatchLabel(matchId)}</div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        {shortId(matchId)}
                                        {matchId && (
                                            <button
                                                onClick={() => navigator.clipboard.writeText(matchId)}
                                                className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10px]"
                                            >
                                                Kopyala
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="px-4 py-3 text-xs text-slate-600 break-words">
                                    <div className="text-slate-600">{getUserLabel(r.user_id)}</div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        {shortId(r.user_id)}
                                        {r.user_id && (
                                            <button
                                                onClick={() => navigator.clipboard.writeText(r.user_id)}
                                                className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10px]"
                                            >
                                                Kopyala
                                            </button>
                                        )}
                                        {r.user_id && (
                                            <a
                                                href={`/admin/users?q=${r.user_id}`}
                                                className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10px]"
                                            >
                                                Profil
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className={`px-4 py-3 font-semibold ${r.amount >= 0 ? 'text-emerald-700' : 'text-rose-300'}`}>
                                    {formatAmount(r.amount)}
                                </div>
                            <div className="px-4 py-3 text-xs text-slate-500">
                                {new Date(r.created_at).toLocaleString()}
                                <div className="text-[10px] text-slate-500">
                                    <button
                                        onClick={() => navigator.clipboard.writeText(r.id)}
                                        className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10px] mt-1"
                                    >
                                        Islem ID kopyala
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const ok = window.confirm('Refund case acilsin mi?')
                                            if (!ok) return
                                            if (!(await checkLimit('refund_create'))) return
                                            await supabase.from('refunds').insert({
                                                transaction_id: r.id,
                                                user_id: r.user_id,
                                                amount: r.amount,
                                                reason: 'manual',
                                                status: 'open',
                                            })
                                        }}
                                        className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10px] mt-1 ml-2"
                                    >
                                        Refund case
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const ok = window.confirm('Chargeback case acilsin mi?')
                                            if (!ok) return
                                            if (!(await checkLimit('chargeback_create'))) return
                                            await supabase.from('chargebacks').insert({
                                                transaction_id: r.id,
                                                user_id: r.user_id,
                                                amount: r.amount,
                                                reason: 'manual',
                                                status: 'open',
                                            })
                                        }}
                                        className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10px] mt-1 ml-2"
                                    >
                                        Chargeback
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
                </div>
            </div>
            {filtered.length === 0 && (
                <div className="text-sm text-slate-500">Islem yok.</div>
            )}
        </div>
    )
}