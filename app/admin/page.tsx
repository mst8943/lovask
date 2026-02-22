'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    ArrowUpRight,
    Bot,
    BrainCircuit,
    CheckCircle2,
    CreditCard,
    LifeBuoy,
    ShieldAlert,
    Sparkles,
    UserCheck,
    Users,
    Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type DashboardCounts = {
    pendingTransfers: number
    pendingReports: number
    pendingVerifications: number
    pendingTickets: number
    botCount: number
    userCount: number
    bannedCount: number
    activeStories: number
    aiUsage24h: number
}

type Tone = 'alert' | 'warning' | 'ok' | 'neutral'

type TrendPoint = { start: number; value: number }

export default function AdminHomePage() {
    const [counts, setCounts] = useState<DashboardCounts>({
        pendingTransfers: 0,
        pendingReports: 0,
        pendingVerifications: 0,
        pendingTickets: 0,
        botCount: 0,
        userCount: 0,
        bannedCount: 0,
        activeStories: 0,
        aiUsage24h: 0,
    })
    const [trends, setTrends] = useState<{
        transfers: TrendPoint[]
        reports: TrendPoint[]
        verifications: TrendPoint[]
        tickets: TrendPoint[]
    }>({
        transfers: [],
        reports: [],
        verifications: [],
        tickets: [],
    })
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const [{ data: countsRow }, { data: trendRows }] = await Promise.all([
                supabase.rpc('admin_dashboard_counts'),
                supabase.rpc('admin_dashboard_trends', { p_hours: 24, p_buckets: 12 }),
            ])

            const countsData = Array.isArray(countsRow) ? countsRow[0] : countsRow
            setCounts({
                pendingTransfers: countsData?.pending_transfers || 0,
                pendingReports: countsData?.pending_reports || 0,
                pendingVerifications: countsData?.pending_verifications || 0,
                pendingTickets: countsData?.pending_tickets || 0,
                botCount: countsData?.bot_count || 0,
                userCount: countsData?.user_count || 0,
                bannedCount: countsData?.banned_count || 0,
                activeStories: countsData?.active_stories || 0,
                aiUsage24h: countsData?.ai_usage_24h || 0,
            })
            const rows = (trendRows || []) as Array<{ category: string; bucket_start: string; value: number }>
            const mapTrend = (category: string) => rows
                .filter((r) => r.category === category)
                .map((r) => ({ start: new Date(r.bucket_start).getTime(), value: r.value }))
            setTrends({
                transfers: mapTrend('transfers'),
                reports: mapTrend('reports'),
                verifications: mapTrend('verifications'),
                tickets: mapTrend('tickets'),
            })
            setLoading(false)
        }
        load()
    }, [supabase])

    const pendingTotal = useMemo(
        () =>
            counts.pendingTransfers
            + counts.pendingReports
            + counts.pendingVerifications
            + counts.pendingTickets,
        [counts]
    )

    const mainKpis: Array<{
        label: string
        value: number
        href: string
        icon: LucideIcon
        tone: Tone
        sub: string
        trend: TrendPoint[]
    }> = [
        {
            label: 'Bekleyen Havale',
            value: counts.pendingTransfers,
            href: '/admin/bank-transfers',
            icon: Wallet,
            tone: counts.pendingTransfers > 0 ? 'warning' : 'ok',
            sub: 'Ödeme onayı bekleyen kayıtlar',
            trend: trends.transfers,
        },
        {
            label: 'Açık Rapor',
            value: counts.pendingReports,
            href: '/admin/reports',
            icon: ShieldAlert,
            tone: counts.pendingReports > 0 ? 'alert' : 'ok',
            sub: 'Moderasyon aksiyonu bekliyor',
            trend: trends.reports,
        },
        {
            label: 'Doğrulama Kuyruğu',
            value: counts.pendingVerifications,
            href: '/admin/verifications',
            icon: UserCheck,
            tone: counts.pendingVerifications > 0 ? 'warning' : 'neutral',
            sub: 'Kullanıcı doğrulama talepleri',
            trend: trends.verifications,
        },
        {
            label: 'Destek Talepleri',
            value: counts.pendingTickets,
            href: '/admin/support',
            icon: LifeBuoy,
            tone: counts.pendingTickets > 0 ? 'warning' : 'neutral',
            sub: 'Cevap bekleyen destek kayıtları',
            trend: trends.tickets,
        },
    ]

    const platformCards = [
        { label: 'Toplam Kullanıcı', value: counts.userCount, icon: Users },
        { label: 'Toplam Bot', value: counts.botCount, icon: Bot },
        { label: 'Banned Kullanıcı', value: counts.bannedCount, icon: ShieldAlert },
        { label: 'Aktif Story', value: counts.activeStories, icon: Sparkles },
        { label: 'AI Kullanımı (24s)', value: counts.aiUsage24h, icon: BrainCircuit },
    ]

    const toneClass: Record<Tone, string> = {
        alert: 'border-red-200 bg-red-50 text-red-700',
        warning: 'border-amber-200 bg-amber-50 text-amber-700',
        ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    }

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admin Dashboard</p>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Operasyon Merkezi</h1>
                        <p className="text-sm text-slate-600">
                            Kritik iş akışlarını tek panelde izle, öncelikli aksiyonları hızlıca tamamla.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                            Toplam Bekleyen: {loading ? '...' : pendingTotal}
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                            Sistem Durumu: Canlı
                        </span>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {mainKpis.map((item) => {
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
                        >
                            <div className="mb-4 flex items-start justify-between">
                                <div className={`rounded-xl border px-3 py-2 text-xs ${toneClass[item.tone]}`}>
                                    {item.label}
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500">
                                    <Icon size={18} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-slate-900">{loading ? '...' : item.value}</div>
                            <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
                            <div className="mt-3 flex items-end gap-1 h-8">
                                {(item.trend || []).map((b, idx) => (
                                    <div
                                        key={`${item.label}-${b.start}-${idx}`}
                                        className="flex-1 rounded-md bg-slate-200"
                                        style={{ height: `${Math.max(4, Math.min(100, b.value * 12))}%` }}
                                    />
                                ))}
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                                İncele <ArrowUpRight size={14} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </div>
                        </Link>
                    )
                })}
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold tracking-wide text-slate-700">Platform Metrikleri</h2>
                        <span className="text-xs text-slate-500">Anlık Snapshot</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {platformCards.map((card) => {
                            const Icon = card.icon
                            return (
                                <div key={card.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-xs text-slate-500">{card.label}</p>
                                        <Icon size={15} className="text-slate-400" />
                                    </div>
                                    <p className="text-2xl font-semibold text-slate-900">{loading ? '...' : card.value}</p>
                                </div>
                            )}
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-4 text-sm font-semibold tracking-wide text-slate-700">Hızlı Aksiyonlar</h2>
                    <div className="space-y-3">
                        {[
                            { href: '/admin/search', label: 'Global Arama', desc: 'Kullanıcı/ödeme/cihaz kaydı bul' },
                            { href: '/admin/inbox', label: 'Operasyon Kutusu', desc: 'Rapor, destek ve doğrulama akışı' },
                            { href: '/admin/bank-transfers', label: 'Havale Onayları', desc: 'Bekleyen transferleri değerlendir' },
                            { href: '/admin/reports', label: 'Rapor İnceleme', desc: 'Yeni gelen raporları ele al' },
                            { href: '/admin/verifications', label: 'Doğrulama Kuyruğu', desc: 'Kimlik/profil doğrulamalarını sonuçlandır' },
                            { href: '/admin/moderation', label: 'Moderasyon Kuralları', desc: 'Otomatik kuralları güncelle' },
                            { href: '/admin/insights', label: 'Anomali Paneli', desc: 'Kritik trendleri izle' },
                            { href: '/admin/notifications', label: 'Bildirim Merkezi', desc: 'Admin bildirimlerini temizle' },
                        ].map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-white"
                            >
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{item.label}</p>
                                    <p className="text-xs text-slate-500">{item.desc}</p>
                                </div>
                                <ArrowUpRight size={16} className="text-slate-400 transition group-hover:text-slate-700" />
                            </Link>
                        ))}
                    </div>
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                        <div className="mb-1 flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            Operasyon Notu
                        </div>
                        Önce transfer, rapor ve doğrulama kuyruğunu sıfırlamak SLA performansını iyileştirir.
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">Finans + Moderasyon Checkpoint</h3>
                        <p className="text-sm text-slate-600">
                            Gün sonu öncesi kritik kuyrukları tekrar kontrol ederek işlem birikmesini önleyin.
                        </p>
                    </div>
                    <Link
                        href="/admin/transactions"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:bg-white"
                    >
                        İşlemlere Git <CreditCard size={15} />
                    </Link>
                </div>
            </section>
        </div>
    )
}
