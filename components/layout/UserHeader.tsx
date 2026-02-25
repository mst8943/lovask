'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Bell, LogOut, Settings, Wallet, Gift, HelpCircle, Sparkles } from 'lucide-react'
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
        setOpen(false)
        setNotifOpen(false)
    }, [pathname])

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
        <header className="user-header fixed top-0 left-0 right-0 z-50 w-full bg-[var(--background)]/80 backdrop-blur-md border-b border-white/5 transition-all duration-300">
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

                {/* 1. Left Section: Logo & Back */}
                <div className="flex items-center gap-2 flex-1 md:flex-none">
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
                        className={`md:hidden ${isMain ? 'hidden' : 'flex'} items-center justify-center w-10 h-10 rounded-2xl p-0 hover:bg-[var(--glass-bg)] hover:scale-105 active:scale-95 transition-all`}
                        aria-label="Geri"
                    >
                        <ArrowLeft size={20} className="text-[var(--foreground)]/80" />
                    </Button>
                    <Link href={mainRoute} className={`${isMain ? 'flex' : 'hidden'} md:flex items-center hover:opacity-90 transition-opacity`}>
                        <Image
                            src="/lovask_wordmark_logo_svg.svg"
                            alt="Lovask"
                            width={74}
                            height={21}
                            className="h-5 sm:h-6 w-auto object-contain"
                            priority
                        />
                    </Link>
                </div>

                {/* 2. Middle Section: Dynamic Action / Empty on mobile to leave space */}
                <div className="hidden md:flex flex-1 justify-center">
                    {/* Space reserved for future center tabs or search, keeping layout symmetrical */}
                </div>

                {/* 3. Right Section: User Actions */}
                <div className="flex items-center justify-end gap-2 sm:gap-3 flex-1 md:flex-none">

                    {/* Coin Balance - Slightly scaled down on tiny screens */}
                    <div className="transform hover:scale-105 transition-transform duration-300 mr-2 sm:mr-3">
                        <CoinBalance />
                    </div>

                    {/* Vertical Divider block removed to match new dark design */}

                    <div className="scale-[1.2]">
                        <ThemeToggle />
                    </div>

                    {/* Notifications */}
                    <div className="relative" ref={notifRef}>
                        <button
                            type="button"
                            onClick={() => setNotifOpen((v) => !v)}
                            className={`
                                relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300
                                bg-transparent hover:bg-white/5
                                active:scale-95 group overflow-visible
                            `}
                            aria-label="Bildirimler"
                            aria-expanded={notifOpen}
                        >
                            <Bell size={24} strokeWidth={2} className={`text-white transition-transform duration-300 ${unread > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`} />
                            {unread > 0 && (
                                <span className="absolute top-2 right-2.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] border-[1.5px] border-[#0A0A0A] z-50"></span>
                            )}
                        </button>

                        {/* Premium Notification Dropdown */}
                        <div
                            className={`
                                absolute right-0 mt-3 w-[280px] sm:w-80 bg-[var(--background)]/95 backdrop-blur-2xl border border-[var(--glass-border)] rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-300 origin-top-right z-50
                                ${notifOpen ? 'opacity-100 scale-100 translate-y-0 visible' : 'opacity-0 scale-95 -translate-y-2 invisible'}
                            `}
                        >
                            <div className="px-4 py-3 border-b border-[var(--glass-border)] flex items-center justify-between bg-white/[0.02]">
                                <div>
                                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-pink-500/90 mb-0.5">Bildirimler</div>
                                    <div className="text-sm font-bold text-[var(--foreground)]">Son Etkileşimler</div>
                                </div>
                                {unread > 0 && (
                                    <span className="px-1.5 py-0.5 bg-pink-500/15 text-pink-400 rounded-lg text-[10px] font-bold">
                                        {unread} Yeni
                                    </span>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto no-scrollbar relative">
                                {notifLoading ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                                        <div className="text-xs text-[var(--foreground)]/50 font-medium">Yükleniyor...</div>
                                    </div>
                                ) : recentNotifs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                        <div className="w-12 h-12 rounded-full bg-[var(--glass-bg)] flex items-center justify-center mb-3">
                                            <Bell size={20} className="text-[var(--foreground)]/30" />
                                        </div>
                                        <div className="text-sm font-semibold text-[var(--foreground)]/70">Henüz bildirim yok</div>
                                        <div className="text-xs text-[var(--foreground)]/40 mt-1">Yeni etkileşimler burada görünecek</div>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[var(--glass-border)]">
                                        {recentNotifs.map((n) => {
                                            const payload = n.payload || {}
                                            const title = (payload.title as string) || 'Bildirim'
                                            const body = (payload.body as string) || (payload.subject as string) || ''
                                            const url = (payload.url as string) || '/notifications'
                                            return (
                                                <Link
                                                    key={n.id}
                                                    href={url}
                                                    className="group block p-3 hover:bg-white/[0.03] transition-colors relative"
                                                    onClick={async () => {
                                                        if (!n.is_read) await markNotificationRead(n.id)
                                                        setNotifOpen(false)
                                                    }}
                                                >
                                                    {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-pink-500" />}
                                                    <div className="flex gap-2.5">
                                                        <div className={`mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-xs ${n.is_read ? 'font-medium text-[var(--foreground)]/70' : 'font-bold text-[var(--foreground)]'} truncate`}>{title}</div>
                                                            {body && <div className="text-[11px] text-[var(--foreground)]/50 mt-0.5 line-clamp-1 leading-tight">{body}</div>}
                                                            <div className="text-[9px] text-[var(--foreground)]/30 mt-1.5 font-medium">
                                                                {new Date(n.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="border-t border-[var(--glass-border)] p-3 bg-gradient-to-b from-transparent to-[var(--glass-bg)]">
                                <Link
                                    href="/notifications"
                                    className="block w-full text-center py-2.5 rounded-xl bg-[var(--glass-bg)] hover:bg-white/10 text-xs font-semibold text-[var(--foreground)]/80 hover:text-pink-400 transition-all active:scale-95 border border-[var(--glass-border)]"
                                    onClick={() => setNotifOpen(false)}
                                >
                                    Tümünü Görüntüle
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* User Menu */}
                    <div className="relative ml-1 sm:ml-2" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            className={`
                                relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden transition-all duration-300
                                ring-[1.5px] ring-[#b3790f66] ring-offset-[1.5px] ring-offset-[var(--background)]
                                active:scale-95 select-none
                                ${open ? 'opacity-80' : ''}
                            `}
                            aria-expanded={open}
                            aria-label="Profil menüsü"
                        >
                            <Image
                                src={photoUrl}
                                alt="Profil"
                                fill
                                sizes="(max-width: 640px) 32px, 36px"
                                className="object-cover rounded-full transition-transform duration-500 hover:scale-110"
                            />
                        </button>

                        {/* Premium User Menu Dropdown */}
                        <div
                            className={`
                                absolute right-0 mt-3 w-64 bg-[var(--background)] border border-[var(--glass-border)] rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.24)] overflow-hidden transition-all duration-300 origin-top-right flex flex-col p-2 gap-1
                                ${open ? 'opacity-100 scale-100 translate-y-0 visible' : 'opacity-0 scale-95 -translate-y-2 invisible'}
                            `}
                        >
                            {/* Profile Snippet */}
                            <div className="px-3 py-3 mb-1 bg-[var(--glass-bg)] rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl overflow-hidden relative shadow-sm">
                                    <Image src={photoUrl} alt="Profil" fill sizes="40px" className="object-cover" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <Link href="/profile" className="block text-sm font-bold text-[var(--foreground)] truncate hover:text-pink-400 transition-colors">
                                        Aura Profilin
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpen(false)
                                            router.push('/store/premium')
                                        }}
                                        className="inline-flex text-[10px] text-pink-500 font-medium hover:text-pink-400 transition-colors"
                                    >
                                        Premium&apos;u Keşfet &rarr;
                                    </button>
                                </div>
                            </div>

                            <div className="h-px bg-[var(--glass-border)] mx-2 my-1"></div>

                            <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--glass-bg)] hover:text-pink-400 transition-colors group">
                                <Sparkles size={16} className="text-[var(--foreground)]/50 group-hover:text-pink-400 transition-colors" />
                                Profil
                            </Link>
                            <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--glass-bg)] hover:text-pink-400 transition-colors group">
                                <Settings size={16} className="text-[var(--foreground)]/50 group-hover:text-pink-400 transition-colors" />
                                Ayarlar
                            </Link>
                            <Link href="/store" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--glass-bg)] hover:text-pink-400 transition-colors group">
                                <Wallet size={16} className="text-[var(--foreground)]/50 group-hover:text-pink-400 transition-colors" />
                                Cüzdan / Mağaza
                            </Link>
                            <Link href="/gifts" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--glass-bg)] hover:text-pink-400 transition-colors group">
                                <Gift size={16} className="text-[var(--foreground)]/50 group-hover:text-pink-400 transition-colors" />
                                Hediyeler
                            </Link>

                            <div className="h-px bg-[var(--glass-border)] mx-2 my-1"></div>

                            <Link href="/stories" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--glass-bg)] hover:text-purple-400 transition-colors group">
                                <Sparkles size={16} className="text-[var(--foreground)]/50 group-hover:text-purple-400 transition-colors" />
                                Hikayeler
                            </Link>
                            <Link href="/support" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--glass-bg)] hover:text-[var(--foreground)] transition-colors group">
                                <HelpCircle size={16} className="text-[var(--foreground)]/50 group-hover:text-[var(--foreground)] transition-colors" />
                                Destek
                            </Link>

                            <div className="h-px bg-[var(--glass-border)] mx-2 my-1"></div>

                            <Button
                                onClick={handleLogout}
                                variant="ghost"
                                className="w-full justify-start text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors group"
                            >
                                <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
                                Çıkış Yap
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
