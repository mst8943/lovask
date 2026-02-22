'use client'

import AdminGate from '@/components/layout/AdminGate'
import Link from 'next/link'
import { useT } from '@/hooks/useT'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { LayoutDashboard, Landmark, ShieldAlert, Bot, MessageSquare, Sliders, Users, Cpu, CreditCard, Settings, ShieldCheck, Gift, Timer, Bell, Camera, Zap, Search, Inbox, Activity, Shield, Menu, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useEffect, useMemo, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAdminPermissions } from '@/hooks/useAdminPermissions'
import PresenceHeartbeat from '@/components/presence/PresenceHeartbeat'
import { usePresenceStore } from '@/store/usePresenceStore'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const t = useT()
    const pathname = usePathname()
    const router = useRouter()
    const { user, setUser } = useAuthStore()
    const supabase = useMemo(() => createClient(), [])
    const [unread, setUnread] = useState(0)
    const [slaRisk, setSlaRisk] = useState(0)
    const { has } = useAdminPermissions(user?.id)

    const [isCollapsed, setIsCollapsed] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
    const [adminMode, setAdminMode] = useState<'basic' | 'advanced'>('basic')

    // Real-time Variables
    const [onlineUsersFallback, setOnlineUsersFallback] = useState(0)
    const [systemLoad, setSystemLoad] = useState<'Düşük' | 'Normal' | 'Yüksek'>('Normal')
    const [systemPing, setSystemPing] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const searchInputRef = useRef<HTMLInputElement>(null)
    const realtimeOnlineCount = usePresenceStore((s) => s.onlineUsers.size)

    useEffect(() => {
        // Fetch actual online users (active in last 10 minutes)
        const fetchOnlineUsers = async () => {
            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
            const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).gte('last_active_at', tenMinsAgo)
            setOnlineUsersFallback(count || 0)
        }
        fetchOnlineUsers()
        const interval = setInterval(fetchOnlineUsers, 60000)
        return () => clearInterval(interval)
    }, [supabase])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            router.push(`/admin/global-search?q=${encodeURIComponent(searchQuery)}`)
            setSearchQuery('')
        }
    }

    const groups = useMemo(() => [
        {
            key: 'overview',
            title: 'Genel',
            level: 'basic',
            items: [
                { href: '/admin', label: t('nav.overview'), icon: LayoutDashboard, perm: 'ops.view' },
                { href: '/admin/global-search', label: 'Global Arama', icon: Search, perm: 'ops.view' },
                { href: '/admin/search', label: 'Hızlı Arama', icon: Search, perm: 'ops.view' },
                { href: '/admin/users', label: t('nav.users'), icon: Users, perm: 'users.manage' },
                { href: '/admin/notifications', label: 'Bildirim Merkezi', icon: Bell, perm: 'support.manage' },
            ],
        },
        {
            key: 'ops',
            title: 'Operasyon',
            level: 'basic',
            items: [
                { href: '/admin/inbox', label: 'Operasyon Kutusu', icon: Inbox, perm: 'ops.view' },
                { href: '/admin/support', label: t('nav.support'), icon: MessageSquare, perm: 'support.manage' },
                { href: '/admin/reports', label: t('nav.reports'), icon: ShieldAlert, perm: 'reports.manage' },
                { href: '/admin/verifications', label: t('nav.verifications'), icon: ShieldCheck, perm: 'support.manage' },
                { href: '/admin/gifts', label: t('nav.gifts'), icon: Gift },
                { href: '/admin/profile-variants', label: 'Profil Varyantları', icon: Users, perm: 'users.manage' },
                { href: '/admin/content-quality', label: 'İçerik Kalitesi', icon: Shield, perm: 'ops.view' },
                { href: '/admin/stories', label: t('nav.stories'), icon: Camera },
            ],
        },
        {
            key: 'finance',
            title: 'Finans',
            level: 'basic',
            items: [
                { href: '/admin/economy', label: 'Ekonomi', icon: CreditCard, perm: 'payments.manage' },
                { href: '/admin/bank-transfers', label: t('nav.bank_transfers'), icon: Landmark, perm: 'payments.manage' },
                { href: '/admin/access-plans', label: t('nav.access_plans'), icon: Timer, perm: 'payments.manage' },
                { href: '/admin/boosts', label: 'Boostlar', icon: Zap, perm: 'payments.manage' },
            ],
        },
        {
            key: 'bots',
            title: 'Botlar',
            level: 'advanced',
            items: [
                { href: '/admin/bot-management', label: 'Bot Yönetimi', icon: Bot, perm: 'users.manage' },
                { href: '/admin/bot-monitoring', label: 'Bot İzleme', icon: Activity, perm: 'ops.view' },
                { href: '/admin/bot-interactions', label: 'Bot Etkileşim', icon: MessageSquare, perm: 'users.manage' },
                { href: '/admin/bot-optimization', label: 'Bot Optimizasyon', icon: Sliders, perm: 'ops.view' },
            ],
        },
        {
            key: 'system',
            title: 'Sistem',
            level: 'advanced',
            items: [
                { href: '/admin/ops', label: 'Operasyon Merkezi', icon: Activity, perm: 'ops.view' },
                { href: '/admin/audit', label: 'Audit', icon: ShieldAlert, perm: 'ops.view' },
                { href: '/admin/settings', label: 'Admin Ayarları', icon: Settings, perm: 'ops.view' },
            ],
        },
        {
            key: 'security',
            title: 'Risk & Güvenlik',
            level: 'advanced',
            items: [
                { href: '/admin/moderation', label: 'Moderasyon', icon: Shield, perm: 'reports.manage' },
                { href: '/admin/incidents', label: 'Incident', icon: ShieldAlert, perm: 'incidents.manage' },
                { href: '/admin/risk', label: 'Risk', icon: Activity, perm: 'risk.view' },
                { href: '/admin/insights', label: 'Anomali', icon: Activity, perm: 'ops.view' },
            ],
        },
        {
            key: 'payments',
            title: 'Ödeme & Fraud',
            level: 'advanced',
            items: [
                { href: '/admin/payments', label: t('nav.payments'), icon: CreditCard, perm: 'payments.manage' },
                { href: '/admin/transactions', label: t('nav.transactions'), icon: CreditCard, perm: 'payments.manage' },
                { href: '/admin/chargebacks', label: 'Chargebacks', icon: CreditCard, perm: 'payments.manage' },
                { href: '/admin/refunds', label: 'Refunds', icon: CreditCard, perm: 'payments.manage' },
            ],
        },
        {
            key: 'ai',
            title: 'AI & Deneyler',
            level: 'advanced',
            items: [
                { href: '/admin/ai', label: t('nav.ai_usage'), icon: Cpu, perm: 'ops.view' },
            ],
        },
    ], [t])
    const filteredGroups = useMemo(() => {
        return groups
            .filter((group) => group.level === adminMode)
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => has(item.perm)),
            }))
            .filter((group) => group.items.length > 0)
    }, [groups, has, adminMode])
    const labelMap = useMemo(() => {
        const map = new Map<string, string>()
        groups.forEach((group) => {
            group.items.forEach((item) => {
                if (!map.has(item.href)) map.set(item.href, item.label as string)
            })
        })
        return map
    }, [groups])
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
        overview: true,
        ops: true,
        finance: true,
        bots: true,
        system: true,
        security: true,
        payments: true,
        ai: true,
    })

    useEffect(() => {
        const load = async () => {
            if (!user) return
            const { count } = await supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false)
            setUnread(count || 0)
        }
        load()
    }, [user, supabase])

    useEffect(() => {
        const loadSla = async () => {
            if (!user) return
            const { data: slaRows } = await supabase.from('admin_sla_settings').select('queue,sla_hours')
            const slaMap = Object.fromEntries((slaRows || []).map((r: { queue: string; sla_hours: number }) => [r.queue, r.sla_hours]))
            const [supportRes, reportsRes, verRes, transfersRes] = await Promise.all([
                supabase.from('support_tickets').select('id,created_at,status').in('status', ['open', 'pending']).order('created_at', { ascending: false }).limit(200),
                supabase.from('reports').select('id,created_at,status').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
                supabase.from('user_verifications').select('id,created_at,status').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
                supabase.from('bank_transfers').select('id,created_at,status').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
            ])
            const now = Date.now()
            const countRisk = (rows: Array<{ created_at: string }>, slaHours: number) => {
                const totalMs = slaHours * 60 * 60 * 1000
                return rows.reduce((acc, row) => {
                    const due = new Date(row.created_at).getTime() + totalMs
                    if (now >= due) return acc + 1
                    if (due - now <= totalMs * 0.2) return acc + 1
                    return acc
                }, 0)
            }
            const risk =
                countRisk((supportRes.data || []) as Array<{ created_at: string }>, slaMap.support || 6)
                + countRisk((reportsRes.data || []) as Array<{ created_at: string }>, slaMap.reports || 2)
                + countRisk((verRes.data || []) as Array<{ created_at: string }>, slaMap.verifications || 24)
                + countRisk((transfersRes.data || []) as Array<{ created_at: string }>, slaMap.payments || 12)
            setSlaRisk(risk)
        }
        const id = setTimeout(() => {
            void loadSla()
        }, 0)
        return () => clearTimeout(id)
    }, [user, supabase])

    useEffect(() => {
        if (!user) return
        fetch('/api/admin/access-log', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path: pathname }),
        }).catch(() => undefined)
        // Access log tracking
        fetch('/api/admin/access-log', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path: pathname }),
        }).catch(() => undefined)
    }, [user, pathname])

    useEffect(() => {
        const loadSla = async () => {
            if (!user) return
            const start = performance.now()

            const { data: slaRows } = await supabase.from('admin_sla_settings').select('queue,sla_hours')
            const slaMap = Object.fromEntries((slaRows || []).map((r: { queue: string; sla_hours: number }) => [r.queue, r.sla_hours]))
            const [supportRes, reportsRes, verRes, transfersRes] = await Promise.all([
                supabase.from('support_tickets').select('id,created_at,status').in('status', ['open', 'pending']).order('created_at', { ascending: false }).limit(200),
                supabase.from('reports').select('id,created_at,status').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
                supabase.from('user_verifications').select('id,created_at,status').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
                supabase.from('bank_transfers').select('id,created_at,status').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
            ])

            const end = performance.now()
            const elapsed = Math.round(end - start)
            setSystemPing(elapsed)
            if (elapsed < 300) setSystemLoad('Düşük')
            else if (elapsed < 800) setSystemLoad('Normal')
            else setSystemLoad('Yüksek')

            const actionableCount = (supportRes.data?.length || 0) + (reportsRes.data?.length || 0) + (verRes.data?.length || 0) + (transfersRes.data?.length || 0)
            setUnread(actionableCount)

            const now = Date.now()
            const countRisk = (rows: Array<{ created_at: string }>, slaHours: number) => {
                const totalMs = slaHours * 60 * 60 * 1000
                return rows.reduce((acc, row) => {
                    const due = new Date(row.created_at).getTime() + totalMs
                    if (now >= due) return acc + 1
                    if (due - now <= totalMs * 0.2) return acc + 1
                    return acc
                }, 0)
            }
            const risk =
                countRisk((supportRes.data || []) as Array<{ created_at: string }>, slaMap.support || 6)
                + countRisk((reportsRes.data || []) as Array<{ created_at: string }>, slaMap.reports || 2)
                + countRisk((verRes.data || []) as Array<{ created_at: string }>, slaMap.verifications || 24)
                + countRisk((transfersRes.data || []) as Array<{ created_at: string }>, slaMap.payments || 12)
            setSlaRisk(risk)
        }

        const id = setTimeout(() => {
            void loadSla()
        }, 0)

        // Refresh SLA every minute to keep admin updated
        const interval = setInterval(() => {
            void loadSla()
        }, 60000)

        return () => {
            clearTimeout(id)
            clearInterval(interval)
        }
    }, [user, supabase])

    return (
        <AdminGate>
            <div className="min-h-screen bg-slate-50 text-slate-900 flex admin-font admin-shell relative overflow-x-hidden">
                <aside className={clsx(
                    "border-r border-slate-200 bg-white flex flex-col sticky top-0 h-screen self-start transition-all duration-300 z-50 flex-shrink-0 overflow-hidden",
                    isCollapsed ? "w-[72px]" : "w-64 absolute md:relative"
                )}>
                    <div className={clsx(
                        "relative z-10 border-b border-slate-200 bg-white h-[76px] box-border shadow-[0_1px_0_rgba(15,23,42,0.04)] flex items-center shrink-0",
                        isCollapsed ? "justify-center px-0" : "justify-between px-4"
                    )}>
                        {!isCollapsed && (
                            <div className="flex flex-col pt-0.5">
                                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400 font-medium">Lovask</div>
                                <div className="flex items-center justify-between gap-2 mt-0.5 mb-1">
                                    <div className="text-base font-semibold tracking-[0.01em] text-slate-900 leading-none">{t('admin.title')}</div>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-500 font-medium">Admin</span>
                                </div>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                    </div>
                    <div className={clsx("flex flex-col gap-4 overflow-y-auto overflow-x-hidden h-full", isCollapsed ? 'p-2' : 'p-4')}>
                        {!isCollapsed && (
                            <>
                                <div className="text-[11px] uppercase tracking-wider text-slate-500 px-3">Yönetim</div>
                                <div className="flex items-center gap-2 px-3">
                                    <button
                                        type="button"
                                        onClick={() => setAdminMode('basic')}
                                        className={clsx(
                                            'flex-1 text-xs px-3 py-1.5 rounded-full border',
                                            adminMode === 'basic'
                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                : 'border-slate-200 bg-white text-slate-600'
                                        )}
                                    >
                                        Temel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdminMode('advanced')}
                                        className={clsx(
                                            'flex-1 text-xs px-3 py-1.5 rounded-full border',
                                            adminMode === 'advanced'
                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                : 'border-slate-200 bg-white text-slate-600'
                                        )}
                                    >
                                        Gelişmiş
                                    </button>
                                </div>
                            </>
                        )}
                        <nav className={clsx("space-y-2", isCollapsed && "mt-2")}>
                            {filteredGroups.map((group) => {
                                const isOpen = openGroups[group.key]
                                return (
                                    <div key={group.key} className={clsx("space-y-1", isCollapsed && "pb-2 border-b border-slate-100 last:border-0")}>
                                        {!isCollapsed ? (
                                            <button
                                                type="button"
                                                onClick={() => setOpenGroups((prev) => ({ ...prev, [group.key]: !isOpen }))}
                                                className="w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-slate-500 hover:text-slate-800"
                                            >
                                                <span>{group.title}</span>
                                                <span className="text-[10px]">{isOpen ? '-' : '+'}</span>
                                            </button>
                                        ) : null}
                                        {((!isCollapsed && isOpen) || isCollapsed) && (
                                            <div className="space-y-1">
                                                {group.items.map((item) => {
                                                    const active = pathname === item.href
                                                    const Icon = item.icon
                                                    return (
                                                        <Link
                                                            key={item.href}
                                                            href={item.href}
                                                            title={isCollapsed ? item.label as string : undefined}
                                                            className={clsx(
                                                                'relative flex items-center rounded-lg text-sm border transition-colors group',
                                                                isCollapsed ? 'justify-center p-2.5 mx-auto w-10 h-10' : 'gap-3 px-3 py-2.5',
                                                                active
                                                                    ? 'bg-slate-100 border-slate-200 text-slate-900'
                                                                    : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                                                            )}
                                                        >
                                                            <Icon size={isCollapsed ? 18 : 16} className={clsx('shrink-0 transition-colors', active ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600')} />
                                                            {!isCollapsed && <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
                                                            {!isCollapsed && item.href === '/admin/notifications' && unread > 0 && (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                                                    {unread}
                                                                </span>
                                                            )}
                                                            {isCollapsed && item.href === '/admin/notifications' && unread > 0 && (
                                                                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-white" />
                                                            )}
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </nav>
                        {!isCollapsed && (
                            <div className="mt-auto px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 shrink-0">
                                Tüm işlemler kayıt altındadır.
                            </div>
                        )}
                    </div>
                </aside>
                <main className="flex-1">
                    <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200 px-6 h-[76px] flex items-center box-border">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex-1 flex items-center justify-between gap-4 transition-all">
                                {/* Search & Quick Actions Area */}
                                <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full max-w-sm hover:ring-2 hover:ring-slate-100 transition-all focus-within:ring-2 focus-within:border-slate-300">
                                    <Search size={16} className="text-slate-400 shrink-0" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Kullanıcı, E-posta veya ID + ↵"
                                        className="bg-transparent border-none outline-none text-xs text-slate-700 w-full placeholder:text-slate-400"
                                    />
                                    <kbd className="hidden lg:inline-flex items-center justify-center h-5 px-1.5 text-[10px] uppercase font-medium text-slate-400 bg-white border border-slate-200 rounded shrink-0 shadow-sm ml-2">
                                        ⌘ K
                                    </kbd>
                                </form>

                                <button onClick={() => router.push('/admin/global-search')} className="flex sm:hidden items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors">
                                    <Search size={16} />
                                </button>

                                {/* Right Side Metrics & Tools */}
                                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0 ml-auto">
                                    <div className="hidden md:flex items-center gap-3 pr-4 border-r border-slate-200 mr-2">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Sistem Yükü</span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${systemLoad === 'Düşük' ? 'bg-emerald-500' : systemLoad === 'Normal' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                                <span className="text-xs font-medium text-slate-700">{systemLoad} <span className="text-[10px] text-slate-400 font-normal">({systemPing}ms)</span></span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Online</span>
                                            <span className="text-xs font-medium text-slate-700 mt-0.5">{(realtimeOnlineCount || onlineUsersFallback).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <Link href="/admin/inbox" className={`flex items-center gap-1.5 whitespace-nowrap text-[11px] sm:text-xs px-3 py-1.5 rounded-xl border font-medium transition-colors ${slaRisk > 0 ? 'border-rose-200 bg-rose-50 text-rose-700 shadow-[0_0_12px_rgba(244,63,94,0.1)]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                        <Timer size={14} className={slaRisk > 0 ? 'text-rose-500' : 'text-slate-400'} />
                                        <span>SLA: {slaRisk}</span>
                                    </Link>
                                    <Link href="/admin/inbox" className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shrink-0 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer relative" title="Operasyon Kutusu">
                                        <Inbox size={16} />
                                        {unread > 0 && <span className="absolute top-0 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white" />}
                                    </Link>
                                    <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1 group relative cursor-pointer">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 border border-slate-300 shadow-sm shrink-0 flex items-center justify-center text-slate-600 font-bold text-xs uppercase overflow-hidden transition-all group-hover:ring-2 group-hover:ring-slate-200">
                                            {user?.email?.charAt(0) || 'A'}
                                        </div>
                                        <div className="absolute right-0 top-[120%] bg-white border border-slate-200 shadow-xl rounded-xl p-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col w-40 z-50">
                                            <Link href="/admin/settings" className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors">
                                                <Settings size={14} /> Ayarlar
                                            </Link>
                                            <button onClick={async () => { await supabase.auth.signOut(); setUser(null); router.push('/auth'); }} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors w-full text-left">
                                                <LogOut size={14} /> Çıkış Yap
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="w-full px-6 pt-4 pb-6">
                        <div className="max-w-6xl mx-auto admin-page">
                            <div className="text-xs font-medium text-slate-500 mb-5 flex items-center gap-1.5 uppercase tracking-wide">
                                {(() => {
                                    const parts = pathname.split('/').filter(Boolean).slice(1)
                                    const crumbs = ['Admin', ...parts.map((p, idx) => {
                                        const href = `/admin/${parts.slice(0, idx + 1).join('/')}`
                                        return labelMap.get(href) || p
                                    })]
                                    return crumbs.map((crumb, i) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                            {i > 0 && <span className="text-slate-300">/</span>}
                                            <span className={i === crumbs.length - 1 ? 'text-slate-900 font-semibold' : 'text-slate-500'}>
                                                {crumb}
                                            </span>
                                        </div>
                                    ))
                                })()}
                            </div>
                            {children}
                        </div>
                    </div>
                </main>
                <PresenceHeartbeat />
            </div>
        </AdminGate>
    )
}





