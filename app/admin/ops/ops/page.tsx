'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, AlertTriangle, Clock, ShieldAlert } from 'lucide-react'

type CaseType = 'support' | 'report' | 'verification' | 'payment'

type OpsCase = {
    id: string
    type: CaseType
    title: string
    status: string | null
    userId?: string | null
    created_at: string
    targetUrl: string
}

type Priority = 'P0' | 'P1' | 'P2'

type QueueConfig = {
    label: string
    slaHours: number
    url: string
}

const queueConfig: Record<CaseType, QueueConfig> = {
    support: { label: 'Support', slaHours: 6, url: '/admin/support' },
    report: { label: 'Moderasyon', slaHours: 2, url: '/admin/reports' },
    verification: { label: 'Doğrulama', slaHours: 24, url: '/admin/verifications' },
    payment: { label: 'Ödeme', slaHours: 12, url: '/admin/bank-transfers' },
}

const getSlaDue = (createdAt: string, slaHours: number) => {
    const base = new Date(createdAt).getTime()
    return new Date(base + slaHours * 60 * 60 * 1000)
}

const getPriority = (createdAt: string, slaHours: number): Priority => {
    const due = getSlaDue(createdAt, slaHours).getTime()
    const now = Date.now()
    if (now >= due) return 'P0'
    const totalMs = slaHours * 60 * 60 * 1000
    const remaining = due - now
    if (remaining <= totalMs * 0.2) return 'P1'
    return 'P2'
}

