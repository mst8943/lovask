'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AuditRow = {
    id: string
    action: string
    target_table: string | null
    target_id: string | null
    created_at: string
    metadata: Record<string, unknown> | null
}

export default function AdminAuditPage() {
    const supabase = createClient()
    const [rows, setRows] = useState<AuditRow[]>([])
    const [query, setQuery] = useState('')

    const load = useCallback(async () => {
        const { data } = await supabase
            .from('admin_audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)
        setRows((data || []) as AuditRow[])
    }, [supabase])

    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])

    const filtered = rows.filter((r) => {
        if (!query.trim()) return true
        const term = query.trim().toLowerCase()
        return `${r.action} ${r.target_table ?? ''} ${r.target_id ?? ''}`.toLowerCase().includes(term)
    })

    const exportCsv = () => {
        const header = ['id', 'action', 'target_table', 'target_id', 'created_at']
        const lines = [header.join(',')]
        filtered.forEach((r) => {
            lines.push([r.id, r.action, r.target_table || '', r.target_id || '', r.created_at].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        })
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `audit_export_${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="admin-page space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Audit</h1>
                    <p className="text-sm text-slate-700">Admin audit log</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => void load()} className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                        Yenile
                    </button>
                    <button onClick={exportCsv} className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white border border-slate-900">
                        CSV
                    </button>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="action / table / id"
                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                />
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-0 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-white">
                    <div className="px-4 py-3">Action</div>
                    <div className="px-4 py-3">Table</div>
                    <div className="px-4 py-3">Target</div>
                    <div className="px-4 py-3">Time</div>
                </div>
                <div className="divide-y divide-white/5">
                    {filtered.map((r) => (
                        <div key={r.id} className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-0 text-sm">
                            <div className="px-4 py-3 text-xs text-slate-600">{r.action}</div>
                            <div className="px-4 py-3 text-xs text-slate-600">{r.target_table || '-'}</div>
                            <div className="px-4 py-3 text-xs text-slate-600">{r.target_id || '-'}</div>
                            <div className="px-4 py-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
