'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Bell, ChevronDown, LogOut, Settings, Wallet, Gift, Ban, HelpCircle, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabase/client'
import CoinBalance from '@/components/layout/CoinBalance'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { usePathname, useRouter } from 'next/navigation'
import { useNotificationsUnread } from '@/hooks/useNotificationsUnread'
import { Button } from '@/components/ui/Button'
import { markNotificationRead } from '@/services/notificationService'

export default function UserHeader() {
    const { user, setSession } = useAuthStore()
    const supabase = useMemo(() => createClient(), [])
    const pathname = usePathname()
    const router = useRouter()
    const mainRoute = '/swipe'
    const isMain = pathname === mainRoute
    const [photoUrl, setPhotoUrl] = useState('/placeholder-user.jpg')
    const [open, setOpen] = useState(false)
    const unread = useNotificationsUnread(user?.id)
    const menuRef = useRef<HTMLDivElement | null>(null)
    const notifRef = useRef<HTMLDivElement | null>(null)
    const [notifOpen, setNotifOpen] = useState(false)
    const [notifLoading, setNotifLoading] = useState(false)
    const [recentNotifs, setRecentNotifs] = useState<Array<{
        id: string
        type: string
        payload: Record<string, unknown> | null
        is_read: boolean
        created_at: string
    }>>([])

    useEffect(() => {
        const load = async () => {
            if (!user) return
            const { data } = await supabase
                .from('profiles')
                .select('photos')
                .eq('id', user.id)
                .maybeSingle()
            if (data?.photos) {
                try {
                    const photos = Array.isArray(data.photos) ? data.photos : JSON.parse(data.photos)
                    if (photos?.[0]) setPhotoUrl(photos[0])
                } catch {
                    // ignore
                }
            }
        }
        load()
    }, [user, supabase])

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node
            if (menuRef.current && !menuRef.current.contains(target)) {
                setOpen(false)
            }
            if (notifRef.current && !notifRef.current.contains(target)) {
                setNotifOpen(false)
            }
        }
        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [])

    useEffect(() => {
        const loadRecent = async () => {
            if (!user || !notifOpen) return
            setNotifLoading(true)
            const { data } = await supabase
                .from('notifications')
                .select('id,type,payload,is_read,created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5)
            setRecentNotifs((data || []) as typeof recentNotifs)
            setNotifLoading(false)
        }
        void loadRecent()
    }, [notifOpen, supabase, user])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setSession(null)
    }

    return (
        <header className="user-header sticky top-0 z-50 glass-panel px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    onClick={() => {
                        if (typeof window !== 'undefined' && window.history.length > 1) {
                            router.back()
                        } else {
                            router.push(mainRoute)
                        }
                    }}
                    variant="ghost"
                    size="sm"
                    className={`md:hidden ${isMain ? 'hidden' : 'flex'} items-center gap-2 text-sm text-gray-300 hover:text-white`}
                    aria-label="Geri"
                >
                    <ArrowLeft size={18} />
                </Button>
                <span className={`text-xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent ${isMain ? 'inline' : 'hidden'} md:inline`}>
                    Aura
                </span>
            </div>

            <div className="flex items-center gap-3">
                <CoinBalance />
                <ThemeToggle />

                <div className="relative" ref={notifRef}>
                    <button
                        type="button"
                        onClick={() => setNotifOpen((v) => !v)}
                        className="header-icon-btn relative p-2 rounded-full bg-white/5 hover:bg-white/10"
                        aria-label="Bildirimler"
                    >
                        <Bell size={18} />
                        {unread > 0 && (
                            <span className="absolute -top-1 -right-1 text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500 text-white">
                                {unread}
                            </span>
                        )}
                    </button>
                    {notifOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-[var(--background)] text-[var(--foreground)] border border-[var(--glass-border)] rounded-2xl shadow-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-[var(--glass-border)]">
                                <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Bildirimler</div>
                                <div className="text-sm font-semibold">Son bildirimler</div>
                            </div>
                            <div className="max-h-80 overflow-y-auto no-scrollbar">
                                {notifLoading ? (
                                    <div className="px-4 py-3 text-xs text-gray-400">Yukleniyor...</div>
                                ) : recentNotifs.length === 0 ? (
                                    <div className="px-4 py-4 text-xs text-gray-400">Bildirimin yok.</div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {recentNotifs.map((n) => {
                                            const payload = n.payload || {}
                                            const title = (payload.title as string) || 'Bildirim'
                                            const body = (payload.body as string) || (payload.subject as string) || ''
                                            const url = (payload.url as string) || '/notifications'
                                            return (
                                                <Link
                                                    key={n.id}
                                                    href={url}
                                                    className="block px-4 py-3 hover:bg-white/5"
                                                    onClick={async () => {
                                                        if (!n.is_read) await markNotificationRead(n.id)
                                                        setNotifOpen(false)
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {!n.is_read && <span className="h-2 w-2 rounded-full bg-pink-400" />}
                                                        <div className="text-xs font-semibold">{title}</div>
                                                    </div>
                                                    {body && <div className="text-[11px] text-gray-400 mt-1 line-clamp-2">{body}</div>}
                                                    <div className="text-[10px] text-gray-500 mt-1">
                                                        {new Date(n.created_at).toLocaleString()}
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="border-t border-[var(--glass-border)] px-4 py-2">
                                <Link href="/notifications" className="text-xs text-pink-300">
                                    Tumunu gor
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative" ref={menuRef}>
                    <Button
                        onClick={() => setOpen((v) => !v)}
                        variant="secondary"
                        size="sm"
                        className="header-icon-btn flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-white/5 hover:bg-white/10"
                    >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10">
                            <Image src={photoUrl} alt="Profil" fill sizes="32px" className="object-cover" />
                        </div>
                        <ChevronDown size={14} className="text-gray-400" />
                    </Button>

                    {open && (
                        <div className="absolute right-0 mt-2 w-56 bg-[var(--background)] text-[var(--foreground)] border border-[var(--glass-border)] rounded-xl shadow-xl overflow-hidden">
                            <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--glass-bg)]">
                                <Sparkles size={14} /> Profil
                            </Link>
                            <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--glass-bg)]">
                                <Settings size={14} /> Ayarlar
                            </Link>
                            <Link href="/store" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--glass-bg)]">
                                <Wallet size={14} /> Cüzdan / Mağaza
                            </Link>
                            <Link href="/gifts" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--glass-bg)]">
                                <Gift size={14} /> Hediyeler
                            </Link>
                            <Link href="/settings/blocks" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--glass-bg)]">
                                <Ban size={14} /> Engellenenler
                            </Link>
                            <Link href="/support" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--glass-bg)]">
                                <HelpCircle size={14} /> Destek
                            </Link>
                            <Link href="/stories" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--glass-bg)]">
                                <Sparkles size={14} /> Hikayeler
                            </Link>
                            <Button
                                onClick={handleLogout}
                                variant="ghost"
                                className="w-full justify-start text-left flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-[var(--glass-bg)]"
                            >
                                <LogOut size={14} /> Çıkış
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
