'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchSupportTickets, updateSupportTicket, SupportTicket } from '@/services/supportService'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
const statusOptions: SupportTicket['status'][] = ['open', 'pending', 'resolved', 'closed']
const SLA_HOURS = 6
const PLAYBOOK_STEPS = [
    'Kullanıcı geçmişi kontrol edildi',
    'Benzer kayıtlar incelendi',
    'Yanıt taslağı hazırlandı',
] as const
const NOTE_TEMPLATES = ['Merhaba, talebinizi inceliyoruz.', 'Ek bilgi rica ediyoruz.', 'Sorun çözüldü, tekrar deneyin.'] as const
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
export default function AdminSupportPage() {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<SupportTicket[]>([])
    const [notes, setNotes] = useState<Record<string, string>>({})
    const [priorityFilter, setPriorityFilter] = useState<'all' | 'P0' | 'P1' | 'P2'>('all')
    const [playbook, setPlaybook] = useState<Record<string, Record<string, boolean>>>({})
    const [statusFilter, setStatusFilter] = useState<'all' | SupportTicket['status']>('all')
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<Record<string, boolean>>({})
    const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d'>('all')
    const [overdueOnly, setOverdueOnly] = useState(false)
    const [slaHours, setSlaHours] = useState(SLA_HOURS)
    const [now, setNow] = useState(0)
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [threads, setThreads] = useState<Record<string, Array<{ id: string; sender_role: string; body: string; created_at: string }>>>({})
    const [replyMap, setReplyMap] = useState<Record<string, string>>({})
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
    const loadData = useCallback(async () => {
        setLoading(true)
        const data = await fetchSupportTickets()
        setRows(data)
        setLoading(false)
    }, [])
    useEffect(() => {
        const id = setTimeout(() => {
            void loadData()
        }, 0)
        return () => clearTimeout(id)
    }, [loadData])
    useEffect(() => {
        const loadSla = async () => {
            const { data } = await supabase.from('admin_sla_settings').select('sla_hours').eq('queue', 'support').maybeSingle()
            if (data?.sla_hours) setSlaHours(data.sla_hours)
        }
        void loadSla()
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => setNow(Date.now()), 0)
        return () => clearTimeout(id)
    }, [dateFilter, overdueOnly, priorityFilter, search, sortOrder, statusFilter])
    const handleUpdate = async (id: string, status: SupportTicket['status'], userId?: string) => {
        await updateSupportTicket(id, { status, admin_note: notes[id] || null })
        if (userId) {
            await supabase.from('notifications').insert({
                user_id: userId,
                type: 'support',
                payload: { title: 'Destek talebi güncellendi', body: `Durum: ${status}` },
            })
        }
        await loadData()
    }
    const logPlaybook = async (id: string, step: string, checked: boolean) => {
        const { data } = await supabase.auth.getUser()
        await supabase.from('admin_audit_logs').insert({
            admin_id: data.user?.id || null,
            action: 'playbook_step',
            target_table: 'support_tickets',
            target_id: id,
            metadata: { step, checked },
        })
    }
    const loadThread = async (ticketId: string) => {
        const { data } = await supabase
            .from('support_messages')
            .select('id,sender_role,body,created_at')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true })
        setThreads((prev) => ({ ...prev, [ticketId]: (data || []) as Array<{ id: string; sender_role: string; body: string; created_at: string }> }))
    }
    const sendReply = async (ticket: SupportTicket) => {
        const body = replyMap[ticket.id]?.trim()
        if (!body) return
        await supabase.from('support_messages').insert({
            ticket_id: ticket.id,
            sender_id: ticket.user_id,
            sender_role: 'admin',
            body,
        })
        await supabase.from('notifications').insert({
            user_id: ticket.user_id,
            type: 'support',
            payload: { title: 'Destek yaniti', body },
        })
        setReplyMap((prev) => ({ ...prev, [ticket.id]: '' }))
        await loadThread(ticket.id)
    }
    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase()
        return rows.filter((row) => {
            if (priorityFilter !== 'all' && getPriority(row.created_at, slaHours) !== priorityFilter) {
                return false
            }
            if (statusFilter !== 'all' && row.status !== statusFilter) {
                return false
            }
            if (overdueOnly && getPriority(row.created_at, slaHours) !== 'P0') {
                return false
            }
            if (dateFilter !== 'all') {
                const hours = dateFilter === '24h' ? 24 : 24 * 7
                const cutoff = now - hours * 60 * 60 * 1000
                if (new Date(row.created_at).getTime() < cutoff) return false
            }
            if (!term) return true
            return row.user_id.toLowerCase().includes(term) || row.subject?.toLowerCase().includes(term)
        }).sort((a, b) => {
            if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
    }, [dateFilter, now, overdueOnly, priorityFilter, rows, search, slaHours, sortOrder, statusFilter])
    const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected])
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    const toggleAll = (checked: boolean) => {
        const next: Record<string, boolean> = {}
        filteredRows.forEach((row) => {
            next[row.id] = checked
        })
        setSelected(next)
    }
    const runBatch = async (status: SupportTicket['status']) => {
        if (selectedIds.length === 0) return
        for (const id of selectedIds) {
            await updateSupportTicket(id, { status })
        }
        await loadData()
        setSelected({})
    }
    const exportCsv = () => {
        const header = ['id', 'user_id', 'subject', 'status', 'priority', 'created_at']
        const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`
        const lines = [header.join(',')]
        filteredRows.forEach((row) => {
            const line = [
                row.id,
                row.user_id,
                row.subject ?? '',
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
        link.download = `support_export_${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
    }
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Destek Talepleri</h1>
                    <p className="text-sm text-gray-400">Kullanıcı destek taleplerini yönet</p>
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
                        className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
                    >
                        CSV
                    </button>
                    <div className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
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
                {(['all', ...statusOptions] as const).map((key) => (
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
                <button
                    onClick={() => setOverdueOnly((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-full border ${overdueOnly ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                    Sadece P0
                </button>
                <button
                    onClick={() => setStatusFilter('open')}
                    className="px-3 py-1.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200"
                >
                    Sadece open
                </button>
                <button
                    onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                    className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                >
                    {sortOrder === 'newest' ? 'Yeni > Eski' : 'Eski > Yeni'}
                </button>
                <div className="ml-auto flex items-center gap-2">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Ara: user id / konu"
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
                {statusOptions.map((s) => (
                    <button
                        key={s}
                        onClick={() => runBatch(s)}
                        disabled={selectedIds.length === 0}
                        className="px-3 py-2 rounded-lg bg-white/10 text-gray-300 disabled:opacity-40"
                    >
                        Toplu {s}
                    </button>
                ))}
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
            {filteredRows.length === 0 ? (
                <div className="glass-panel p-6 rounded-2xl text-sm text-gray-400">Talep yok.</div>
            ) : (
                <div className="space-y-3">
                    {filteredRows.map((r) => (
                        <div key={r.id} className="glass-panel p-4 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-semibold flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={!!selected[r.id]}
                                            onChange={(e) => setSelected((prev) => ({ ...prev, [r.id]: e.target.checked }))}
                                        />
                                        {r.subject}
                                    </div>
                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                        {r.user_id}
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
                                        <button
                                            onClick={() => navigator.clipboard.writeText(r.id)}
                                            className="px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-[10px] text-gray-300"
                                        >
                                            Ticket ID
                                        </button>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(r.message)}
                                            className="px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-[10px] text-gray-300"
                                        >
                                            Mesaj
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriority(r.created_at, slaHours) === 'P0' ? 'bg-rose-50 text-rose-700 border-rose-200' : getPriority(r.created_at, slaHours) === 'P1' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                        {getPriority(r.created_at, slaHours)}
                                    </span>
                                    <span className="text-xs px-2 py-1 rounded-full bg-white/10">{r.status}</span>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400">SLA: {formatRemaining(r.created_at, slaHours)}</div>
                            <div className="text-sm text-gray-300">{r.message}</div>
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
                                value={notes[r.id] ?? r.admin_note ?? ''}
                                onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                rows={2}
                                placeholder="Ops notu / playbook"
                                className="glass-input w-full px-3 py-2 rounded-xl border border-white/10 text-xs"
                            />
                            <div className="text-[10px] text-gray-400">
                                <button
                                    onClick={() => navigator.clipboard.writeText(notes[r.id] ?? r.admin_note ?? '')}
                                    className="px-2 py-1 rounded-full border border-white/10 bg-white/10"
                                >
                                    Notu kopyala
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[10px]">
                                {NOTE_TEMPLATES.map((tpl) => (
                                    <button
                                        key={tpl}
                                        onClick={() => setNotes((prev) => {
                                            const current = prev[r.id] ?? r.admin_note ?? ''
                                            const next = current ? `${current}\n${tpl}` : tpl
                                            return { ...prev, [r.id]: next }
                                        })}
                                        className="px-2 py-1 rounded-full border border-white/10 bg-white/10 text-gray-300"
                                    >
                                        {tpl}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {statusOptions.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => handleUpdate(r.id, s, r.user_id)}
                                        className="px-3 py-2 rounded-lg bg-white/10 text-xs"
                                    >
                                        {s}
                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }))
                                        if (!expanded[r.id]) void loadThread(r.id)
                                    }}
                                    className="px-3 py-2 rounded-lg bg-white/10 text-xs"
                                >
                                    Thread
                                </button>
                            </div>
                            {expanded[r.id] && (
                                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                                    <div className="text-[10px] uppercase tracking-wider text-gray-400">Mesajlar</div>
                                    <div className="space-y-2 text-xs">
                                        {(threads[r.id] || []).map((msg) => (
                                            <div key={msg.id} className="flex items-start gap-2">
                                                <span className="text-[10px] text-gray-500 w-14">{msg.sender_role}</span>
                                                <div className="text-gray-300">{msg.body}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <textarea
                                        value={replyMap[r.id] || ''}
                                        onChange={(e) => setReplyMap((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                        rows={2}
                                        placeholder="Admin yaniti"
                                        className="glass-input w-full px-3 py-2 rounded-xl border border-white/10 text-xs"
                                    />
                                    <button
                                        onClick={() => void sendReply(r)}
                                        className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs"
                                    >
                                        Yanitla
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
