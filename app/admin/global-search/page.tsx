'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type ResultRow = {
    id: string
    label: string
    href: string
    meta?: string
}

export default function AdminGlobalSearchPage() {
    const supabase = createClient()
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<Record<string, ResultRow[]>>({
        users: [],
        transactions: [],
        reports: [],
        support: [],
        verifications: [],
    })

    useEffect(() => {
        const id = setTimeout(() => {
            if (!query.trim()) {
                setResults({ users: [], transactions: [], reports: [], support: [], verifications: [] })
                return
            }
            const run = async () => {
                setLoading(true)
                const term = query.trim()
                const [usersRes, profilesRes, txRes, reportsRes, supportRes, verRes] = await Promise.all([
                    supabase.from('users').select('id,email').ilike('email', `%${term}%`).limit(10),
                    supabase.from('profiles').select('id,display_name').or(`id.ilike.%${term}%,display_name.ilike.%${term}%`).limit(10),
                    supabase.from('transactions').select('id,user_id,type,amount,created_at').or(`id.ilike.%${term}%,user_id.ilike.%${term}%`).limit(10),
                    supabase.from('reports').select('id,reported_id,reason,status').or(`id.ilike.%${term}%,reported_id.ilike.%${term}%`).limit(10),
                    supabase.from('support_tickets').select('id,user_id,subject,status').or(`id.ilike.%${term}%,user_id.ilike.%${term}%`).limit(10),
                    supabase.from('user_verifications').select('id,user_id,type,status').or(`id.ilike.%${term}%,user_id.ilike.%${term}%`).limit(10),
                ])

                const userRows: ResultRow[] = [
                    ...(usersRes.data || []).map((u: { id: string; email: string | null }) => ({
                        id: u.id,
                        label: u.email || u.id,
                        href: `/admin/users?q=${u.id}`,
                        meta: 'Users',
                    })),
                    ...(profilesRes.data || []).map((p: { id: string; display_name: string | null }) => ({
                        id: p.id,
                        label: p.display_name || p.id,
                        href: `/admin/users?q=${p.id}`,
                        meta: 'Profiles',
                    })),
                ]
                const txRows: ResultRow[] = (txRes.data || []).map((t: { id: string; user_id: string; type: string; amount: number }) => ({
                    id: t.id,
                    label: `${t.type} · ${t.amount}`,
                    href: `/admin/transactions?q=${t.id}`,
                    meta: t.user_id,
                }))
                const reportRows: ResultRow[] = (reportsRes.data || []).map((r: { id: string; reported_id: string; reason: string | null; status: string }) => ({
                    id: r.id,
                    label: `${r.reason || 'Rapor'} · ${r.status}`,
                    href: `/admin/reports`,
                    meta: r.reported_id,
                }))
                const supportRows: ResultRow[] = (supportRes.data || []).map((r: { id: string; user_id: string; subject: string; status: string }) => ({
                    id: r.id,
                    label: `${r.subject} · ${r.status}`,
                    href: `/admin/support`,
                    meta: r.user_id,
                }))
                const verRows: ResultRow[] = (verRes.data || []).map((r: { id: string; user_id: string; type: string; status: string }) => ({
                    id: r.id,
                    label: `${r.type} · ${r.status}`,
                    href: `/admin/verifications`,
                    meta: r.user_id,
                }))

                setResults({
                    users: userRows,
                    transactions: txRows,
                    reports: reportRows,
                    support: supportRows,
                    verifications: verRows,
                })
                setLoading(false)
            }
            void run()
        }, 0)
        return () => clearTimeout(id)
    }, [query, supabase])

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Global Arama</h1>
                    <p className="text-sm text-gray-400">Kullanıcı, ödeme, rapor, destek, doğrulama</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                    Arama
                </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Email, user id, transaction id, report id..."
                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10"
                />
            </div>

            {loading && <div className="text-sm text-gray-400">Aranıyor...</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['users', 'transactions', 'reports', 'support', 'verifications'] as const).map((key) => (
                    <div key={key} className="glass-panel p-4 rounded-2xl">
                        <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">{key}</div>
                        {results[key].length === 0 ? (
                            <div className="text-xs text-gray-400">Kayıt yok.</div>
                        ) : (
                            <div className="space-y-2 text-xs">
                                {results[key].map((row) => (
                                    <Link key={row.id} href={row.href} className="flex items-center justify-between hover:text-white">
                                        <div className="truncate">{row.label}</div>
                                        <div className="text-gray-500">{row.meta}</div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
