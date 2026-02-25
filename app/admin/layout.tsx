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
    const pathname = usePathname()
    if (pathname === '/admin/login') {
        return (
            <div className="min-h-screen bg-slate-950 text-white admin-font">
                {children}
            </div>
        )
    }
    return <AdminShellLayout>{children}</AdminShellLayout>
}

function AdminShellLayout({ children }: { children: React.ReactNode }) {
    const t = useT()
    const pathname = usePathname()
    const router = useRouter()
    const { user, setUser } = useAuthStore()
    const supabase = useMemo(() => createClient(), [])
    const [notificationUnread, setNotificationUnread] = useState(0)
    const [actionableUnread, setActionableUnread] = useState(0)
    const [slaRisk, setSlaRisk] = useState(0)
    const [menuBadges, setMenuBadges] = useState<Record<string, number>>({})
    const { has } = useAdminPermissions(user?.id)

    const [isCollapsed, setIsCollapsed] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
    const [adminMode, setAdminMode] = useState<'basic' | 'advanced'>('basic')

    // Real-time Variables
    const [onlineUsersFallback, setOnlineUsersFallback] = useState(0)
    const [systemLoad, setSystemLoad] = useState<'Düşük' | 'Normal' | 'Yüksek'>('Normal')
    const [systemPing, setSystemPing] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const searchInputRef = useRef<HTMLInputElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const realtimeOnlineCount = usePresenceStore((s) => s.onlineUsers.size)

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

    useEffect(() => {
        if (!menuOpen) return
        const handleClick = (e: MouseEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('mousedown', handleClick)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [menuOpen])

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
                { href: '/admin/packages', label: 'Paketler', icon: Gift, perm: 'payments.manage' },
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
                { href: '/admin/staff', label: 'Yönetici Ekibi', icon: ShieldCheck, perm: 'ops.view' },
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
                { href: '/admin/ai-fallback', label: 'AI Fallback', icon: Sliders, perm: 'ops.view' },
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
        if (!user) return
        fetch('/api/admin/access-log', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ path: pathname }),
        }).catch(() => undefined)
    }, [user, pathname])

    useEffect(() => {
        const loadShell = async () => {
            if (!user) return
            const res = await fetch('/api/admin/shell-metrics', { method: 'POST' })
            if (!res.ok) return
            const payload = await res.json()
            const elapsed = Number(payload?.duration_ms || 0)
            setSystemPing(elapsed)
            if (elapsed < 300) setSystemLoad('Düşük')
            else if (elapsed < 800) setSystemLoad('Normal')
            else setSystemLoad('Yüksek')
            setSlaRisk(Number(payload?.sla_risk || 0))
            setNotificationUnread(Number(payload?.notification_unread || 0))
            setActionableUnread(Number(payload?.actionable_unread || 0))
            setMenuBadges(payload?.menu_badges || {})
            setOnlineUsersFallback(Number(payload?.online_fallback || 0))
        }

        const id = setTimeout(() => {
            void loadShell()
        }, 0)

        // Refresh SLA every minute to keep admin updated
        const interval = setInterval(() => {
            void loadShell()
        }, 60000)

        return () => {
            clearTimeout(id)
            clearInterval(interval)
        }
    }, [user])

    return (
        <AdminGate>
            <div className="min-h-screen bg-slate-50 text-slate-900 flex admin-font admin-shell relative overflow-x-hidden">
                <aside className={clsx(
                    "border-r border-slate-200 bg-white flex flex-col fixed left-0 top-0 h-screen transition-all duration-300 z-50 flex-shrink-0 overflow-hidden",
                    isCollapsed ? "w-[72px]" : "w-64"
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
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-500 font-medium">Admin</span>
                                        <Link href="/admin-lite" className="text-[9px] px-1.5 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 font-semibold">
                                            LITE
                                        </Link>
                                    </div>
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
                                            {!isCollapsed && item.href === '/admin/notifications' && notificationUnread > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                                    {notificationUnread}
                                                </span>
                                            )}
                                            {!isCollapsed && item.href !== '/admin/notifications' && (menuBadges[item.href] || 0) > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                                    {menuBadges[item.href]}
                                                </span>
                                            )}
                                            {isCollapsed && item.href === '/admin/notifications' && notificationUnread > 0 && (
                                                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-white" />
                                            )}
                                            {isCollapsed && item.href !== '/admin/notifications' && (menuBadges[item.href] || 0) > 0 && (
                                                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 border-2 border-white" />
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
                <main className={clsx("flex-1", isCollapsed ? "ml-[72px]" : "ml-64")}>
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
                                <div className="flex items-center gap-2 shrink-0 ml-auto">
                                    <div className="flex items-center gap-2">
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
                                        <Link href="/admin/ops" className={`flex items-center gap-1.5 whitespace-nowrap text-[11px] sm:text-xs px-3 py-1.5 rounded-xl border font-medium transition-colors ${slaRisk > 0 ? 'border-rose-200 bg-rose-50 text-rose-700 shadow-[0_0_12px_rgba(244,63,94,0.1)]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                            <Timer size={14} className={slaRisk > 0 ? 'text-rose-500' : 'text-slate-400'} />
                                            <span>SLA: {slaRisk}</span>
                                        </Link>
                                        <Link href="/admin/inbox" className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shrink-0 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer relative" title="Operasyon Kutusu">
                                            <Inbox size={16} />
                                            {actionableUnread > 0 && <span className="absolute top-0 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white" />}
                                        </Link>
                                    </div>
                                    <div ref={menuRef} className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-1 relative">
                                        <button
                                            type="button"
                                            onClick={() => setMenuOpen((prev) => !prev)}
                                            className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 border border-slate-300 shadow-sm shrink-0 flex items-center justify-center text-slate-600 font-bold text-xs uppercase overflow-hidden transition-all hover:ring-2 hover:ring-slate-200"
                                            aria-label="Admin menu"
                                            aria-haspopup="menu"
                                            aria-expanded={menuOpen}
                                        >
                                            {user?.email?.charAt(0) || 'A'}
                                        </button>
                                        {menuOpen && (
                                            <div
                                                role="menu"
                                                className="absolute right-0 top-full mt-2 bg-white border border-slate-200 shadow-xl rounded-xl p-1.5 flex flex-col w-44 z-50"
                                            >
                                                <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                                    {user?.email || 'Admin'}
                                                </div>
                                                <Link
                                                    href="/admin/settings"
                                                    onClick={() => setMenuOpen(false)}
                                                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                                >
                                                    <Settings size={14} /> Ayarlar
                                                </Link>
                                                <Link
                                                    href="/feed"
                                                    onClick={() => setMenuOpen(false)}
                                                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                                                >
                                                    <LayoutDashboard size={14} /> Ana Site
                                                </Link>
                                                <button
                                                    onClick={async () => {
                                                        await supabase.auth.signOut()
                                                        setUser(null)
                                                        router.push('/admin/login')
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors w-full text-left"
                                                >
                                                    <LogOut size={14} /> Çıkış Yap
                                                </button>
                                            </div>
                                        )}
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





