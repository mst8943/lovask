'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { useFeedFilters } from '@/store/useFeedFilters'
import { getProfileAvatar } from '@/utils/avatar'
import { useRouter } from 'next/navigation'

type BoostStory = {
    userId: string
    displayName: string
    avatar: string
    endsAt: string
    activeCount: number
}

type BoostProfileRow = {
    id: string
    display_name: string | null
    photos: string[] | null
    gender: string | null
    is_bot: boolean | null
    looking_for_genders?: string[] | null
}

export default function BoostsBar() {
    const { user } = useAuthStore()
    const genders = useFeedFilters((state) => state.genders)
    const supabase = useMemo(() => createClient(), [])
    const router = useRouter()
    const [boostStories, setBoostStories] = useState<BoostStory[]>([])
    const [now, setNow] = useState(0)

    const formatRemaining = useCallback((endsAt: string) => {
        const ms = Math.max(0, new Date(endsAt).getTime() - now)
        const h = Math.floor(ms / 3600000)
        const m = Math.floor((ms % 3600000) / 60000)
        if (h > 0) return `${h}s ${m}dk`
        return `${m}dk`
    }, [now])

    const loadBoostStories = useCallback(async () => {
        const nowIso = new Date().toISOString()
        const { data: boosts, error } = await supabase
            .from('boosts')
            .select('user_id,ends_at')
            .gt('ends_at', nowIso)
            .order('ends_at', { ascending: false })
            .limit(120)
        if (error || !boosts?.length) {
            setBoostStories([])
            return
        }

        const grouped = new Map<string, { endsAt: string; activeCount: number }>()
        for (const row of boosts) {
            const userId = row.user_id as string | null
            const endsAt = row.ends_at as string | null
            if (!userId || !endsAt) continue
            const prev = grouped.get(userId)
            if (!prev) {
                grouped.set(userId, { endsAt, activeCount: 1 })
            } else {
                grouped.set(userId, {
                    endsAt: new Date(prev.endsAt) > new Date(endsAt) ? prev.endsAt : endsAt,
                    activeCount: prev.activeCount + 1,
                })
            }
        }

        const userIds = Array.from(grouped.keys())
        if (userIds.length === 0) {
            setBoostStories([])
            return
        }

        const { data: profileRows } = await supabase
            .from('profiles')
            .select('id,display_name,photos,gender,is_bot')
            .in('id', userIds)

        const rows = (profileRows || []) as BoostProfileRow[]
        const profileMap = new Map(rows.map((p) => [p.id, p]))
        const genderFilter = genders.length > 0 ? new Set(genders) : null
        const stories: BoostStory[] = userIds
            .map((userId) => {
                const profile = profileMap.get(userId)
                const boost = grouped.get(userId)
                if (!profile || !boost) return null
                if (genderFilter && (!profile.gender || !genderFilter.has(profile.gender))) return null
                return {
                    userId,
                    displayName: profile.display_name || 'Kullanıcı',
                    avatar: getProfileAvatar(profile),
                    endsAt: boost.endsAt,
                    activeCount: boost.activeCount,
                }
            })
            .filter((v): v is BoostStory => Boolean(v))
            .sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime())
            .slice(0, 20)

        setBoostStories(stories)
    }, [supabase, genders])

    useEffect(() => {
        const id = setTimeout(() => {
            void loadBoostStories()
        }, 0)
        const refreshTimer = setInterval(() => {
            void loadBoostStories()
        }, 30000)
        return () => {
            clearTimeout(id)
            clearInterval(refreshTimer)
        }
    }, [loadBoostStories])

    useEffect(() => {
        const tick = () => setNow(Date.now())
        const id = setTimeout(tick, 0)
        const timer = setInterval(tick, 1000)
        return () => {
            clearTimeout(id)
            clearInterval(timer)
        }
    }, [])

    const activeStories = useMemo(
        () => boostStories.filter((item) => new Date(item.endsAt).getTime() > now),
        [boostStories, now]
    )
    const userId = user?.id || null
    const myBoostStory = userId ? activeStories.find((story) => story.userId === userId) || null : null
    const otherBoostStories = userId ? activeStories.filter((story) => story.userId !== userId) : activeStories

    const shouldAutoScrollBoostStories = otherBoostStories.length > 8
    const scrollingBoostStories = shouldAutoScrollBoostStories ? [...otherBoostStories, ...otherBoostStories] : otherBoostStories

    return (
        <div className="feed-boosts absolute left-3 top-3 z-40 flex items-start gap-2 sm:left-4 sm:top-4 sm:gap-3 pointer-events-auto">
            {myBoostStory ? (
                <Link href={`/profiles/${myBoostStory.userId}`} className="shrink-0 text-center">
                    <span className="relative block h-12 w-12 rounded-full bg-[conic-gradient(from_180deg,#22d3ee,#ec4899,#f59e0b,#22d3ee)] p-[2px]">
                        <span className="relative block h-full w-full overflow-hidden rounded-full border border-black/50">
                            <Image src={myBoostStory.avatar} alt="Sen" fill className="object-cover" />
                        </span>
                        {myBoostStory.activeCount > 1 && (
                            <span className="absolute -bottom-1 -right-1 rounded-full border border-black/50 bg-pink-500 px-1.5 text-[9px] font-semibold text-white">
                                x{myBoostStory.activeCount}
                            </span>
                        )}
                    </span>
                    <span className="mt-1 block w-14 truncate text-[10px] text-gray-100">Sen</span>
                    <span className="block text-[9px] text-gray-400">{formatRemaining(myBoostStory.endsAt)}</span>
                </Link>
            ) : (
                <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => router.push('/store/boost')}
                    className="text-center"
                >
                    <span className="inline-flex rounded-full border border-yellow-500/50 bg-yellow-500/10 p-2 text-yellow-500 shadow-[0_0_18px_rgba(234,179,8,.25)]">
                        <Zap size={16} />
                    </span>
                    <span className="mt-1 block text-[11px] font-semibold text-yellow-600">Yükselt</span>
                </button>
            )}

            {otherBoostStories.length > 0 && (
                <div className="max-w-[calc(100vw-7.5rem)] overflow-hidden sm:max-w-[72vw]">
                    <div className={clsx('flex w-max items-start gap-2 pr-2', shouldAutoScrollBoostStories && 'feed-boost-marquee')}>
                        {scrollingBoostStories.map((story, idx) => (
                            <Link key={`${story.userId}-${idx}`} href={`/profiles/${story.userId}`} className="shrink-0 text-center">
                                <span className="relative block h-12 w-12 rounded-full bg-[conic-gradient(from_180deg,#22d3ee,#ec4899,#f59e0b,#22d3ee)] p-[2px]">
                                    <span className="relative block h-full w-full overflow-hidden rounded-full border border-black/50">
                                        <Image src={story.avatar} alt={story.displayName} fill className="object-cover" />
                                    </span>
                                    {story.activeCount > 1 && (
                                        <span className="absolute -bottom-1 -right-1 rounded-full border border-black/50 bg-pink-500 px-1.5 text-[9px] font-semibold text-white">
                                            x{story.activeCount}
                                        </span>
                                    )}
                                </span>
                                <span className="mt-1 block w-14 truncate text-[10px] text-gray-100">{story.displayName}</span>
                                <span className="block text-[9px] text-gray-400">{formatRemaining(story.endsAt)}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
            <style jsx>{`
                @keyframes feed-boost-marquee {
                    from {
                        transform: translateX(0);
                    }
                    to {
                        transform: translateX(-50%);
                    }
                }
                .feed-boost-marquee {
                    animation: feed-boost-marquee 24s linear infinite;
                }
                .feed-boost-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    )
}
