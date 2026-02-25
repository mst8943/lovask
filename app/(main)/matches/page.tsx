'use client'
import { useMatches } from '@/hooks/useMatches'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Archive, Star, Trash2, Filter } from 'lucide-react'
import { getProfileAvatar } from '@/utils/avatar'
import { Button } from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import LoadingSplash from '@/components/ui/LoadingSplash'
import { usePresenceStore } from '@/store/usePresenceStore'
import { canShowLastActive } from '@/utils/lastActive'
import type { LastActiveVisibility } from '@/utils/lastActive'
export default function MatchesPage() {
    const { matches, isLoading } = useMatches()
    const [filter, setFilter] = useState<'all' | 'favorites' | 'archived' | 'trash'>('all')
    const [now, setNow] = useState(() => Date.now())
    const onlineUsers = usePresenceStore((s) => s.onlineUsers)

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60000)
        return () => clearInterval(id)
    }, [])
    const visibleMatches = matches.filter((m) => {
        const isTrashed = !!m.chat_state?.is_trashed || !!m.chat_state?.deleted_at
        const isFav = !!m.chat_state?.is_favorite
        const isArchived = !!m.chat_state?.is_archived
        if (filter === 'trash') return isTrashed
        if (filter === 'favorites') return !isTrashed && isFav
        if (filter === 'archived') return !isTrashed && isArchived
        return !isTrashed
    })
    const matchCountLabel = useMemo(() => visibleMatches.length, [visibleMatches.length])
    const filterItems = [
        { key: 'all', label: 'Tümü' },
        { key: 'favorites', label: 'Favoriler' },
        { key: 'archived', label: 'Arşiv' },
        { key: 'trash', label: 'Çöp' },
    ] as const
    if (isLoading) {
        return <LoadingSplash />
    }
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <div>
                    <div className="text-xs text-gray-400">{matchCountLabel} sohbet</div>
                </div>
                <div className="hidden md:flex items-center gap-2 text-xs">
                    <Filter size={14} className="text-gray-400" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as typeof filter)}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1"
                    >
                        <option value="all">Tümü</option>
                        <option value="favorites">Favoriler</option>
                        <option value="archived">Arşiv</option>
                        <option value="trash">Çöp</option>
                    </select>
                </div>
            </div>
            <div className="md:hidden flex items-center gap-2 overflow-x-auto no-scrollbar px-2">
                {filterItems.map((item) => {
                    const active = filter === item.key
                    return (
                        <Button
                            key={item.key}
                            onClick={() => setFilter(item.key)}
                            variant="secondary"
                            size="sm"
                            className={`px-4 py-2 rounded-full text-xs border whitespace-nowrap ${active
                                ? 'bg-pink-500/20 text-pink-200 border-pink-500/40'
                                : 'bg-white/5 text-gray-300 border-white/10'
                                }`}
                        >
                            {item.label}
                        </Button>
                    )
                })}
            </div>
            {visibleMatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 glass-panel rounded-2xl">
                    <div className="text-4xl">💔</div>
                    <p className="text-gray-400">Henüz eşleşme yok. Keşfetmeye devam et!</p>
                    <Link
                        href="/feed"
                        className="px-6 py-2 bg-gradient-to-r from-pink-500 to-violet-600 rounded-full text-white font-bold"
                    >
                        Keşfetmeye Başla
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {visibleMatches.map((match) => {
                        const user = match.other_user
                        if (!user) return null
                        const photoUrl = getProfileAvatar(user)
                        const isArchived = !!match.chat_state?.is_archived
                        const isFavorite = !!match.chat_state?.is_favorite
                        const lastMessageAt = match.chat_state?.last_message_at
                        const lastMessage = match.chat_state?.last_message_preview || ''
                        const unreadCount = match.chat_state?.unread_count || 0
                        const lastActive = (user as { users?: { last_active_at?: string | null } }).users?.last_active_at
                        const isOnlineFallback = !!lastActive && now - new Date(lastActive).getTime() < 10 * 60 * 1000
                        const canShowPresence = canShowLastActive((user as { last_active_visibility?: LastActiveVisibility }).last_active_visibility, true)
                        const isHiddenPresence = (user as { last_active_visibility?: LastActiveVisibility }).last_active_visibility === 'hidden'
                        const isOnline = canShowPresence && (user.is_bot || onlineUsers.has(user.id) || isOnlineFallback)
                        return (
                            <Link
                                key={match.id}
                                href={`/matches/${match.id}`}
                                className="group flex items-center gap-4 p-4 glass-panel rounded-2xl border border-white/10 hover:border-pink-500/40 hover:bg-white/5 transition-colors"
                            >
                                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-sm">
                                    <Image
                                        src={photoUrl}
                                        alt={user.display_name || 'User'}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
                                    {isHiddenPresence ? (
                                        <span className="absolute bottom-2 right-2 text-[8px] px-1.5 py-0.5 rounded-full bg-black/60 text-slate-300">
                                            Gizli
                                        </span>
                                    ) : isOnline && (
                                        <span className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black/60" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-base truncate">{user.display_name}</h3>
                                        {isFavorite && <Star size={14} className="text-yellow-400" />}
                                        {isArchived && <Archive size={14} className="text-gray-400" />}
                                        {match.chat_state?.is_trashed && <Trash2 size={14} className="text-gray-400" />}
                                    </div>
                                    <p className="text-xs text-gray-400 truncate">
                                        {lastMessage ? lastMessage : 'Sohbete devam et'}
                                    </p>
                                </div>
                                <div className="text-[10px] text-gray-500 text-right flex flex-col items-end gap-1">
                                    {lastMessageAt
                                        ? new Date(lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : new Date(match.created_at).toLocaleDateString()}
                                    {unreadCount > 0 && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500 text-white">
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