const formatRemaining = (createdAt: string, slaHours: number) => {
    const due = getSlaDue(createdAt, slaHours).getTime()
    const now = Date.now()
    const diff = Math.max(0, due - now)
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}s ${minutes}d`
}

export default function AdminOpsHubPage() {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<OpsCase[]>([])
    const [typeFilter, setTypeFilter] = useState<CaseType | 'all'>('all')
    const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
    const [assignFilter, setAssignFilter] = useState<'all' | 'mine' | 'unassigned'>('all')
    const [showCriticalOnly, setShowCriticalOnly] = useState(false)
    const [sortBy, setSortBy] = useState<'newest' | 'sla'>('newest')
    const [refreshSeconds, setRefreshSeconds] = useState(0)
    const [playbookMap, setPlaybookMap] = useState<Record<string, number>>({})
    const [assignedMap, setAssignedMap] = useState<Record<string, string>>({})
    const [adminId, setAdminId] = useState<string | null>(null)
    const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null)
    const [activity, setActivity] = useState<Array<{ id: string; action: string; target_table: string | null; target_id: string | null; created_at: string }>>([])
    const [search, setSearch] = useState('')
    const [showIncident, setShowIncident] = useState(false)
    const [incidentNote, setIncidentNote] = useState('')
    const [incidentTitle, setIncidentTitle] = useState('')
    const [slaMap, setSlaMap] = useState<Record<string, number>>({})

    useEffect(() => {
        const loadAdmin = async () => {
            const { data } = await supabase.auth.getUser()
            setAdminId(data.user?.id || null)
        }
        void loadAdmin()
    }, [supabase])
    useEffect(() => {
        const loadSla = async () => {
            const { data } = await supabase.from('admin_sla_settings').select('queue,sla_hours')
            if (data) setSlaMap(Object.fromEntries(data.map((r: { queue: string; sla_hours: number }) => [r.queue, r.sla_hours])))
        }
        void loadSla()
    }, [supabase])

    const getQueueSla = (type: CaseType) => {
        if (type === 'support') return slaMap.support || queueConfig.support.slaHours
        if (type === 'report') return slaMap.reports || queueConfig.report.slaHours
        if (type === 'verification') return slaMap.verifications || queueConfig.verification.slaHours
        if (type === 'payment') return slaMap.payments || queueConfig.payment.slaHours
        return queueConfig.support.slaHours
    }

    const load = useCallback(async () => {
        setLoading(true)
        const [supportRes, reportsRes, verRes, transfersRes] = await Promise.all([
            supabase.from('support_tickets').select('id,user_id,subject,status,created_at').order('created_at', { ascending: false }).limit(100),
            supabase.from('reports').select('id,reported_id,reason,status,created_at').order('created_at', { ascending: false }).limit(100),
            supabase.from('user_verifications').select('id,user_id,type,status,created_at').order('created_at', { ascending: false }).limit(100),
            supabase.from('bank_transfers').select('id,user_id,status,created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(100),
        ])

            const support = (supportRes.data || []).map((r: { id: string; user_id: string; subject: string; status: string; created_at: string }) => ({
                id: r.id,
                type: 'support' as const,
                title: r.subject,
                status: r.status,
                userId: r.user_id,
                created_at: r.created_at,
                targetUrl: '/admin/support',
            }))

            const reports = (reportsRes.data || []).map((r: { id: string; reported_id: string; reason: string | null; status: string; created_at: string }) => ({
                id: r.id,
                type: 'report' as const,
                title: r.reason || 'Rapor',
                status: r.status,
                userId: r.reported_id,
                created_at: r.created_at,
                targetUrl: '/admin/reports',
            }))

            const verifications = (verRes.data || []).map((r: { id: string; user_id: string; type: string; status: string; created_at: string }) => ({
                id: r.id,
                type: 'verification' as const,
                title: `Doğrulama: ${r.type}`,
                status: r.status,
                userId: r.user_id,
                created_at: r.created_at,
                targetUrl: '/admin/verifications',
            }))

            const transfers = (transfersRes.data || []).map((r: { id: string; user_id: string; status: string; created_at: string }) => ({
                id: r.id,
                type: 'payment' as const,
                title: 'Banka Transferi',
                status: r.status,
                userId: r.user_id,
                created_at: r.created_at,
                targetUrl: '/admin/bank-transfers',
            }))

            const merged = [...support, ...reports, ...verifications, ...transfers]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

            setRows(merged)

            const { data: assigns } = await supabase
                .from('admin_case_assignments')
                .select('case_type,case_id,assigned_to,status,updated_at')
                .eq('status', 'active')
                .limit(500)
            const nextAssigned: Record<string, string> = {}
            for (const row of (assigns || []) as Array<{ case_type: string; case_id: string; assigned_to: string | null }>) {
                const key = `${row.case_type}:${row.case_id}`
                if (nextAssigned[key]) continue
                if (row.assigned_to) nextAssigned[key] = row.assigned_to
            }
            setAssignedMap(nextAssigned)

        const { data: playbookLogs } = await supabase
            .from('admin_audit_logs')
            .select('target_table,target_id,metadata,created_at')
            .eq('action', 'playbook_step')
            .order('created_at', { ascending: false })
            .limit(1000)
            const nextPlaybook: Record<string, number> = {}
            for (const row of (playbookLogs || []) as Array<{ target_table: string; target_id: string; metadata?: Record<string, unknown> | null }>) {
                const key = `${row.target_table}:${row.target_id}`
                if (nextPlaybook[key] !== undefined) continue
                const checked = row.metadata?.checked
                if (checked === true) nextPlaybook[key] = 1
                if (checked === false) nextPlaybook[key] = 0
            }
        setPlaybookMap(nextPlaybook)

        const { data: activityRows } = await supabase
            .from('admin_audit_logs')
            .select('id,action,target_table,target_id,created_at')
            .order('created_at', { ascending: false })
            .limit(20)
        setActivity((activityRows || []) as Array<{ id: string; action: string; target_table: string | null; target_id: string | null; created_at: string }>)
        setLastRefreshAt(new Date().toLocaleTimeString())
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])

    useEffect(() => {
        if (!refreshSeconds) return
        const id = setInterval(() => {
            void load()
        }, refreshSeconds * 1000)
        return () => clearInterval(id)
    }, [refreshSeconds, load])

    const assignToMe = async (item: OpsCase) => {
        if (!adminId) return
        await supabase.from('admin_case_assignments').upsert({
            case_type: item.type,
            case_id: item.id,
            assigned_to: adminId,
            assigned_by: adminId,
            status: 'active',
            updated_at: new Date().toISOString(),
        }, { onConflict: 'case_type,case_id' })
        setAssignedMap((prev) => ({ ...prev, [`${item.type}:${item.id}`]: adminId }))
    }

    const unassignMe = async (item: OpsCase) => {
        if (!adminId) return
        await supabase.from('admin_case_assignments').update({
            assigned_to: null,
            status: 'closed',
            updated_at: new Date().toISOString(),
        }).eq('case_type', item.type).eq('case_id', item.id)
        setAssignedMap((prev) => {
            const next = { ...prev }
            delete next[`${item.type}:${item.id}`]
            return next
        })
    }

    const logOpen = async (item: OpsCase) => {
        if (!adminId) return
        await supabase.from('admin_audit_logs').insert({
            action: 'open_case',
            target_table: item.type,
            target_id: item.id,
            metadata: { opened_by: adminId },
        })
    }

    const filtered = rows.filter((row) => {
        const priority = getPriority(row.created_at, getQueueSla(row.type))
        if (typeFilter !== 'all' && row.type !== typeFilter) return false
        if (priorityFilter !== 'all' && priority !== priorityFilter) return false
        const assignedTo = assignedMap[`${row.type}:${row.id}`]
        if (assignFilter === 'mine' && adminId && assignedTo !== adminId) return false
        if (assignFilter === 'unassigned' && assignedTo) return false
        if (showCriticalOnly && priority === 'P2') return false
        const term = search.trim().toLowerCase()
        if (term) {
            const haystack = `${row.title} ${row.userId ?? ''} ${row.id}`.toLowerCase()
            if (!haystack.includes(term)) return false
        }
        return true
    }).sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        const dueA = new Date(a.created_at).getTime() + getQueueSla(a.type) * 60 * 60 * 1000
        const dueB = new Date(b.created_at).getTime() + getQueueSla(b.type) * 60 * 60 * 1000
        return dueA - dueB
    })

    const totals = rows.reduce(
        (acc, row) => {
            const priority = getPriority(row.created_at, getQueueSla(row.type))
            acc.total += 1
            if (priority === 'P0') acc.p0 += 1
            if (priority === 'P1') acc.p1 += 1
            if (priority === 'P2') acc.p2 += 1
            return acc
        },
        { total: 0, p0: 0, p1: 0, p2: 0 }
    )

    const incidentScore = Math.min(100, Math.round((totals.p0 * 3 + totals.p1 * 2 + totals.p2 * 0.5) * 2 + Math.min(10, Math.floor(totals.total / 10))))
    const incidentLevel = incidentScore >= 70 ? 'Kritik' : incidentScore >= 40 ? 'Yuksek' : incidentScore >= 20 ? 'Orta' : 'Dusuk'

    const queueTotals = (type: CaseType) => rows.filter((r) => r.type === type).length
    const queueSlaRisk = (type: CaseType) => {
        const cfg = { ...queueConfig[type], slaHours: getQueueSla(type) }
        return rows.filter((r) => {
            if (r.type !== type) return false
            const pr = getPriority(r.created_at, cfg.slaHours)
            return pr === 'P0' || pr === 'P1'
        }).length
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Ops Hub</h1>
                    <p className="text-sm text-slate-500">Tüm kuyrukları tek ekranda yönet.</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 flex items-center gap-2">
                        <Activity size={12} /> Toplam: {totals.total}
                    </span>
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">P0: {totals.p0}</span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">P1: {totals.p1}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">P2: {totals.p2}</span>
                    <button
                        onClick={() => setShowIncident((prev) => !prev)}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700"
                    >
                        Incident
                    </button>
                    <span className="text-[10px] text-slate-500">Son güncelleme: {lastRefreshAt || '—'}</span>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const header = ['id', 'type', 'title', 'status', 'userId', 'created_at']
                            const lines = filtered.map((row) => [
                                row.id,
                                row.type,
                                row.title.replace(/\"/g, '\"\"'),
                                row.status || '',
                                row.userId || '',
                                row.created_at,
                            ].map((v) => `"${v}"`).join(','))
                            const csv = [header.join(','), ...lines].join('\n')
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                            const url = URL.createObjectURL(blob)
                            const link = document.createElement('a')
                            link.href = url
                            link.download = `ops-hub-${Date.now()}.csv`
                            link.click()
                            URL.revokeObjectURL(url)
                        }}
                        className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                    >
                        CSV Dışa Aktar
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void load()}
                        className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                    >
                        Yenile
                    </button>
                    <button
                        onClick={() => {
                            setTypeFilter('all')
                            setPriorityFilter('all')
                            setAssignFilter('all')
                            setShowCriticalOnly(false)
                            setSortBy('newest')
                            setSearch('')
                        }}
                        className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                    >
                        Filtreleri temizle
                    </button>
                    <button
                        onClick={() => {
                            setShowCriticalOnly(true)
                            setSortBy('sla')
                            setAssignFilter('unassigned')
                            setPriorityFilter('P0')
                        }}
                        className="px-3 py-1.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200"
                    >
                        P0 Odak
                    </button>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ara: id / user"
                        className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                    />
                    <select
                        value={refreshSeconds}
                        onChange={(e) => setRefreshSeconds(Number(e.target.value))}
                        className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                    >
                        <option value={0}>Otomatik: Kapalı</option>
                        <option value={30}>Otomatik: 30s</option>
                        <option value={60}>Otomatik: 60s</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-500">Tip</span>
                    {(['all', 'support', 'report', 'verification', 'payment'] as const).map((key) => (
                        <button
                            key={key}
                            onClick={() => setTypeFilter(key)}
                            className={`px-3 py-1.5 rounded-full border ${typeFilter === key ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                            {key === 'all' ? 'Tümü' : queueConfig[key].label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-500">Öncelik</span>
                    {(['all', 'P0', 'P1', 'P2'] as const).map((key) => (
                        <button
                            key={key}
                            onClick={() => setPriorityFilter(key)}
                            className={`px-3 py-1.5 rounded-full border ${priorityFilter === key ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                            {key === 'all' ? 'Tümü' : key}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-500">Atama</span>
                    {(['all', 'mine', 'unassigned'] as const).map((key) => (
                        <button
                            key={key}
                            onClick={() => setAssignFilter(key)}
                            className={`px-3 py-1.5 rounded-full border ${assignFilter === key ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                        >
                            {key === 'all' ? 'Tümü' : key === 'mine' ? 'Bana Atanan' : 'Atanmamış'}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowCriticalOnly((prev) => !prev)}
                        className={`px-3 py-1.5 rounded-full border ${showCriticalOnly ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        Sadece P0/P1
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-slate-500">Sırala</span>
                    <button
                        onClick={() => setSortBy('newest')}
                        className={`px-3 py-1.5 rounded-full border ${sortBy === 'newest' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        En yeni
                    </button>
                    <button
                        onClick={() => setSortBy('sla')}
                        className={`px-3 py-1.5 rounded-full border ${sortBy === 'sla' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        SLA yakın
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {(['support', 'report', 'verification', 'payment'] as const).map((key) => (
                    <Link
                        key={key}
                        href={queueConfig[key].url}
                        className="glass-panel p-4 rounded-2xl flex items-center justify-between"
                    >
                        <div>
                            <div className="text-xs text-slate-500">{queueConfig[key].label}</div>
                            <div className="text-2xl font-semibold text-slate-900">{queueTotals(key)}</div>
                            <div className="text-[10px] text-slate-500 mt-1">SLA riski: {queueSlaRisk(key)}</div>
                        </div>
                        <span className="text-[10px] px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                            SLA {getQueueSla(key)}s
                        </span>
                    </Link>
                ))}
            </div>

            {showIncident && (
                <div className="glass-panel p-4 rounded-2xl border border-amber-200 bg-amber-50/60">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-amber-900">Incident Mode</div>
                        <div className="text-xs text-amber-700">Skor: {incidentScore} · {incidentLevel}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
                        <div className="rounded-xl border border-amber-200 bg-white/70 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-amber-700">Hizli Aksiyon</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <button className="px-2 py-1 rounded-full border border-amber-200 bg-white text-amber-700">Yeni kayit kapat</button>
                                <button className="px-2 py-1 rounded-full border border-amber-200 bg-white text-amber-700">Odemeleri hold</button>
                                <button className="px-2 py-1 rounded-full border border-amber-200 bg-white text-amber-700">Spam guard</button>
                            </div>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-white/70 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-amber-700">Durum</div>
                            <div className="mt-2 text-sm font-semibold text-amber-900">{incidentLevel}</div>
                            <div className="text-[10px] text-amber-700 mt-1">SLA P0: {totals.p0} · P1: {totals.p1}</div>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-white/70 p-3">
                            <div className="text-[10px] uppercase tracking-wider text-amber-700">Not</div>
                            <input
                                value={incidentTitle}
                                onChange={(e) => setIncidentTitle(e.target.value)}
                                placeholder="Incident basligi"
                                className="mt-2 glass-input w-full px-3 py-2 rounded-xl border border-amber-200 text-xs"
                            />
                            <textarea
                                value={incidentNote}
                                onChange={(e) => setIncidentNote(e.target.value)}
                                rows={3}
                                placeholder="Incident notu..."
                                className="mt-2 glass-input w-full px-3 py-2 rounded-xl border border-amber-200 text-xs"
                            />
                            <button
                                onClick={async () => {
                                    const { data: auth } = await supabase.auth.getUser()
                                    const { data } = await supabase.from('admin_incidents').insert({
                                        title: incidentTitle || 'Incident',
                                        severity: incidentLevel,
                                        status: 'open',
                                        notes: incidentNote || null,
                                        created_by: auth.user?.id || null,
                                    }).select('id').single()
                                    if (data?.id) {
                                        await supabase.from('admin_incident_events').insert({
                                            incident_id: data.id,
                                            action: 'created',
                                            notes: incidentNote || null,
                                            actor_id: auth.user?.id || null,
                                        })
                                    }
                                    setIncidentTitle('')
                                    setIncidentNote('')
                                }}
                                className="mt-2 px-3 py-2 rounded-lg bg-amber-200 text-amber-900 text-xs"
                            >
                                Incident ac
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-panel p-4 rounded-2xl text-xs text-slate-600 flex items-center justify-between">
                <div>Ops Playbook: SLA kritiklerine önce bak, ardından kullanıcı riskini değerlendir.</div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/moderation" className="text-slate-700 underline">
                        Kural ayarları
                    </Link>
                    <button
                        onClick={() => setShowCriticalOnly(true)}
                        className="px-3 py-1.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200"
                    >
                        P0/P1 Odak
                    </button>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl flex items-center justify-between text-xs">
                <div className="text-slate-600">Ops kısa yol: kritik işler için tek tık hızlandır.</div>
                <button
                    onClick={() => {
                        setShowCriticalOnly(true)
                        setSortBy('sla')
                        setAssignFilter('unassigned')
                    }}
                    className="px-3 py-1.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200"
                >
                    Kriz Modu
                </button>
            </div>

            <div className="glass-panel p-4 rounded-2xl">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-3">Son Aktivite</div>
                {activity.length === 0 ? (
                    <div className="text-xs text-slate-500">Kayıt yok.</div>
                ) : (
                    <div className="space-y-2">
                        {activity.map((row) => (
                            <div key={row.id} className="flex items-center justify-between text-xs text-slate-600">
                                <div className="truncate">
                                    <span className="font-semibold text-slate-800">{row.action}</span>
                                    {row.target_table && row.target_id && (
                                        <span className="text-slate-500"> · {row.target_table}:{row.target_id}</span>
                                    )}
                                </div>
                                <div className="text-[10px] text-slate-500">{new Date(row.created_at).toLocaleTimeString()}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="glass-panel p-6 rounded-2xl text-sm text-slate-500">Yükleniyor...</div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel p-6 rounded-2xl text-sm text-slate-500">Kayıt yok.</div>
            ) : (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 text-[10px] text-slate-500 border-b border-slate-200 bg-slate-50">
                        <div>Filtreli: {filtered.length} / {rows.length}</div>
                        <div>Arama: {search || '—'}</div>
                    </div>
                    <div className="grid grid-cols-[1.6fr_0.6fr_0.6fr_0.6fr_0.7fr] gap-0 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                        <div className="px-4 py-3">Başlık</div>
                        <div className="px-4 py-3">Tip</div>
                        <div className="px-4 py-3">Öncelik</div>
                        <div className="px-4 py-3">SLA</div>
                        <div className="px-4 py-3">Aksiyon</div>
                    </div>
                    <div className="divide-y divide-slate-200">
                        {filtered.map((item) => {
                            const cfg = { ...queueConfig[item.type], slaHours: getQueueSla(item.type) }
                            const priority = getPriority(item.created_at, cfg.slaHours)
                            const isOverdue = priority === 'P0'
                            const assignedTo = assignedMap[`${item.type}:${item.id}`]
                            const assignedToMe = !!adminId && assignedTo === adminId
                            const assignedToOther = assignedTo && !assignedToMe
                            return (
                                <div key={`${item.type}-${item.id}`} className="grid grid-cols-[1.6fr_0.6fr_0.6fr_0.6fr_0.7fr] gap-0 text-sm">
                                    <div className="px-4 py-3">
                                        <div className="font-semibold text-slate-900 truncate">{item.title}</div>
                                        <div className="text-[10px] text-slate-500 truncate flex items-center gap-2">
                                            {item.userId || item.id}
                                            {item.userId && (
                                                <a
                                                    href={`/admin/users?q=${item.userId}`}
                                                    className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10px]"
                                                >
                                                    Profil
                                                </a>
                                            )}
                                            <button
                                                onClick={() => navigator.clipboard.writeText(item.id)}
                                                className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-[10px]"
                                            >
                                                ID
                                            </button>
                                        </div>
                                    </div>
                                    <div className="px-4 py-3 text-xs text-slate-600">
                                        {cfg.label}
                                        {assignedToMe && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border border-emerald-200 bg-emerald-50 text-emerald-700">
                                                Bende
                                            </span>
                                        )}
                                        {assignedToOther && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border border-slate-200 bg-slate-50 text-slate-600">
                                                Atandı
                                            </span>
                                        )}
                                        {playbookMap[`${item.type}:${item.id}`] === 1 && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border border-slate-200 bg-slate-50 text-slate-600">
                                                Playbook
                                            </span>
                                        )}
                                    </div>
                                    <div className="px-4 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${priority === 'P0' ? 'bg-rose-50 text-rose-700 border-rose-200' : priority === 'P1' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                            {priority}
                                        </span>
                                    </div>
                                    <div className="px-4 py-3 text-xs flex items-center gap-2 text-slate-600">
                                        <Clock size={12} />
                                        {isOverdue ? 'SLA aşıldı' : formatRemaining(item.created_at, cfg.slaHours)}
                                    </div>
                                    <div className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={item.targetUrl}
                                                onClick={() => void logOpen(item)}
                                                className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700"
                                            >
                                                Aç
                                            </Link>
                                            <button
                                                onClick={() => void assignToMe(item)}
                                                disabled={assignedToMe}
                                                className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${assignedToMe ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'}`}
                                            >
                                                {assignedToMe ? 'Bende' : 'Bana Ata'}
                                            </button>
                                            {assignedToMe && (
                                                <button
                                                    onClick={() => void unassignMe(item)}
                                                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700"
                                                >
                                                    Benden Çıkar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <AlertTriangle size={12} />
                        SLA Riski
                    </div>
                    <div className="text-2xl font-semibold text-slate-900 mt-2">{totals.p0 + totals.p1}</div>
                    <div className="text-xs text-slate-500">P0 + P1 işler</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <ShieldAlert size={12} />
                        Kritik Kuyruklar
                    </div>
                    <div className="text-2xl font-semibold text-slate-900 mt-2">{totals.p0}</div>
                    <div className="text-xs text-slate-500">P0 işler</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Activity size={12} />
                        Toplam İş
                    </div>
                    <div className="text-2xl font-semibold text-slate-900 mt-2">{totals.total}</div>
                    <div className="text-xs text-slate-500">Aktif kuyruk toplamı</div>
                </div>
            </div>
        </div>
    )
}
