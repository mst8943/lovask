'use client'
import { useCallback, useEffect, useState } from 'react'
import { VerificationRow } from '@/services/verificationService'
import { Button } from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { usePresenceStore } from '@/store/usePresenceStore'
const SLA_HOURS = 24
const PLAYBOOK_STEPS = [
    'Belge netliği kontrol edildi',
    'Kullanıcı profili doğrulandı',
    'Karar notu hazırlandı',
] as const
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
export default function AdminVerificationsPage() {
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<VerificationRow[]>([])
    const [notes, setNotes] = useState<Record<string, string>>({})
    const [proofLinks, setProofLinks] = useState<Record<string, string>>({})
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'P0' | 'P1' | 'P2'>('all')
    const [playbook, setPlaybook] = useState<Record<string, Record<string, boolean>>>({})
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<Record<string, boolean>>({})
    const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d'>('all')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [proofOnly, setProofOnly] = useState(false)
    const [deviceOnly, setDeviceOnly] = useState(false)
    const [slaHours, setSlaHours] = useState(SLA_HOURS)
    const [now, setNow] = useState(0)
    const onlineUsers = usePresenceStore((s) => s.onlineUsers)
    const postJson = useCallback(async (url: string, body?: Record<string, unknown>) => {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {}),
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    }, [])
    const loadData = useCallback(async () => {
        setLoading(true)
        const payload = await postJson('/api/admin/verifications/list')
        setRows(payload.rows || [])
        setProofLinks(payload.proofLinks || {})
        setLoading(false)
    }, [postJson])
    useEffect(() => {
        const id = setTimeout(() => {
            void loadData()
        }, 0)
        return () => clearTimeout(id)
    }, [loadData])
    useEffect(() => {
        const loadSla = async () => {
            const payload = await postJson('/api/admin/sla', { queue: 'verifications' })
            if (payload?.sla_hours) setSlaHours(payload.sla_hours)
        }
        void loadSla()
    }, [postJson])
    useEffect(() => {
        const id = setTimeout(() => setNow(Date.now()), 0)
        return () => clearTimeout(id)
    }, [dateFilter, deviceOnly, proofOnly, priorityFilter, search, statusFilter, typeFilter])
    const handleUpdate = async (id: string, status: 'approved' | 'rejected') => {
        const note = notes[id] || null
        await postJson('/api/admin/verifications/update', { id, status, admin_note: note })
        await loadData()
    }
    const logPlaybook = async (id: string, step: string, checked: boolean) => {
        await postJson('/api/admin/audit/log', {
            action: 'playbook_step',
            target_table: 'user_verifications',
            target_id: id,
            metadata: { step, checked },
        })
    }
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    const filteredRows = rows.filter((row) => {
        if (priorityFilter !== 'all' && getPriority(row.created_at, slaHours) !== priorityFilter) {
            return false
        }
        if (statusFilter !== 'all' && row.status !== statusFilter) {
            return false
        }
        if (typeFilter !== 'all' && row.type !== typeFilter) {
            return false
        }
        if (proofOnly && !row.proof_url) {
            return false
        }
        if (deviceOnly && !row.device_info) {
            return false
        }
        if (dateFilter !== 'all') {
            const hours = dateFilter === '24h' ? 24 : 24 * 7
            const cutoff = now - hours * 60 * 60 * 1000
            if (new Date(row.created_at).getTime() < cutoff) return false
        }
        const term = search.trim().toLowerCase()
        if (!term) return true
        return row.user_id.toLowerCase().includes(term)
    })
    const selectedIds = Object.keys(selected).filter((id) => selected[id])
    const toggleAll = (checked: boolean) => {
        const next: Record<string, boolean> = {}
        filteredRows.forEach((row) => {
            next[row.id] = checked
        })
        setSelected(next)
    }
    const runBatch = async (status: 'approved' | 'rejected') => {
        if (selectedIds.length === 0) return
        for (const id of selectedIds) {
            await handleUpdate(id, status)
        }
        setSelected({})
    }
    const exportCsv = () => {
        const header = ['id', 'user_id', 'type', 'status', 'priority', 'created_at']
        const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`
        const lines = [header.join(',')]
        filteredRows.forEach((row) => {
            const line = [
                row.id,
                row.user_id,
                row.type,
                row.status,
                getPriority(row.created_at, slaHours),
                row.created_at,
            ].map((cell) => escapeCell(String(cell)))
            lines.push(line.join(','))
        })
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `verifications_export_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
    }
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Doğrulamalar</h1>
                    <p className="text-sm text-gray-400">Kullanıcı doğrulama isteklerini yönet</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => void loadData()}
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
                    <div className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                        SLA {slaHours}s
                    </div>
                </div>
            </div>
            <div className="glass-panel p-3 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
                {(['all', 'P0', 'P1', 'P2'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setPriorityFilter(key)}
                        className={`px-3 py-1.5 rounded-full border ${priorityFilter === key ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {key === 'all' ? 'Tümü' : key}
                    </button>
                ))}
                <div className="h-6 w-px bg-white/10" />
                {(['all', 'pending', 'approved', 'rejected'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`px-3 py-1.5 rounded-full border ${statusFilter === key ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {key === 'all' ? 'Durum' : key}
                    </button>
                ))}
                <div className="h-6 w-px bg-white/10" />
                {(['all', '24h', '7d'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setDateFilter(key)}
                        className={`px-3 py-1.5 rounded-full border ${dateFilter === key ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {key === 'all' ? 'Tarih' : key}
                    </button>
                ))}
                <div className="h-6 w-px bg-white/10" />
                {['all', ...Array.from(new Set(rows.map((r) => r.type)))].map((key) => (
                    <button
                        key={key}
                        onClick={() => setTypeFilter(key)}
                        className={`px-3 py-1.5 rounded-full border ${typeFilter === key ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {key === 'all' ? 'Tip' : key}
                    </button>
                ))}
                <button
                    onClick={() => setProofOnly((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-full border ${proofOnly ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                    Sadece kanitli
                </button>
                <button
                    onClick={() => setDeviceOnly((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-full border ${deviceOnly ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                    Sadece cihazli
                </button>
                <div className="ml-auto flex items-center gap-2">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ara: user id"
                        className="glass-input px-3 py-2 rounded-full border border-white/10 text-xs"
                    />
                    <div className="text-[10px] text-gray-400">
                        {filteredRows.length}/{rows.length}
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5">
                    <input
                        type="checkbox"
                        checked={filteredRows.length > 0 && selectedIds.length === filteredRows.length}
                        onChange={(e) => toggleAll(e.target.checked)}
                    />
                    Tümünü seç
                </label>
                <Button
                    onClick={() => runBatch('approved')}
                    variant="secondary"
                    className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs disabled:opacity-40"
                    disabled={selectedIds.length === 0}
                >
                    Toplu onayla
                </Button>
                <Button
                    onClick={() => runBatch('rejected')}
                    variant="secondary"
                    className="px-3 py-2 rounded-lg border border-red-200 bg-red-100 text-red-900 text-xs disabled:opacity-40"
                    disabled={selectedIds.length === 0}
                >
                    Toplu reddet
                </Button>
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
                {filteredRows.length === 0 ? (
                    <div className="glass-panel p-6 rounded-2xl text-sm text-gray-400">Kayıt yok.</div>
                ) : (
                    filteredRows.map((r) => (
                        <div key={r.id} className="glass-panel p-4 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-semibold flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={!!selected[r.id]}
                                            onChange={(e) => setSelected((prev) => ({ ...prev, [r.id]: e.target.checked }))}
                                        />
                                        {r.type}
                                    </div>
                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                        {r.user_id}
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${onlineUsers.has(r.user_id) || (r.user_last_active_at && now - new Date(r.user_last_active_at).getTime() < 10 * 60 * 1000) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${onlineUsers.has(r.user_id) || (r.user_last_active_at && now - new Date(r.user_last_active_at).getTime() < 10 * 60 * 1000) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            {onlineUsers.has(r.user_id) || (r.user_last_active_at && now - new Date(r.user_last_active_at).getTime() < 10 * 60 * 1000) ? 'Çevrim içi' : 'Çevrimdışı'}
                                        </span>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(r.user_id)}
                                            className="px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-[10px] text-gray-300"
                                        >
                                            Kopyala
                                        </button>
                                        <a
                                            href={`/admin/users?q=${r.user_id}`}
                                            className="px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-[10px] text-gray-300"
                                        >
                                            Profil
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriority(r.created_at, slaHours) === 'P0' ? 'bg-rose-50 text-rose-700 border-rose-200' : getPriority(r.created_at, slaHours) === 'P1' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                        {getPriority(r.created_at, slaHours)}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : r.status === 'rejected' ? 'bg-red-100 text-red-900 border border-red-200' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                        {r.status}
                                    </span>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400">SLA: {formatRemaining(r.created_at, slaHours)}</div>
                            {proofLinks[r.id] && (
                                <div className="flex items-center gap-2 text-xs">
                                    <a href={proofLinks[r.id]} target="_blank" className="text-blue-300 underline">
                                        Kanıt görseli
                                    </a>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(proofLinks[r.id])}
                                        className="px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-[10px] text-gray-300"
                                    >
                                        Link kopyala
                                    </button>
                                    <span className="text-[10px] text-gray-500">1s geçerli</span>
                                </div>
                            )}
                            {r.device_info && (
                                <div className="text-xs text-gray-400">
                                    Cihaz: {typeof (r.device_info as { user_agent?: unknown }).user_agent === 'string'
                                        ? (r.device_info as { user_agent?: string }).user_agent
                                        : '?'}
                                </div>
                            )}
                            <div className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
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
                                                className={`px-2 py-1 rounded-full border ${checked ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white/10 border-white/10 text-gray-300'}`}
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
                                placeholder="Not (opsiyonel)"
                                rows={2}
                                className="glass-input w-full px-3 py-2 rounded-xl border border-white/10 text-xs"
                            />
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => handleUpdate(r.id, 'approved')}
                                    variant="secondary"
                                    className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs"
                                >
                                    Onayla
                                </Button>
                                <Button
                                    onClick={() => handleUpdate(r.id, 'rejected')}
                                    variant="secondary"
                                    className="px-3 py-2 rounded-lg border border-red-200 bg-red-100 text-red-900 text-xs"
                                >
                                    Reddet
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
