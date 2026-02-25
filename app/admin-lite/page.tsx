'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Inbox, MessageSquare, ShieldAlert, ShieldCheck, Users, CreditCard, Landmark, Settings, Bot } from 'lucide-react'

type Counts = {
    inbox: number
    support: number
    reports: number
    verifications: number
    bankTransfers: number
    payments: number
    refunds: number
    chargebacks: number
    users: number
}

type MiniRow = {
    id: string
    created_at?: string | null
    status?: string | null
}

const quickLinks = [
    { href: '/admin/inbox', label: 'Operasyon', icon: Inbox },
    { href: '/admin/support', label: 'Destek', icon: MessageSquare },
    { href: '/admin/reports', label: 'Raporlar', icon: ShieldAlert },
    { href: '/admin/verifications', label: 'Dogrulamalar', icon: ShieldCheck },
    { href: '/admin/users', label: 'Kullanicilar', icon: Users },
    { href: '/admin/payments', label: 'Odemeler', icon: CreditCard },
    { href: '/admin/bank-transfers', label: 'Banka Transferleri', icon: Landmark },
    { href: '/admin/settings', label: 'Ayarlar', icon: Settings },
]

export default function AdminLitePage() {
    const [counts, setCounts] = useState<Counts>({
        inbox: 0,
        support: 0,
        reports: 0,
        verifications: 0,
        bankTransfers: 0,
        payments: 0,
        refunds: 0,
        chargebacks: 0,
        users: 0,
    })
    const [loading, setLoading] = useState(true)
    const [lists, setLists] = useState<Record<string, MiniRow[]>>({})

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const res = await fetch('/api/admin/lite')
            if (!res.ok) {
                setLoading(false)
                return
            }
            const payload = await res.json()
            setCounts((prev) => payload.counts || prev)
            setLists(payload.lists || {})
            setLoading(false)
        }
        load()
    }, [])

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fafc,_#eef2f7_45%,_#e2e8f0)] text-slate-900">
            <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-[11px] uppercase tracking-[0.35em] text-slate-400 font-semibold">ADMIN</div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold">LITE</h1>
                            <span className="text-[10px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-semibold">HAFIF</span>
                        </div>
                        <p className="text-sm text-slate-600">Kritik ozet ve hizli aksiyonlar</p>
                    </div>
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50"
                    >
                        <LayoutDashboard size={16} />
                        Tam Panel
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="text-xs uppercase tracking-wider text-slate-500">Bekleyen Toplam</div>
                        <div className="text-3xl font-bold text-slate-900 mt-2">{loading ? '...' : counts.inbox}</div>
                        <div className="text-xs text-slate-500 mt-1">Operasyon + Odeme kalemleri</div>
                        <div className="mt-3">
                            <Link href="/admin/inbox" className="text-xs font-semibold text-slate-700 hover:text-slate-900">
                                Operasyon Kutusu →
                            </Link>
                        </div>
                    </div>
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="text-xs uppercase tracking-wider text-slate-500">Bot Mesajlasma</div>
                        <div className="text-sm text-slate-600 mt-2">AI yerine sohbeti devral</div>
                        <div className="mt-3 flex gap-2">
                            <Link href="/admin/bot-chats" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50">
                                <Bot size={14} />
                                Bot Sohbetleri
                            </Link>
                            <Link href="/admin/bot-handoffs" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50">
                                Handofflar
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Destek', value: counts.support, href: '/admin/support' },
                        { label: 'Raporlar', value: counts.reports, href: '/admin/reports' },
                        { label: 'Dogrulama', value: counts.verifications, href: '/admin/verifications' },
                        { label: 'Banka Transfer', value: counts.bankTransfers, href: '/admin/bank-transfers' },
                        { label: 'Odemeler', value: counts.payments, href: '/admin/payments' },
                        { label: 'Refunds', value: counts.refunds, href: '/admin/refunds' },
                        { label: 'Chargebacks', value: counts.chargebacks, href: '/admin/chargebacks' },
                        { label: 'Kullanicilar', value: counts.users, href: '/admin/users' },
                    ].map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-sm hover:border-slate-300 transition-all"
                        >
                            <div className="text-[11px] uppercase tracking-wider text-slate-500">{item.label}</div>
                            <div className="text-xl font-bold text-slate-900 mt-2">
                                {loading ? '...' : item.value}
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[
                        { key: 'support', title: 'Destek', href: '/admin/support' },
                        { key: 'reports', title: 'Raporlar', href: '/admin/reports' },
                        { key: 'verifications', title: 'Dogrulamalar', href: '/admin/verifications' },
                        { key: 'bankTransfers', title: 'Banka Transferleri', href: '/admin/bank-transfers' },
                        { key: 'payments', title: 'Odemeler', href: '/admin/payments' },
                        { key: 'refunds', title: 'Refunds', href: '/admin/refunds' },
                        { key: 'chargebacks', title: 'Chargebacks', href: '/admin/chargebacks' },
                        { key: 'users', title: 'Kullanicilar', href: '/admin/users' },
                    ].map((section) => (
                        <div key={section.key} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="text-xs uppercase tracking-wider text-slate-500">Son 5 - {section.title}</div>
                                <Link href={section.href} className="text-xs font-semibold text-slate-600 hover:text-slate-900">Git →</Link>
                            </div>
                            <div className="mt-3 space-y-2 text-xs text-slate-700">
                                {(lists[section.key] || []).length === 0 && (
                                    <div className="text-slate-400">Kayit yok</div>
                                )}
                                {(lists[section.key] || []).map((row) => (
                                    <div key={row.id} className="flex items-center justify-between gap-3">
                                        <div className="truncate">{row.id.slice(0, 6)}</div>
                                        <div className="flex items-center gap-2 text-slate-500">
                                            {row.status ? <span className="uppercase">{row.status}</span> : null}
                                            {row.created_at ? <span>{new Date(row.created_at).toLocaleString()}</span> : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {quickLinks.map((item) => {
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-sm hover:border-slate-300 transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                                    <Icon size={18} />
                                </div>
                                <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
