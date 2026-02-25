'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, MessageCircle, User, Heart, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabase/client'

export default function BottomNav() {
    const pathname = usePathname()
    const { user } = useAuthStore()
    const supabase = useMemo(() => createClient(), [])
    const [unread, setUnread] = useState(0)
    const [likeUnread, setLikeUnread] = useState(0)
    const [matchUnread, setMatchUnread] = useState(0)
    const [matchIds, setMatchIds] = useState<string[]>([])
    const matchIdsRef = useRef<string[]>([])
    const messagesChannelRef = useRef<RealtimeChannel | null>(null)
    const matchesChannelRef = useRef<RealtimeChannel | null>(null)
    const matchesChannelRefB = useRef<RealtimeChannel | null>(null)
    const notificationsChannelRef = useRef<RealtimeChannel | null>(null)
    const messagesFilterRef = useRef<string | null>(null)
    const isChatRoom = pathname.startsWith('/matches/')

    const links = [
        { href: '/swipe', icon: Flame, label: 'KAYDIR' },
        { href: '/feed', icon: Search, label: 'KEŞFET' },
        { href: '/liked-you', icon: Heart, label: 'BEĞENİLER' },
        { href: '/matches', icon: MessageCircle, label: 'SOHBETLER' },
        { href: '/profile', icon: User, label: 'PROFİL' },
    ]

    const loadUnread = useCallback(async (userId: string, ids: string[]) => {
        if (ids.length === 0) {
            setUnread(0)
            return
        }
        const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('match_id', ids)
            .neq('sender_id', userId)
            .is('read_at', null)
        setUnread(count || 0)
    }, [supabase])

    const loadMatches = useCallback(async (userId: string) => {
        const { data } = await supabase
            .from('matches')
            .select('id')
            .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        const ids = (data || []).map((m: { id: string }) => m.id).filter(Boolean).sort()
        const prev = matchIdsRef.current
        if (prev.length === ids.length && prev.every((id, idx) => id === ids[idx])) return
        matchIdsRef.current = ids
        setMatchIds(ids)
        await loadUnread(userId, ids)
    }, [loadUnread, supabase])

    const loadNotificationDots = useCallback(async (userId: string) => {
        const [{ count: likesCount }, { count: matchesCount }] = await Promise.all([
            supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false)
                .eq('type', 'like'),
            supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false)
                .eq('type', 'match'),
        ])
        setLikeUnread(likesCount || 0)
        setMatchUnread(matchesCount || 0)
    }, [supabase])

    const markNotificationsRead = useCallback(async (userId: string, type: 'like' | 'match') => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('type', type)
            .eq('is_read', false)
        await loadNotificationDots(userId)
    }, [loadNotificationDots, supabase])

    useEffect(() => {
        if (!user || isChatRoom) return
        const id = setTimeout(() => {
            void loadMatches(user.id)
        }, 0)
        return () => clearTimeout(id)
    }, [isChatRoom, loadMatches, user])

    useEffect(() => {
        if (!user) return
        void loadNotificationDots(user.id)
    }, [loadNotificationDots, user])

    useEffect(() => {
        if (!user) return
        if (notificationsChannelRef.current) {
            supabase.removeChannel(notificationsChannelRef.current)
        }
        const channel = supabase
            .channel(`bottomnav-notifications:${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                () => {
                    void loadNotificationDots(user.id)
                }
            )
            .subscribe()
        notificationsChannelRef.current = channel
        return () => {
            if (notificationsChannelRef.current) {
                supabase.removeChannel(notificationsChannelRef.current)
                notificationsChannelRef.current = null
            }
        }
    }, [loadNotificationDots, supabase, user])

    useEffect(() => {
        if (!user) return
        if (pathname === '/liked-you') {
            void markNotificationsRead(user.id, 'like')
            void markNotificationsRead(user.id, 'match')
        }
        if (pathname === '/matches') {
            void markNotificationsRead(user.id, 'match')
        }
    }, [markNotificationsRead, pathname, user])

    useEffect(() => {
        if (!user || matchIds.length === 0 || isChatRoom) return
        if (matchIds.length > 50) {
            if (messagesChannelRef.current) {
                try {
                    supabase.removeChannel(messagesChannelRef.current)
                } catch {
                    // ignore remove race
                }
                messagesChannelRef.current = null
            }
            const id = setInterval(() => {
                void loadUnread(user.id, matchIds)
            }, 60_000)
            return () => clearInterval(id)
        }

        const filter = `match_id=in.(${matchIds.join(',')})`
        if (messagesFilterRef.current === filter && messagesChannelRef.current) return

        if (messagesChannelRef.current) {
            try {
                supabase.removeChannel(messagesChannelRef.current)
            } catch {
                // ignore remove race
            }
        }
        const channel = supabase
            .channel(`bottomnav-messages:${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter },
                (payload) => {
                    const row = payload.new as { sender_id: string; read_at: string | null }
                    if (!row || row.sender_id === user.id || row.read_at) return
                    setUnread((prev) => prev + 1)
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter },
                (payload) => {
                    const next = payload.new as { sender_id: string; read_at: string | null }
                    const prev = payload.old as { sender_id: string; read_at: string | null }
                    if (!next || next.sender_id === user.id) return
                    if (prev?.read_at && !next.read_at) {
                        setUnread((count) => count + 1)
                    } else if (!prev?.read_at && next.read_at) {
                        setUnread((count) => Math.max(0, count - 1))
                    }
                }
            )
            .subscribe()

        messagesChannelRef.current = channel
        messagesFilterRef.current = filter
        return () => {
            if (messagesChannelRef.current) {
                try {
                    supabase.removeChannel(messagesChannelRef.current)
                } catch {
                    // ignore remove race
                }
                messagesChannelRef.current = null
            }
            messagesFilterRef.current = null
        }
    }, [isChatRoom, matchIds, supabase, user, loadUnread])

    useEffect(() => {
        if (!user || isChatRoom) return
        if (matchesChannelRef.current) {
            supabase.removeChannel(matchesChannelRef.current)
        }
        if (matchesChannelRefB.current) {
            supabase.removeChannel(matchesChannelRefB.current)
        }

        const channelA = supabase
            .channel(`bottomnav-matches-a:${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'matches', filter: `user_a=eq.${user.id}` },
                () => {
                    loadMatches(user.id)
                }
            )
            .subscribe()

        const channelB = supabase
            .channel(`bottomnav-matches-b:${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'matches', filter: `user_b=eq.${user.id}` },
                () => {
                    loadMatches(user.id)
                }
            )
            .subscribe()

        matchesChannelRef.current = channelA
        matchesChannelRefB.current = channelB
        return () => {
            if (matchesChannelRef.current) {
                supabase.removeChannel(matchesChannelRef.current)
                matchesChannelRef.current = null
            }
            if (matchesChannelRefB.current) {
                supabase.removeChannel(matchesChannelRefB.current)
                matchesChannelRefB.current = null
            }
        }
    }, [isChatRoom, loadMatches, supabase, user])
    if (isChatRoom) return null

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-surface-0 border-t border-surface-1 safe-area-bottom transition-colors duration-[var(--duration-normal)]">
            <div className="flex items-center justify-around h-[72px] px-2 max-w-md mx-auto md:max-w-4xl md:justify-center md:gap-16">
                {links.map((link) => {
                    const Icon = link.icon
                    const isActive = pathname === link.href
                    const isChat = link.href === '/matches'
                    const isLikedYou = link.href === '/liked-you'
                    const showLikeDot = isLikedYou && likeUnread > 0
                    const showMatchDot = isChat && unread === 0 && matchUnread > 0

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={clsx(
                                'flex flex-col items-center justify-center w-full h-full relative cursor-pointer active:scale-95 transition-all duration-[var(--duration-fast)]'
                            )}
                        >
                            {/* Hover effect indicator */}
                            {isActive && (
                                <div className="absolute top-0 w-8 h-[3px] bg-brand-primary rounded-b-full shadow-[0_2px_10px_var(--color-brand-primary)]" />
                            )}

                            <div className="relative mb-1">
                                <Icon
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={clsx(
                                        'w-6 h-6 transition-colors duration-[var(--duration-fast)]',
                                        isActive ? 'text-brand-primary drop-shadow-[0_0_8px_var(--color-brand-primary)]' : 'text-text-secondary hover:text-text-primary'
                                    )}
                                />
                                {isChat && unread > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-status-destructive text-white font-bold shadow-sm">
                                        {unread}
                                    </span>
                                )}
                                {showMatchDot && (
                                    <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-status-destructive border-2 border-surface-0" />
                                )}
                                {showLikeDot && (
                                    <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-status-destructive border-2 border-surface-0" />
                                )}
                            </div>
                            <span className={clsx(
                                "text-[9px] font-black uppercase tracking-widest mt-0.5 transition-colors duration-[var(--duration-fast)]",
                                isActive ? "text-brand-primary" : "text-text-secondary"
                            )}>
                                {link.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}









