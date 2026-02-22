'use client'
import { useEffect, useMemo, useState } from 'react'
import { fetchReports, resolveReport, banUser } from '@/services/moderationService'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
import { usePresenceStore } from '@/store/usePresenceStore'
type ReportRow = {
    id: string
    reported_id: string
    reporter_id: string
    status: 'pending' | 'resolved' | 'dismissed' | string
    reason?: string | null
    reported?: { email?: string | null; last_active_at?: string | null } | null
    reporter?: { email?: string | null; last_active_at?: string | null } | null
    created_at: string
}
const SLA_HOURS = 2
const PLAYBOOK_STEPS = [
    'Kanıt incelendi',
    'Kullanıcı geçmişi kontrol edildi',
    'Aksiyon kararı verildi',
] as const
const NOTE_TEMPLATES = ['Kanıt yetersiz.', 'Tekrar ihlal.', 'Kullanıcı uyarildi.'] as const
const getPriority = (createdAt: string, slaHours: number) => {
    const due = new Date(createdAt).getTime() + slaHours * 60 * 60 * 1000
    const now = Date.now()
    if (now >= due) return 'P0'
    const totalMs = slaHours * 60 * 60 * 1000
    if (due - now <= totalMs * 0.2) return 'P1'
    return 'P2'
}
const formatRemaining = (createdAt: string, slaHours: number) => {
    const due = new Date(createdAt).getTime() + slaHours * 60 * 60 * 1000
    const now = Date.now()
    const diff = Math.max(0, due - now)
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}s ${minutes}d`
}
export default function ReportsPage() {
    const [reports, setReports] = useState<ReportRow[]>([])
    const [loading, setLoading] = useState(true)
    const [actionId, setActionId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [notes, setNotes] = useState<Record<string, string>>({})
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'P0' | 'P1' | 'P2'>('all')
    const [playbook, setPlaybook] = useState<Record<string, Record<string, boolean>>>({})
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('all')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<Record<string, boolean>>({})
    const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d'>('all')
    const [hasNoteOnly, setHasNoteOnly] = useState(false)
    const [slaHours, setSlaHours] = useState(SLA_HOURS)
    const [now, setNow] = useState(Date.now())
    const supabase = createClient()
    const onlineUsers = usePresenceStore((s) => s.onlineUsers)
    const load = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await fetchReports()
            setReports(data || [])
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Bir hata olustu.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        load()
    }, [])
    useEffect(() => {
        const loadSla = async () => {
            const { data } = await supabase.from('admin_sla_settings').select('sla_hours').eq('queue', 'reports').maybeSingle()
            if (data?.sla_hours) setSlaHours(data.sla_hours)
        }
        void loadSla()
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => setNow(Date.now()), 0)
        return () => clearTimeout(id)
    }, [dateFilter, hasNoteOnly, priorityFilter, search, statusFilter])
    const filteredReports = useMemo(() => {
        const term = search.trim().toLowerCase()
        return reports.filter((report) => {
            if (priorityFilter !== 'all' && getPriority(report.created_at, slaHours) !== priorityFilter) {
                return false
            }
            if (statusFilter !== 'all' && report.status !== statusFilter) {
                return false
            }
            if (hasNoteOnly && !notes[report.id]) {
                return false
            }
            if (dateFilter !== 'all') {
                const hours = dateFilter === '24h' ? 24 : 24 * 7
                const cutoff = now - hours * 60 * 60 * 1000
                if (new Date(report.created_at).getTime() < cutoff) return false
            }
            if (!term) return true
            return report.reported_id.toLowerCase().includes(term) || report.reporter_id.toLowerCase().includes(term)
        })
    }, [dateFilter, hasNoteOnly, notes, now, priorityFilter, reports, search, slaHours, statusFilter])
    const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected])
    const toggleAll = (checked: boolean) => {
        const next: Record<string, boolean> = {}
        filteredReports.forEach((r) => {
            next[r.id] = checked
        })
        setSelected(next)
    }
    const runBatch = async (status: 'resolved' | 'dismissed') => {
        if (selectedIds.length === 0) return
        setActionId(selectedIds[0])
        for (const id of selectedIds) {
            await resolveReport(id, status)
        }
        await load()
        setSelected({})
        setActionId(null)
    }
    const exportCsv = () => {
        const header = ['id', 'reported_id', 'reporter_id', 'status', 'reason', 'priority', 'created_at']
        const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`
        const lines = [header.join(',')]
        filteredReports.forEach((report) => {
            const line = [
                report.id,
                report.reported_id,
                report.reporter_id,
                report.status,
                report.reason ?? '',
                getPriority(report.created_at, slaHours),
                report.created_at,
            ].map((cell) => escapeCell(String(cell)))
            lines.push(line.join(','))
        })
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `reports_export_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
    }
    const handleResolve = async (id: string, status: 'resolved' | 'dismissed', reportedId?: string) => {
        setActionId(id)
        await resolveReport(id, status)
        if (reportedId) {
            await supabase.from('admin_audit_logs').insert({
                action: `report_${status}`,
                target_table: 'reports',
                target_id: id,
                metadata: { reported_id: reportedId, note: notes[id] || null },
            })
            await supabase.from('notifications').insert({
                user_id: reportedId,
                type: 'report_resolved',
                payload: { title: 'Rapor sonucu', body: status === 'resolved' ? 'Raporun değerlendirildi.' : 'Rapor reddedildi.' },
            })
        }
        await load()
        setActionId(null)
    }
    const logPlaybook = async (id: string, step: string, checked: boolean) => {
        const { data } = await supabase.auth.getUser()
        await supabase.from('admin_audit_logs').insert({
            admin_id: data.user?.id || null,
            action: 'playbook_step',
            target_table: 'reports',
            target_id: id,
            metadata: { step, checked },
        })
    }
    const handleBan = async (userId: string, reportId: string) => {
        setActionId(reportId)
        await banUser(userId, 'Rapor üzerinden banlandı')
        await resolveReport(reportId, 'resolved')
        await supabase.from('admin_audit_logs').insert({
            action: 'ban_user',
            target_table: 'users',
            target_id: userId,
            metadata: { report_id: reportId, note: notes[reportId] || null },
        })
        await supabase.from('notifications').insert({
            user_id: userId,
            type: 'ban',
            payload: { title: 'Hesap banlandı', body: 'Rapor sonucu hesabın geçici/kalıcı olarak banlandı.' },
        })
        await load()
        setActionId(null)
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
                    <h1 className="text-2xl font-bold">Raporlar</h1>
                    <p className="text-sm text-gray-400">Kullanıcı raporlarını yönet</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void load()}
                        className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300"
                    >
                        Yenile
                    </button>
                    <button
                        onClick={exportCsv}
                        className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white border border-slate-900"
                    >
                        CSV
                    </button>
                    <span className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                        Güvenlik
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                        SLA {slaHours}s
                    </span>
                </div>
            </div>
            {error && (
                <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg">
                    {error}
                </div>
            )}
            <div className="glass-panel p-3 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
                {(['all', 'P0', 'P1', 'P2'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setPriorityFilter(key)}
                        className={`px-3 py-1.5 rounded-full border ${priorityFilter === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {key === 'all' ? 'Tümü' : key}
                    </button>
                ))}
                <div className="h-6 w-px bg-white/10" />
                {(['all', 'pending', 'resolved', 'dismissed'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`px-3 py-1.5 rounded-full border ${statusFilter === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {key === 'all' ? 'Durum' : key}
                    </button>
                ))}
                <div className="h-6 w-px bg-white/10" />
                {(['all', '24h', '7d'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setDateFilter(key)}
                        className={`px-3 py-1.5 rounded-full border ${dateFilter === key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {key === 'all' ? 'Tarih' : key}
                    </button>
                ))}
                <button
                    onClick={() => setStatusFilter('pending')}
                    className="px-3 py-1.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200"
                >
                    Bekleyen
                </button>
                <button
                    onClick={() => {
                        setStatusFilter('pending')
                        setPriorityFilter('P0')
                    }}
                    className="px-3 py-1.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200"
                >
                    P0 bekleyen
                </button>
                <button
                    onClick={() => setHasNoteOnly((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-full border ${hasNoteOnly ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                    Notlu
                </button>
                <div className="ml-auto flex items-center gap-2">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ara: reported / reporter id"
                        className="glass-input px-3 py-2 rounded-full border border-white/10 text-xs"
                    />
                    <div className="text-[10px] text-gray-400">
                        {filteredReports.length}/{reports.length}
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5">
                    <input
                        type="checkbox"
                        checked={filteredReports.length > 0 && selectedIds.length === filteredReports.length}
                        onChange={(e) => toggleAll(e.target.checked)}
                    />
                    Tümünü seç
                </label>
                <button
                    onClick={() => runBatch('resolved')}
                    disabled={selectedIds.length === 0}
                    className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-200 disabled:opacity-40"
                >
                    Toplu çöz
                </button>
                <button
                    onClick={() => runBatch('dismissed')}
                    disabled={selectedIds.length === 0}
                    className="px-3 py-2 rounded-lg bg-white/10 text-gray-300 disabled:opacity-40"
                >
                    Toplu reddet
                </button>
                <div className="text-[10px] text-gray-400">
                    Seçili: {selectedIds.length}
                </div>
                <button
                    onClick={() => {
                        setSelected({})
                        setNotes({})
                    }}
                    className="px-3 py-2 rounded-lg bg-white/10 text-gray-300"
                >
                    Seçimi temizle
                </button>
            </div>
            <div className="space-y-3">
                {filteredReports.map((r) => (
                    <div key={r.id} className="glass-panel p-4 rounded-2xl space-y-2 border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-semibold flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={!!selected[r.id]}
                                        onChange={(e) => setSelected((prev) => ({ ...prev, [r.id]: e.target.checked }))}
                                    />
                                    {r.reported?.email || r.reported_id}
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${onlineUsers.has(r.reported_id) || (r.reported?.last_active_at && now - new Date(r.reported.last_active_at).getTime() < 10 * 60 * 1000) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${onlineUsers.has(r.reported_id) || (r.reported?.last_active_at && now - new Date(r.reported.last_active_at).getTime() < 10 * 60 * 1000) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                        {onlineUsers.has(r.reported_id) || (r.reported?.last_active_at && now - new Date(r.reported.last_active_at).getTime() < 10 * 60 * 1000) ? 'Çevrim içi' : 'Çevrimdışı'}
                                    </span>
                                    {r.reported_id && (
                                        <button
                                            onClick={() => navigator.clipboard.writeText(r.reported_id)}
                                            className="px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-[10px] text-gray-300"
                                        >
                                            Kopyala
                                        </button>
                                    )}
                                    <button
                                        onClick={() => navigator.clipboard.writeText(r.id)}
                                        className="px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-[10px] text-gray-300"
                                    >
                                        Rapor ID
                                    </button>
                                    {r.reported_id && (
                                        <a
                                            href={`/admin/users?q=${r.reported_id}`}
                                            className="px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-[10px] text-gray-300"
                                        >
                                            Profil
                                        </a>
                                    )}
                                </div>
                                <div className="text-xs text-gray-400 flex items-center gap-2">
                                    Bildiren: {r.reporter?.email || r.reporter_id}
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${onlineUsers.has(r.reporter_id) || (r.reporter?.last_active_at && now - new Date(r.reporter.last_active_at).getTime() < 10 * 60 * 1000) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${onlineUsers.has(r.reporter_id) || (r.reporter?.last_active_at && now - new Date(r.reporter.last_active_at).getTime() < 10 * 60 * 1000) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                        {onlineUsers.has(r.reporter_id) || (r.reporter?.last_active_at && now - new Date(r.reporter.last_active_at).getTime() < 10 * 60 * 1000) ? 'Çevrim içi' : 'Çevrimdışı'}
                                    </span>
                                    {r.reporter_id && (
                                        <button
                                            onClick={() => navigator.clipboard.writeText(r.reporter_id)}
                                            className="px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-[10px] text-gray-300"
                                        >
                                            Kopyala
                                        </button>
                                    )}
                                    {r.reporter_id && (
                                        <a
                                            href={`/admin/users?q=${r.reporter_id}`}
                                            className="px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-[10px] text-gray-300"
                                        >
                                            Profil
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full border ${getPriority(r.created_at, slaHours) === 'P0' ? 'bg-rose-50 text-rose-700 border-rose-200' : getPriority(r.created_at, slaHours) === 'P1' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    {getPriority(r.created_at, slaHours)}
                                </span>
                                <span className="text-xs px-2 py-1 rounded-full bg-white/10">
                                    {r.status === 'resolved' ? 'Çözüldü' : r.status === 'dismissed' ? 'Reddedildi' : 'Beklemede'}
                                </span>
                            </div>
                        </div>
                        <div className="text-xs text-gray-400">SLA: {formatRemaining(r.created_at, slaHours)}</div>
                        <div className="text-sm text-gray-300">Neden: {r.reason || '-'}</div>
                        <div className="text-xs text-gray-500">Rapor ID: {r.id}</div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                            <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Playbook</div>
                            <div className="flex flex-wrap gap-2">
                                {PLAYBOOK_STEPS.map((step) => {
                                    const checked = !!playbook[r.id]?.[step]
                                    return (
                                        <button
                                            key={step}
                                            onClick={async () => {
                                                setPlaybook((prev) => ({
                                                    ...prev,
                                                    [r.id]: { ...(prev[r.id] || {}), [step]: !checked },
                                                }))
                                                await logPlaybook(r.id, step, !checked)
                                            }}
                                            className={`px-2 py-1 rounded-full border ${checked ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200' : 'bg-white/10 border-white/10 text-gray-300'}`}
                                        >
                                            {step}
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="mt-2 text-[10px] text-gray-500">
                                Tamamlanan: {PLAYBOOK_STEPS.filter((step) => playbook[r.id]?.[step]).length}/{PLAYBOOK_STEPS.length}
                            </div>
                        </div>
                        <textarea
                            value={notes[r.id] || ''}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                            rows={2}
                            placeholder="Ops notu / playbook"
                            className="glass-input w-full px-3 py-2 rounded-xl border border-white/10 text-xs"
                        />
                        <div className="flex flex-wrap gap-2 text-[10px]">
                            {NOTE_TEMPLATES.map((tpl) => (
                                <button
                                    key={tpl}
                                    onClick={() => setNotes((prev) => {
                                        const current = prev[r.id] || ''
                                        const next = current ? `${current}\n${tpl}` : tpl
                                        return { ...prev, [r.id]: next }
                                    })}
                                    className="px-2 py-1 rounded-full border border-white/10 bg-white/10 text-gray-300"
                                >
                                    {tpl}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            {r.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => handleResolve(r.id, 'resolved', r.reported_id)}
                                        disabled={actionId === r.id}
                                        className="px-3 py-2 rounded-lg bg-green-500/20 text-green-300 text-xs"
                                    >
                                        Coz
                                    </button>
                                    <button
                                        onClick={() => handleResolve(r.id, 'dismissed', r.reported_id)}
                                        disabled={actionId === r.id}
                                        className="px-3 py-2 rounded-lg bg-white/10 text-gray-300 text-xs"
                                    >
                                        Reddet
                                    </button>
                                    <button
                                        onClick={() => handleBan(r.reported_id, r.id)}
                                        disabled={actionId === r.id}
                                        className="ml-auto px-3 py-2 rounded-lg bg-red-500/20 text-red-300 text-xs"
                                    >
                                        Kullanici banla
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
