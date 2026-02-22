'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Incident = {
    id: string
    title: string
    severity: string
    status: string
    notes: string | null
    created_at: string
    closed_at: string | null
}

type IncidentEvent = {
    id: string
    incident_id: string
    action: string
    notes: string | null
    created_at: string
}

export default function AdminIncidentsPage() {
    const supabase = createClient()
    const [rows, setRows] = useState<Incident[]>([])
    const [events, setEvents] = useState<Record<string, IncidentEvent[]>>({})
    const [title, setTitle] = useState('')
    const [severity, setSeverity] = useState('medium')
    const [notes, setNotes] = useState('')

    const load = useCallback(async () => {
        const { data } = await supabase
            .from('admin_incidents')
            .select('*')
            .order('created_at', { ascending: false })
        setRows((data || []) as Incident[])
    }, [supabase])

    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])

    const createIncident = async () => {
        if (!title.trim()) return
        const { data: auth } = await supabase.auth.getUser()
        const { data } = await supabase
            .from('admin_incidents')
            .insert({
                title: title.trim(),
                severity,
                notes: notes || null,
                created_by: auth.user?.id || null,
            })
            .select('*')
            .single()
        if (data?.id) {
            await supabase.from('admin_incident_events').insert({
                incident_id: data.id,
                action: 'created',
                notes: notes || null,
                actor_id: auth.user?.id || null,
            })
        }
        setTitle('')
        setNotes('')
        await load()
    }

    const closeIncident = async (row: Incident) => {
        await supabase.from('admin_incidents').update({ status: 'closed', closed_at: new Date().toISOString() }).eq('id', row.id)
        await supabase.from('admin_incident_events').insert({
            incident_id: row.id,
            action: 'closed',
            notes: null,
        })
        await load()
    }

    const loadEvents = async (id: string) => {
        const { data } = await supabase
            .from('admin_incident_events')
            .select('*')
            .eq('incident_id', id)
            .order('created_at', { ascending: false })
        setEvents((prev) => ({ ...prev, [id]: (data || []) as IncidentEvent[] }))
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Incident</h1>
                    <p className="text-sm text-slate-500">Olay yönetimi ve timeline</p>
                </div>
                <button onClick={() => void load()} className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                    Yenile
                </button>
            </div>

            <div className="glass-panel p-4 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Incident başlığı"
                        className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    />
                    <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                    >
                        <option value="low">Dusuk</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yuksek</option>
                        <option value="critical">Kritik</option>
                    </select>
                </div>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Incident notu"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                />
                <button onClick={createIncident} className="px-3 py-2 rounded-lg bg-rose-500/20 text-rose-200">
                    Incident ac
                </button>
            </div>

            <div className="space-y-3">
                {rows.map((row) => (
                    <div key={row.id} className="glass-panel p-4 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-semibold">{row.title}</div>
                                <div className="text-xs text-slate-500">{row.severity} · {row.status}</div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <button onClick={() => loadEvents(row.id)} className="px-2 py-1 rounded-full border border-slate-200 bg-white">Timeline</button>
                                {row.status !== 'closed' && (
                                    <button onClick={() => closeIncident(row)} className="px-2 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700">Kapat</button>
                                )}
                            </div>
                        </div>
                        {row.notes && <div className="text-xs text-slate-600">{row.notes}</div>}
                        {events[row.id]?.length ? (
                            <div className="text-xs text-slate-500 space-y-1">
                                {events[row.id].map((e) => (
                                    <div key={e.id}>{new Date(e.created_at).toLocaleString()} · {e.action}</div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    )
}
