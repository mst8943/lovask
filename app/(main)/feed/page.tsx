'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFeedList } from '@/hooks/useFeedList'
import { SlidersHorizontal, X, RotateCcw, Plus, Minus, Zap } from 'lucide-react'
import { useFeedFilters } from '@/store/useFeedFilters'
import { clsx } from 'clsx'
import { useEconomy } from '@/hooks/useEconomy'
import { rewindLastPass } from '@/services/extraFeaturesService'
import { activateMiniBoost } from '@/services/economyService'
import { fetchEvents, fetchEventParticipantIds, EventItem } from '@/services/eventService'
import { BOOST_CONFIG } from '@/lib/boostConfig'
import { useAuthStore } from '@/store/useAuthStore'
import { useToast } from '@/components/ui/Toast'
import { getProfileAvatar } from '@/utils/avatar'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import MatchCelebration from '@/components/ui/MatchCelebration'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import BoostsBar from '@/components/feed/BoostsBar'
import Spinner from '@/components/ui/Spinner'
import { CITY_OPTIONS } from '@/utils/cities'

export default function FeedPage() {
    const {
        profiles,
        isLoading,
        isFetchingNext,
        hasNextPage,
        fetchNext,
        refetch,
    } = useFeedList()
    const filters = useFeedFilters()
    const { spendCoins, isPremium, hasFeature } = useEconomy()
    const { user } = useAuthStore()
    const toast = useToast()
    const supabase = useMemo(() => createClient(), [])

    const [showFilters, setShowFilters] = useState(false)
    const [autoLikeRan, setAutoLikeRan] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [zoom, setZoom] = useState(1)
    const [selfPhoto, setSelfPhoto] = useState('/placeholder-user.jpg')
    const [selfCity, setSelfCity] = useState<string | null>(null)
    const [matchOpen, setMatchOpen] = useState(false)
    const [didAutoResetFilters, setDidAutoResetFilters] = useState(false)
    const [compatibilityRun, setCompatibilityRun] = useState(false)

    // filter states
    const [sortByCompatibility, setSortByCompatibility] = useState(false)
    const [events, setEvents] = useState<EventItem[]>([])
    const [eventParticipants, setEventParticipants] = useState<string[]>([])
    const [boostLoading, setBoostLoading] = useState(false)

    // internal states for panning
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [isPanning, setIsPanning] = useState(false)
    const [isInteracting, setIsInteracting] = useState(false)
    const panStartRef = useRef<{ x: number; y: number } | null>(null)
    const panOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
    const panTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
    const panFrameRef = useRef<number | null>(null)

    // internal references for multitouch & zooming
    const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
    const radarRef = useRef<HTMLDivElement | null>(null)
    const radarHoverRef = useRef(false)
    const pinchRef = useRef<{
        initialDistance: number
        initialZoom: number
        initialPan: { x: number; y: number }
        initialMidpoint: { x: number; y: number }
    } | null>(null)

    const [viewport, setViewport] = useState({ width: 1280, height: 800 })

    const canMiniBoost = hasFeature('mini_boost')
    const canAdvancedFilters = hasFeature('advanced_filters')
    const canRewind = hasFeature('rewind')

    useEffect(() => {
        const updateViewport = () => {
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight,
            })
        }
        updateViewport()
        window.addEventListener('resize', updateViewport)
        return () => window.removeEventListener('resize', updateViewport)
    }, [])

    useEffect(() => {
        if (!user || autoLikeRan) return
        const id = setTimeout(() => {
            const run = async () => {
                try {
                    await fetch('/api/bots/auto-like', { method: 'POST' })
                } finally {
                    setAutoLikeRan(true)
                }
            }
            void run()
        }, 0)
        return () => clearTimeout(id)
    }, [user, autoLikeRan])

    useEffect(() => {
        if (!user || compatibilityRun) return
        const id = setTimeout(() => {
            const run = async () => {
                const { data: session } = await supabase.auth.getSession()
                const token = session.session?.access_token
                await fetch('/api/compatibility/recompute', {
                    method: 'POST',
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                })
            }
            run().finally(() => setCompatibilityRun(true))
        }, 0)
        return () => clearTimeout(id)
    }, [compatibilityRun, user])

    useEffect(() => {
        if (!showFilters) return
        const loadEvents = async () => {
            const list = await fetchEvents()
            setEvents(list)
        }
        loadEvents()
    }, [showFilters])

    useEffect(() => {
        const loadParticipants = async () => {
            if (!filters.eventId) {
                setEventParticipants([])
                return
            }
            const ids = await fetchEventParticipantIds(filters.eventId)
            setEventParticipants(ids)
        }
        loadParticipants()
    }, [filters.eventId])

    useEffect(() => {
        if (!user?.id) return
        const id = setTimeout(() => {
            const loadSelf = async () => {
                const { data } = await supabase
                    .from('profiles')
                    .select('photos,city,is_bot,gender,looking_for_genders')
                    .eq('id', user.id)
                    .maybeSingle()

                if (!data) return
                setSelfPhoto(getProfileAvatar(data))
                setSelfCity(data.city || null)

                const current = useFeedFilters.getState()
                if (!current.hasCustomFilters && current.genders.length === 0) {
                    const preferred = Array.isArray(data.looking_for_genders) ? data.looking_for_genders.filter(Boolean) : []
                    if (preferred.length > 0) {
                        current.setPreferredGenders(preferred)
                    } else if (data.gender === 'Male') {
                        current.setPreferredGenders(['Female'])
                    } else if (data.gender === 'Female') {
                        current.setPreferredGenders(['Male'])
                    }
                }
            }
            void loadSelf()
        }, 0)
        return () => clearTimeout(id)
    }, [user?.id, supabase])

    const sortedProfiles = useMemo(() => {
        if (!sortByCompatibility) return profiles
        return [...profiles].sort((a, b) => (b.compatibility_score || 0) - (a.compatibility_score || 0))
    }, [profiles, sortByCompatibility])

    const seededShuffle = useCallback(<T,>(items: T[], seed: number) => {
        const arr = [...items]
        let t = seed || 1
        const rand = () => {
            t ^= t << 13
            t ^= t >> 17
            t ^= t << 5
            const normalized = (t >>> 0) / 4294967296
            return normalized
        }
        for (let i = arr.length - 1; i > 0; i -= 1) {
            const j = Math.floor(rand() * (i + 1))
                ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        return arr
    }, [])

    const diversifiedProfiles = useMemo(() => {
        let list = [...sortedProfiles]
        if (filters.eventOnly && filters.eventId && eventParticipants.length > 0) {
            list = list.filter((p) => eventParticipants.includes(p.id))
        }
        if (filters.serendipity) {
            const dayKey = new Date().toISOString().slice(0, 10).replace(/-/g, '')
            const seed = Number.parseInt(dayKey, 10) + (user?.id?.charCodeAt(0) || 7)
            const keep = list.slice(0, 6)
            const rest = list.slice(6)
            const shuffled = seededShuffle(rest, seed)
            list = [...keep, ...shuffled]
        }
        if (filters.diversity) {
            const byBucket = new Map<string, typeof list>()
            for (const p of list) {
                const genderKey = (p.gender || 'unknown').toLowerCase()
                const cityKey = (p.city || 'unknown').toLowerCase()
                const key = `${genderKey}:${cityKey}`
                if (!byBucket.has(key)) byBucket.set(key, [])
                byBucket.get(key)!.push(p)
            }
            const merged: typeof list = []
            let done = false
            while (!done) {
                done = true
                for (const bucket of byBucket.values()) {
                    const next = bucket.shift()
                    if (next) {
                        merged.push(next)
                        done = false
                    }
                }
            }
            list = merged
        }
        return list
    }, [sortedProfiles, filters.eventOnly, filters.eventId, filters.serendipity, filters.diversity, eventParticipants, seededShuffle, user?.id])

    useEffect(() => {
        if (diversifiedProfiles.length > 0 && !selectedId) setSelectedId(diversifiedProfiles[0].id)
    }, [diversifiedProfiles, selectedId])

    useEffect(() => {
        if (!selectedId) return
        if (!diversifiedProfiles.some((p) => p.id === selectedId)) setSelectedId(diversifiedProfiles[0]?.id || null)
    }, [diversifiedProfiles, selectedId])

    useEffect(() => {
        if (profiles.length > 0 && profiles.length < 20 && hasNextPage && !isFetchingNext) fetchNext()
    }, [profiles.length, hasNextPage, fetchNext, isFetchingNext])

    const handleMiniBoost = async () => {
        if (!user) return
        if (boostLoading) return
        setBoostLoading(true)
        try {
            const cost = isPremium ? 0 : BOOST_CONFIG.miniBoost.cost
            const ok = await activateMiniBoost(BOOST_CONFIG.miniBoost.minutes, cost)
            if (!ok) {
                toast.push('Mini Boost bugun kullanildi.', 'error')
                return
            }
            toast.push(`Mini Boost ${BOOST_CONFIG.miniBoost.minutes} dk aktif`, 'success')
        } catch (err: unknown) {
            toast.push(err instanceof Error ? err.message : 'Mini Boost aktif edilemedi.', 'error')
        } finally {
            setBoostLoading(false)
        }
    }

    useEffect(() => {
        const isDefaultGenderFilter = filters.genders.length === filters.preferredGenders.length
            && filters.genders.every((g) => filters.preferredGenders.includes(g))

        const hasActiveFilters = !!(
            filters.city
            || (!isDefaultGenderFilter && filters.genders.length)
            || filters.interests.length
            || filters.onlineOnly
            || filters.premiumOnly
        )

        if (!didAutoResetFilters && profiles.length === 0 && hasActiveFilters && !filters.hasCustomFilters) {
            filters.reset()
            refetch()
            setDidAutoResetFilters(true)
            toast.push('Filtreler sıfırlandı, profiller yeniden yüklendi.', 'success')
        }
    }, [profiles.length, didAutoResetFilters, filters, refetch, toast])

    const estimateDistanceKm = useCallback((id: string, city?: string | null, seed: number = 0) => {
        const hash = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + seed * 13
        const cityBias = city && selfCity && city.toLowerCase() === selfCity.toLowerCase() ? 2 : 14
        return cityBias + (hash % 58)
    }, [selfCity])

    const clampZoom = useCallback((value: number) => {
        return Math.max(0.8, Math.min(2.4, Number(value.toFixed(2))))
    }, [])

    useEffect(() => {
        const el = radarRef.current
        if (!el) return
        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const delta = e.deltaY < 0 ? 0.06 : -0.06
            setZoom((z) => clampZoom(z + delta))
        }
        el.addEventListener('wheel', onWheel, { passive: false })
        return () => el.removeEventListener('wheel', onWheel)
    }, [clampZoom])

    useEffect(() => {
        const onWheel = (e: WheelEvent) => {
            if (!radarHoverRef.current) return
            e.preventDefault()
            const delta = e.deltaY < 0 ? 0.06 : -0.06
            setZoom((z) => clampZoom(z + delta))
        }
        window.addEventListener('wheel', onWheel, { passive: false })
        return () => window.removeEventListener('wheel', onWheel)
    }, [clampZoom])

    useEffect(() => {
        return () => {
            if (panFrameRef.current) {
                cancelAnimationFrame(panFrameRef.current)
            }
        }
    }, [])

    const distanceBetweenPointers = useCallback((a: { x: number; y: number }, b: { x: number; y: number }) => {
        const dx = a.x - b.x
        const dy = a.y - b.y
        return Math.sqrt(dx * dx + dy * dy)
    }, [])

    const radarSize = useMemo(() => {
        const byWidth = viewport.width - 24
        const byHeight = viewport.height - 250
        return Math.max(280, Math.min(520, byWidth, byHeight))
    }, [viewport.height, viewport.width])

    const radarScale = useMemo(() => Number((radarSize / 520).toFixed(3)), [radarSize])

    const nodes = useMemo(() => {
        const list = diversifiedProfiles.slice(0, 20)
        const rings = [88, 132, 176, 220].map((r) => r * radarScale)

        return list.map((profile, idx) => {
            const distanceKm = typeof profile.distance_km === 'number'
                ? profile.distance_km
                : estimateDistanceKm(profile.id, profile.city, idx)
            const ringIndex = distanceKm < 16 ? 0 : distanceKm < 30 ? 1 : distanceKm < 45 ? 2 : 3
            const ringRadius = rings[ringIndex]

            const angle = (idx / Math.max(list.length, 1)) * Math.PI * 2 - Math.PI / 2
            const jitter = ((idx % 3) - 1) * 6
            const x = Math.cos(angle) * (ringRadius + jitter)
            const y = Math.sin(angle) * (ringRadius + jitter)

            return { profile, distanceKm, x, y }
        })
    }, [diversifiedProfiles, estimateDistanceKm, radarScale])

    const isDefaultGenderFilter = filters.genders.length === filters.preferredGenders.length
        && filters.genders.every((g) => filters.preferredGenders.includes(g))

    const activeFilterCount = [
        filters.city,
        !isDefaultGenderFilter && filters.genders.length > 0,
        filters.interests.length,
        filters.onlineOnly,
        filters.premiumOnly,
        filters.distanceKm !== 50,
        filters.eventOnly && filters.eventId,
        filters.serendipity,
        filters.diversity,
    ].filter(Boolean).length

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-10 h-10 text-pink-500" />
            </div>
        )
    }

    const hasProfiles = diversifiedProfiles.length > 0

    return (
        <div className="feed-shell relative min-h-[calc(100dvh-60px-64px)] overflow-hidden bg-transparent">
            {/* Premium Background Effects */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />
            <div className="absolute top-[10%] left-[20%] w-[40%] h-[40vh] rounded-full bg-pink-500/10 blur-[100px] animate-pulse pointer-events-none" style={{ animationDuration: '5s' }} />
            <div className="absolute bottom-[20%] right-[10%] w-[50%] h-[50vh] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

            <div className="feed-stars pointer-events-none absolute inset-0 opacity-80" />

            <div className="relative z-40">
                <BoostsBar />
            </div>

            <div className="absolute right-3 top-3 z-20 flex items-center gap-3 sm:right-6 sm:top-6">
                {canMiniBoost && (
                    <Button
                        onClick={handleMiniBoost}
                        variant="default"
                        size="icon"
                        className="rounded-full h-11 w-11 bg-white/5 backdrop-blur-md border border-white/10 text-yellow-500 hover:bg-yellow-500/20 hover:border-yellow-500/50 hover:text-yellow-400 transition-all shadow-[0_4px_20px_-5px_rgba(234,179,8,.3)] hover:scale-110"
                        title="Mini Boost"
                        disabled={boostLoading}
                    >
                        {boostLoading ? <Spinner className="h-5 w-5 animate-spin text-yellow-500" /> : <Zap size={20} />}
                    </Button>
                )}
                {canRewind && (
                    <Button
                        onClick={async () => {
                            try {
                                if (!isPremium) {
                                    const ok = await spendCoins({ amount: 5, reason: 'rewind' })
                                    if (!ok) return
                                }
                                if (!user) throw new Error('Kullanıcı yok')
                                await rewindLastPass(user.id)
                                refetch()
                                toast.push('Geri Alma uygulandı.', 'success')
                            } catch (err: unknown) {
                                toast.push(err instanceof Error ? err.message : 'Geri Alma başarısız.', 'error')
                            }
                        }}
                        variant="secondary"
                        size="icon"
                        className="rounded-full h-11 w-11 bg-white/5 backdrop-blur-md border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all shadow-lg hover:scale-110"
                        title="Geri Al"
                    >
                        <RotateCcw size={20} />
                    </Button>
                )}
                <div className="relative">
                    <Button
                        onClick={() => setShowFilters(true)}
                        variant="secondary"
                        size="icon"
                        className="feed-filter-btn rounded-full h-11 w-11 bg-white/5 backdrop-blur-md border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all shadow-lg hover:scale-110"
                        title="Filtreler"
                    >
                        <SlidersHorizontal size={20} />
                    </Button>
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                            {activeFilterCount}
                        </span>
                    )}
                </div>
            </div>

            <div className="relative z-10 mx-auto h-[calc(100dvh-170px)] w-full max-w-[900px] pt-24 sm:h-[560px] sm:pt-10">
                {!hasProfiles && (
                    <div className="absolute left-1/2 top-10 z-30 w-[min(90vw,420px)] -translate-x-1/2 bg-[var(--background)]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 text-center shadow-2xl">
                        <div className="text-5xl mb-4">🌌</div>
                        <h3 className="text-xl font-bold text-[var(--foreground)] tracking-tight">Yakında profil yok</h3>
                        <p className="text-sm text-gray-400 mt-2 font-medium">Filtreleri güncelleyebilir veya biraz sonra tekrar deneyebilirsin.</p>
                        <Button
                            onClick={() => refetch()}
                            variant="secondary"
                            className="mt-6 rounded-xl w-full py-6 font-bold bg-white text-black hover:bg-gray-100 transition-all hover:scale-[1.02]"
                        >
                            Yenile
                        </Button>
                    </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className={clsx('relative touch-none', isPanning ? 'cursor-grabbing' : 'cursor-grab')}
                        style={{ width: radarSize, height: radarSize }}
                        ref={radarRef}
                        onMouseEnter={() => { radarHoverRef.current = true }}
                        onMouseLeave={() => { radarHoverRef.current = false }}
                        onPointerDown={(e) => {
                            setIsInteracting(true)
                            activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

                            const pointers = Array.from(activePointersRef.current.values())
                            if (pointers.length >= 2) {
                                setIsPanning(false)
                                panStartRef.current = null
                                const [p1, p2] = pointers
                                pinchRef.current = {
                                    initialDistance: distanceBetweenPointers(p1, p2),
                                    initialZoom: zoom,
                                    initialPan: { ...pan },
                                    initialMidpoint: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
                                }
                            } else {
                                setIsPanning(true)
                                panStartRef.current = { x: e.clientX, y: e.clientY }
                                panOriginRef.current = { ...pan }
                            }

                            ; (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
                        }}
                        onPointerMove={(e) => {
                            if (activePointersRef.current.has(e.pointerId)) {
                                activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
                            }

                            const pointers = Array.from(activePointersRef.current.values())

                            if (pointers.length >= 2 && pinchRef.current) {
                                const [p1, p2] = pointers
                                const currentDistance = distanceBetweenPointers(p1, p2)
                                if (pinchRef.current.initialDistance > 0) {
                                    const ratio = currentDistance / pinchRef.current.initialDistance
                                    setZoom(clampZoom(pinchRef.current.initialZoom * ratio))
                                    const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
                                    setPan({
                                        x: pinchRef.current.initialPan.x + (midpoint.x - pinchRef.current.initialMidpoint.x),
                                        y: pinchRef.current.initialPan.y + (midpoint.y - pinchRef.current.initialMidpoint.y),
                                    })
                                }
                                return
                            }

                            if (!isPanning || !panStartRef.current) return

                            const dx = e.clientX - panStartRef.current.x
                            const dy = e.clientY - panStartRef.current.y
                            panTargetRef.current = {
                                x: panOriginRef.current.x + dx,
                                y: panOriginRef.current.y + dy,
                            }

                            if (!panFrameRef.current) {
                                panFrameRef.current = requestAnimationFrame(() => {
                                    setPan(panTargetRef.current)
                                    panFrameRef.current = null
                                })
                            }
                        }}
                        onPointerUp={(e) => {
                            activePointersRef.current.delete(e.pointerId)
                            if (activePointersRef.current.size < 2) {
                                pinchRef.current = null
                            }
                            setIsPanning(false)
                            setIsInteracting(activePointersRef.current.size > 0)
                            panStartRef.current = null
                            if ((e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId)) {
                                ; (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
                            }
                        }}
                        onPointerLeave={() => {
                            activePointersRef.current.clear()
                            pinchRef.current = null
                            setIsPanning(false)
                            setIsInteracting(false)
                            panStartRef.current = null
                        }}
                    >
                        <div className={clsx('absolute left-1/2 top-1/2', !isInteracting && 'transition-transform duration-150')} style={{ transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
                            {/* Radar Rings */}
                            {[90, 138, 186, 234].map((size) => (
                                <div key={size} className="feed-ring absolute left-1/2 top-1/2 rounded-full border border-white/10 overflow-hidden" style={{ width: size * 2 * radarScale, height: size * 2 * radarScale, transform: 'translate(-50%, -50%)' }}>
                                    <div className="absolute inset-0 bg-transparent" />
                                </div>
                            ))}

                            {nodes.map((node, idx) => {
                                const selected = node.profile.id === selectedId
                                const score = node.profile.compatibility_score || 0
                                const size = 30 + Math.min(12, Math.floor(score / 8))

                                return (
                                    <Link
                                        key={node.profile.id}
                                        href={`/profiles/${node.profile.id}`}
                                        onClick={() => setSelectedId(node.profile.id)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="absolute group z-20"
                                        style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
                                    >
                                        <div className={clsx('absolute -inset-1 blur-md rounded-full transition-opacity duration-300', selected ? 'bg-pink-500/50 opacity-100' : 'bg-pink-500/30 opacity-0 group-hover:opacity-100')} />
                                        <span
                                            className={clsx(
                                                'relative block overflow-hidden rounded-full border-[1.5px] transition-all duration-300 will-change-transform z-10',
                                                selected ? 'border-pink-500 shadow-[0_0_25px_rgba(236,72,153,.7)] scale-[1.15]' : 'border-white/20 hover:border-pink-400/80 hover:scale-110 opacity-80 hover:opacity-100',
                                                score >= 70 && !selected && 'border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,.5)]'
                                            )}
                                            style={{
                                                width: size,
                                                height: size,
                                                animation: `feed-node-float ${4 + (idx % 4)}s ease-in-out ${idx * 0.12}s infinite`,
                                            }}
                                        >
                                            <Image src={getProfileAvatar(node.profile)} alt={node.profile.display_name || 'Kullanıcı'} fill className="object-cover" />
                                        </span>
                                    </Link>
                                )
                            })}

                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group z-30 pointer-events-none">
                                <div className="absolute -inset-3 bg-gradient-to-tr from-pink-500/30 to-violet-500/30 rounded-full blur-xl animate-pulse" />
                                <div className="absolute -inset-[3px] bg-gradient-to-r from-pink-500 to-violet-500 rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />
                                <div className="relative overflow-hidden rounded-full border-[3px] border-[var(--background)] shadow-[0_0_30px_rgba(236,72,153,.5)]" style={{ width: Math.max(48, 64 * radarScale), height: Math.max(48, 64 * radarScale) }}>
                                    <Image src={selfPhoto} alt="Sen" fill className="object-cover" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-5 right-3 z-30 flex flex-col gap-3 sm:bottom-6 sm:right-6">
                    <Button size="icon" variant="secondary" onClick={() => setZoom((z) => clampZoom(z + 0.08))} className="feed-zoom-btn rounded-2xl h-12 w-12 bg-white/5 backdrop-blur-md border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all shadow-lg hover:scale-105"><Plus size={20} /></Button>
                    <Button size="icon" variant="secondary" onClick={() => setZoom((z) => clampZoom(z - 0.08))} className="feed-zoom-btn rounded-2xl h-12 w-12 bg-white/5 backdrop-blur-md border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all shadow-lg hover:scale-105"><Minus size={20} /></Button>
                </div>
            </div>

            {isFetchingNext && (
                <div className="absolute bottom-28 right-6 z-30 rounded-full border border-pink-500/30 bg-black/60 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-pink-300 shadow-[0_0_15px_-3px_rgba(236,72,153,0.3)]">
                    Yeni profiller yükleniyor...
                </div>
            )}

            <MatchCelebration open={matchOpen} onClose={() => setMatchOpen(false)} name={null} photoUrl={null} continueText="Keşfetmeye devam et" />

            {showFilters && (
                <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-md">
                    <div className="feed-filters absolute right-0 top-0 h-full w-full max-w-md bg-[var(--background)] border-l border-white/10 p-8 overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">Filtreler</h2>
                            <Button size="icon" variant="ghost" onClick={() => setShowFilters(false)} className="rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all border border-white/5">
                                <X size={20} />
                            </Button>
                        </div>

                        <div className="space-y-6 mt-8">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Yaş Aralığı</label>
                                <div className="mt-3 flex gap-3">
                                    <Input type="number" value={filters.ageMin} onChange={(e) => filters.setFilter('ageMin', Number(e.target.value))} className="feed-input bg-white/5 border-white/10 text-[var(--foreground)] rounded-xl focus:border-pink-500/50 focus:ring-0" placeholder="Min" />
                                    <Input type="number" value={filters.ageMax} onChange={(e) => filters.setFilter('ageMax', Number(e.target.value))} className="feed-input bg-white/5 border-white/10 text-[var(--foreground)] rounded-xl focus:border-pink-500/50 focus:ring-0" placeholder="Max" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Şehir</label>
                                <select
                                    value={filters.city}
                                    onChange={(e) => filters.setFilter('city', e.target.value)}
                                    className="feed-input mt-3 bg-white/5 border-white/10 text-[var(--foreground)] rounded-xl focus:border-pink-500/50 focus:ring-0 appearance-none px-4 py-3"
                                >
                                    <option value="" className="bg-[var(--background)] text-[var(--foreground)]">Farketmez</option>
                                    {CITY_OPTIONS.map((city) => (
                                        <option key={city} value={city} className="bg-[var(--background)] text-[var(--foreground)]">{city}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Cinsiyet</label>
                                <div className="mt-3 flex gap-3">
                                    {[
                                        { value: 'Male', label: 'Erkek' },
                                        { value: 'Female', label: 'Kadın' },
                                        { value: 'Non-binary', label: 'Non-binary' },
                                    ].map((option) => {
                                        const selected = filters.genders.includes(option.value)
                                        return (
                                            <button
                                                key={`feed-filter-gender-${option.value}`}
                                                type="button"
                                                onClick={() => {
                                                    const exists = filters.genders.includes(option.value)
                                                    const next = exists
                                                        ? filters.genders.filter((g) => g !== option.value)
                                                        : [...filters.genders, option.value]
                                                    filters.setFilter('genders', next)
                                                }}
                                                className={clsx(
                                                    'flex-1 rounded-xl text-sm font-semibold transition-all duration-300 py-3 border',
                                                    selected
                                                        ? 'bg-pink-500/20 border-pink-500/50 text-pink-300 shadow-[0_0_15px_-3px_rgba(236,72,153,0.3)]'
                                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20 hover:text-[var(--foreground)]'
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Mesafe (km)</label>
                                <Input type="range" min={5} max={200} value={filters.distanceKm} onChange={(e) => filters.setFilter('distanceKm', Number(e.target.value))} className="feed-range mt-3 w-full h-2 bg-white/10 rounded-lg p-0 accent-pink-500" />
                                <p className="text-xs text-gray-400 font-medium mt-2">{filters.distanceKm} km</p>
                            </div>

                            <div className={clsx('space-y-3', !canAdvancedFilters && 'opacity-60')}>
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Seçenekler</label>
                                <label className="flex items-center justify-between text-sm font-medium bg-white/5 border border-white/5 py-3 px-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                                    <span className="text-[var(--foreground)]">Sadece çevrim içi</span>
                                    <Input type="checkbox" checked={filters.onlineOnly} onChange={(e) => filters.setFilter('onlineOnly', e.target.checked)} disabled={!canAdvancedFilters} className="feed-checkbox w-4 h-4 rounded text-pink-500 focus:ring-pink-500/50 border-white/20 bg-black/50" />
                                </label>
                                <label className="flex items-center justify-between text-sm font-medium bg-white/5 border border-white/5 py-3 px-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                                    <span className="text-[var(--foreground)]">Sadece Premium</span>
                                    <Input type="checkbox" checked={filters.premiumOnly} onChange={(e) => filters.setFilter('premiumOnly', e.target.checked)} disabled={!canAdvancedFilters} className="feed-checkbox w-4 h-4 rounded text-pink-500 focus:ring-pink-500/50 border-white/20 bg-black/50" />
                                </label>
                                <label className="flex items-center justify-between text-sm font-medium bg-white/5 border border-white/5 py-3 px-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                                    <span className="text-[var(--foreground)]">Uyuma göre sırala</span>
                                    <Input type="checkbox" checked={sortByCompatibility} onChange={(e) => setSortByCompatibility(e.target.checked)} className="feed-checkbox w-4 h-4 rounded text-pink-500 focus:ring-pink-500/50 border-white/20 bg-black/50" />
                                </label>
                                <label className="flex items-center justify-between text-sm font-medium bg-white/5 border border-white/5 py-3 px-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                                    <span className="text-[var(--foreground)]">Sürpriz mod</span>
                                    <Input type="checkbox" checked={filters.serendipity} onChange={(e) => filters.setFilter('serendipity', e.target.checked)} className="feed-checkbox w-4 h-4 rounded text-pink-500 focus:ring-pink-500/50 border-white/20 bg-black/50" />
                                </label>
                                <label className="flex items-center justify-between text-sm font-medium bg-white/5 border border-white/5 py-3 px-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                                    <span className="text-[var(--foreground)]">Daha çeşitli</span>
                                    <Input type="checkbox" checked={filters.diversity} onChange={(e) => filters.setFilter('diversity', e.target.checked)} className="feed-checkbox w-4 h-4 rounded text-pink-500 focus:ring-pink-500/50 border-white/20 bg-black/50" />
                                </label>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Etkinlik</label>
                                <select
                                    value={filters.eventId}
                                    onChange={(e) => filters.setFilter('eventId', e.target.value)}
                                    className="feed-input w-full bg-white/5 border border-white/10 text-[var(--foreground)] rounded-xl px-4 py-3 text-sm focus:border-pink-500/50 focus:ring-0 outline-none"
                                >
                                    <option value="" className="bg-[var(--background)] text-[var(--foreground)]">Etkinlik seç</option>
                                    {events.map((e) => (
                                        <option key={e.id} value={e.id} className="bg-[var(--background)] text-[var(--foreground)]">{e.title}</option>
                                    ))}
                                </select>
                                <label className="flex items-center justify-between text-sm font-medium bg-white/5 border border-white/5 py-3 px-4 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                                    <span className="text-[var(--foreground)]">Etkinlikte eşleş</span>
                                    <Input type="checkbox" checked={filters.eventOnly} onChange={(e) => filters.setFilter('eventOnly', e.target.checked)} className="feed-checkbox w-4 h-4 rounded text-pink-500 focus:ring-pink-500/50 border-white/20 bg-black/50" />
                                </label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <Button onClick={() => filters.reset()} variant="secondary" className="flex-1 py-6 rounded-xl font-bold bg-white/5 hover:bg-white/10 border-white/10 transition-all text-[var(--foreground)]">Sıfırla</Button>
                                <Button onClick={() => setShowFilters(false)} variant="default" className="flex-[2] py-6 rounded-xl font-bold transition-all duration-300 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white shadow-[0_0_30px_-10px_rgba(236,72,153,0.5)] hover:scale-[1.02] border-0">Uygula</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes feed-node-float {
                    0%,
                    100% {
                        transform: translateY(0) scale(1);
                    }
                    50% {
                        transform: translateY(-5px) scale(1.03);
                    }
                }
            `}</style>
        </div>
    )
}
