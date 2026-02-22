'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, MessageCircle, User, ThumbsUp, Shuffle } from 'lucide-react'
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
    const [matchIds, setMatchIds] = useState<string[]>([])
    const matchIdsRef = useRef<string[]>([])
    const messagesChannelRef = useRef<RealtimeChannel | null>(null)
    const matchesChannelRef = useRef<RealtimeChannel | null>(null)
    const matchesChannelRefB = useRef<RealtimeChannel | null>(null)
    const messagesFilterRef = useRef<string | null>(null)
    const isChatRoom = pathname.startsWith('/matches/')

    const links = [
        { href: '/swipe', icon: Shuffle, label: 'Swipe' },
        { href: '/feed', icon: Flame, label: 'Keşfet' },
        { href: '/liked-you', icon: ThumbsUp, label: 'Beğeniler' },
        { href: '/matches', icon: MessageCircle, label: 'Sohbetler' },
        { href: '/profile', icon: User, label: 'Profil' },
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

    useEffect(() => {
        if (!user || isChatRoom) return
        const id = setTimeout(() => {
            void loadMatches(user.id)
        }, 0)
        return () => clearTimeout(id)
    }, [isChatRoom, loadMatches, user])

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
        <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-[var(--background)]/90 backdrop-blur-md border-t border-[var(--glass-border)] safe-area-bottom">
            <div className="flex items-center justify-around h-16">
                {links.map((link) => {
                    const Icon = link.icon
                    const isActive = pathname === link.href
                    const isChat = link.href === '/matches'

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={clsx(
                                'flex flex-col items-center justify-center w-full h-full transition-colors',
                                isActive ? 'text-pink-500' : 'text-gray-500 hover:text-gray-300'
                            )}
                        >
                            <div className="relative">
                                <Icon className={clsx('w-6 h-6', isActive && 'fill-current')} />
                                {isChat && unread > 0 && (
                                    <span className="absolute -top-2 -right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500 text-white">
                                        {unread}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] mt-1 font-medium">{link.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}












