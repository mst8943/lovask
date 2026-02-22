'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useEconomy } from '@/hooks/useEconomy'
import { fetchWhoLikedMe } from '@/services/premiumService'
import { fetchAccessPlan, fetchActiveUnlock, unlockAccess } from '@/services/accessPlanService'
import { createClient } from '@/lib/supabase/client'
import { Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getProfileAvatar } from '@/utils/avatar'
import { Button } from '@/components/ui/Button'
import { useSearchParams } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'
type LikeRow = {
    from_user: string
    profile: {
        id: string
        display_name: string | null
        photos: string[] | null
        age: number | null
        city: string | null
        gender: string | null
        is_bot: boolean | null
    } | undefined
    isMatch: boolean
    reveal: boolean
}
export default function LikedYouPage() {
    const { user } = useAuthStore()
    const { hasFeature, hasFeatureForTier } = useEconomy()
    const [likedRows, setLikedRows] = useState<LikeRow[]>([])
    const [matchRows, setMatchRows] = useState<LikeRow[]>([])
    const [favoriteRows, setFavoriteRows] = useState<LikeRow[]>([])
    const [loading, setLoading] = useState(true)
    const [unlocking, setUnlocking] = useState(false)
    const [unlockActive, setUnlockActive] = useState(false)
    const [unlockExpiresAt, setUnlockExpiresAt] = useState<string | null>(null)
    const [plan, setPlan] = useState<{ hours: number; cost: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const supabase = useMemo(() => createClient(), [])
    const refreshRef = useRef<NodeJS.Timeout | null>(null)
    const searchParams = useSearchParams()
    const initialTab = (searchParams?.get('tab') as 'matches' | 'likes' | 'favorites' | null) || 'matches'
    const [tab, setTab] = useState<'matches' | 'likes' | 'favorites'>(initialTab)
    const premiumHas = hasFeatureForTier('premium', 'liked_you')
    const canAccess = hasFeature('liked_you')
    const loadMatches = useCallback(async () => {
        if (!user) {
            setMatchRows([])
            return
        }
        const { data: matches } = await supabase
            .from('matches')
            .select('id, user_a, user_b, created_at')
            .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
            .order('created_at', { ascending: false })
        const otherIds = (matches || [])
            .map((m) => (m.user_a === user.id ? m.user_b : m.user_a))
            .filter(Boolean)
        if (otherIds.length === 0) {
            setMatchRows([])
            return
        }
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, photos, age, city, gender, is_bot')
            .in('id', otherIds)
        const map = new Map((profiles || []).map((p) => [p.id, p]))
        const next = otherIds.map((id) => ({
            from_user: id,
            profile: map.get(id),
            isMatch: true,
            reveal: true,
        }))
        setMatchRows(next)
    }, [supabase, user])
    const loadLikes = useCallback(async (allowHidden: boolean) => {
        if (!user) {
            setLikedRows([])
            return
        }
        const likes = await fetchWhoLikedMe()
        const ids = likes.map((l: { from_user: string }) => l.from_user)
        if (ids.length === 0) {
            setLikedRows([])
            return
        }
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, photos, age, city, gender, is_bot')
            .in('id', ids)
        const map = new Map((profiles || []).map((p) => [p.id, p]))
        const nextRows = likes.map((l: { from_user: string }) => ({
            ...l,
            profile: map.get(l.from_user),
            isMatch: false,
            reveal: allowHidden,
        }))
        setLikedRows(nextRows)
    }, [supabase, user])
    const loadFavorites = useCallback(async () => {
        if (!user) {
            setFavoriteRows([])
            return
        }
        const { data: favorites } = await supabase
            .from('favorites')
            .select('to_user')
            .eq('from_user', user.id)
            .order('created_at', { ascending: false })
        const ids = (favorites || []).map((f: { to_user: string }) => f.to_user)
        if (ids.length === 0) {
            setFavoriteRows([])
            return
        }
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, photos, age, city, gender, is_bot')
            .in('id', ids)
        const map = new Map((profiles || []).map((p) => [p.id, p]))
        const next = ids.map((id) => ({
            from_user: id,
            profile: map.get(id),
            isMatch: false,
            reveal: true,
        }))
        setFavoriteRows(next)
    }, [supabase, user])
    const scheduleRefresh = useCallback((allowHidden: boolean) => {
        if (refreshRef.current) clearTimeout(refreshRef.current)
        refreshRef.current = setTimeout(() => {
            void Promise.all([loadLikes(allowHidden), loadMatches(), loadFavorites()])
        }, 200)
    }, [loadLikes, loadMatches, loadFavorites])
    useEffect(() => {
        const id = setTimeout(() => {
            const load = async () => {
                if (!user) {
                    setLoading(false)
                    return
                }
                setLoading(true)
                setError(null)
                try {
                    const currentPlan = await fetchAccessPlan('liked_you')
                    if (currentPlan?.is_active) {
                        setPlan({ hours: currentPlan.hours, cost: currentPlan.cost })
                    }
                    const unlock = await fetchActiveUnlock(user.id, 'liked_you')
                    setUnlockActive(!!unlock)
                    setUnlockExpiresAt(unlock?.expires_at || null)
                    const allowHidden = canAccess || !!unlock
                    await Promise.all([loadLikes(allowHidden), loadMatches(), loadFavorites()])
                } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Beğenenler yüklenemedi.')
                } finally {
                    setLoading(false)
                }
            }
            void load()
        }, 0)
        // Real-time subscription for new likes and matches
        if (!user) return
        const channelLikes = supabase
            .channel(`liked-you-likes:${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'likes', filter: `to_user=eq.${user.id}` },
                () => {
                    const allowHidden = canAccess || unlockActive
                    scheduleRefresh(allowHidden)
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'likes', filter: `to_user=eq.${user.id}` },
                () => {
                    const allowHidden = canAccess || unlockActive
                    scheduleRefresh(allowHidden)
                }
            )
            .subscribe()
        const channelMatchesA = supabase
            .channel(`liked-you-matches-a:${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'matches', filter: `user_a=eq.${user.id}` },
                () => {
                    const allowHidden = canAccess || unlockActive
                    scheduleRefresh(allowHidden)
                }
            )
            .subscribe()
        const channelMatchesB = supabase
            .channel(`liked-you-matches-b:${user.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'matches', filter: `user_b=eq.${user.id}` },
                () => {
                    const allowHidden = canAccess || unlockActive
                    scheduleRefresh(allowHidden)
                }
            )
            .subscribe()
        const channelFavorites = supabase
            .channel(`liked-you-favorites:${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'favorites', filter: `from_user=eq.${user.id}` },
                () => {
                    const allowHidden = canAccess || unlockActive
                    scheduleRefresh(allowHidden)
                }
            )
            .subscribe()
        return () => {
            clearTimeout(id)
            supabase.removeChannel(channelLikes)
            supabase.removeChannel(channelMatchesA)
            supabase.removeChannel(channelMatchesB)
            supabase.removeChannel(channelFavorites)
            if (refreshRef.current) {
                clearTimeout(refreshRef.current)
                refreshRef.current = null
            }
        }
    }, [user, canAccess, unlockActive, loadLikes, loadMatches, loadFavorites, scheduleRefresh, supabase])
    const handleUnlock = async () => {
        if (!user) return
        setUnlocking(true)
        try {
            await unlockAccess('liked_you')
            const unlock = await fetchActiveUnlock(user.id, 'liked_you')
            setUnlockActive(!!unlock)
            setUnlockExpiresAt(unlock?.expires_at || null)
            setLoading(true)
            await Promise.all([loadLikes(true), loadMatches()])
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erişim açılamadı.')
        } finally {
            setUnlocking(false)
            setLoading(false)
        }
    }
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    const matches = matchRows
    const likes = likedRows
    const favorites = favoriteRows
    const renderCard = (r: LikeRow) => {
        const reveal = r.reveal
        const profile = r.profile
        const photoUrl = getProfileAvatar(profile)
        const card = (
            <div className="glass-panel rounded-[28px] border border-white/10 p-4 text-center transition hover:border-white/20 hover:bg-white/[0.08]">
                <div className={`relative mx-auto h-24 w-24 overflow-hidden rounded-full border border-white/15 ${reveal ? '' : 'opacity-70'}`}>
                    <Image
                        src={photoUrl}
                        alt={profile?.display_name || 'Kullanıcı'}
                        fill
                        className={`object-cover ${reveal ? '' : 'blur-md scale-110'}`}
                    />
                    {!reveal && (
                        <div className="absolute inset-0 bg-black/30" />
                    )}
                </div>
                <div className="mt-3 min-w-0 space-y-1">
                    <div className="truncate text-sm font-semibold">
                        {reveal ? profile?.display_name || 'Kullanıcı' : 'Gizli Kullanıcı'}
                    </div>
                    <div className="text-xs text-gray-400">
                        {reveal ? `${profile?.age || '—'} • ${profile?.city || '—'}` : 'Detaylar gizli'}
                    </div>
                    {r.isMatch && (
                        <div className="mx-auto mt-1 w-fit rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                            Eşleşme
                        </div>
                    )}
                </div>
            </div>
        )
        if (!reveal) {
            return (
                <div key={r.from_user} className="opacity-70">
                    {card}
                </div>
            )
        }
        return (
            <Link key={r.from_user} href={`/profiles/${r.from_user}`} className="block">
                {card}
            </Link>
        )
    }
    return (
        <div className="space-y-6 pb-8">
            {unlockActive && unlockExpiresAt && (
                <div className="text-xs text-emerald-300">
                    Erişim açık: {new Date(unlockExpiresAt).toLocaleString()} tarihine kadar
                </div>
            )}
            {error && (
                <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg">
                    {error}
                </div>
            )}
            {!canAccess && !unlockActive && (
                <div className="glass-panel p-5 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-sm text-yellow-300">
                        <Star size={16} />
                        Bu özellik kapalı. Eşleşmen varsa açık görünür.
                    </div>
                    <p className="text-xs text-gray-400">
                        Diğer beğenenler saydam görünür. Jetonla açabilir veya premium&apos;a geçebilirsin.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {plan ? (
                            <Button
                                onClick={handleUnlock}
                                disabled={unlocking}
                                variant="secondary"
                                size="sm"
                                className="text-sm"
                            >
                                {unlocking ? 'Açılıyor...' : `${plan.hours} saat aç (${plan.cost} jeton)`}
                            </Button>
                        ) : (
                            <div className="text-xs text-gray-500">Jetonla açma planı aktif değil.</div>
                        )}
                        {premiumHas && (
                            <Link href="/store/premium" className="px-4 py-2 rounded-full bg-pink-500 text-white text-sm">
                                Premium&apos;a Geç
                            </Link>
                        )}
                    </div>
                </div>
            )}
            <div className="liked-tabs flex items-center gap-2 text-xs">
                {(['matches', 'likes', 'favorites'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={`px-3 py-1.5 rounded-full border ${tab === key ? 'bg-pink-500/20 text-pink-200 border-pink-500/40' : 'bg-white/5 text-gray-300 border-white/10'}`}
                    >
                        {key === 'matches' ? 'Eşleşmeler' : key === 'likes' ? 'Beğenenler' : 'Favoriler'}
                    </button>
                ))}
            </div>
            {tab === 'matches' && (
                <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Eşleşmeler</h2>
                    <span className="text-xs text-gray-400">{matches.length}</span>
                </div>
                {matches.length === 0 && (
                    <div className="glass-panel p-4 rounded-2xl text-sm text-gray-400">
                        Henüz eşleşme yok.
                        <div className="mt-3">
                            <Link href="/swipe" className="inline-flex px-3 py-1.5 rounded-full bg-pink-500 text-white text-xs">
                                Keşfetmeye başla
                            </Link>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {matches.map((r) => renderCard(r))}
                </div>
            </section>
            )}
            {tab === 'likes' && (
                <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Beğenenler</h2>
                    <span className="text-xs text-gray-400">{likes.length}</span>
                </div>
                {likes.length === 0 && (
                    <div className="glass-panel p-8 rounded-2xl text-center space-y-3">
                        <div className="text-5xl">💫</div>
                        <h3 className="text-lg font-semibold">Henüz kimse beğenmemiş</h3>
                        <p className="text-sm text-gray-400">
                            Profilini tamamla ve aktif ol. Yakında beğeniler gelmeye başlayacak!
                        </p>
                        <Link href="/swipe" className="inline-flex px-4 py-2 rounded-full bg-white/10 text-xs text-gray-200">
                            Keşfetmeye başla
                        </Link>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {likes.map((r) => renderCard(r))}
                </div>
            </section>
            )}
            {tab === 'favorites' && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Favoriler</h2>
                        <span className="text-xs text-gray-400">{favorites.length}</span>
                    </div>
                    {favorites.length === 0 && (
                        <div className="glass-panel p-8 rounded-2xl text-center space-y-3">
                            <div className="text-5xl">⭐</div>
                            <h3 className="text-lg font-semibold">Favorin yok</h3>
                            <p className="text-sm text-gray-400">
                                Beğendiklerini favorilere ekleyerek daha sonra hızlıca bulabilirsin.
                            </p>
                            <Link href="/swipe" className="inline-flex px-4 py-2 rounded-full bg-white/10 text-xs text-gray-200">
                                Keşfetmeye başla
                            </Link>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {favorites.map((r) => renderCard(r))}
                    </div>
                </section>
            )}
        </div>
    )
}