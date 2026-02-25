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
            <div className="bg-surface-1 rounded-[var(--radius-xl)] border border-surface-2 p-4 text-center transition hover:border-brand-primary/40 hover:bg-surface-2 shadow-[var(--shadow-sm)]">
                <div className={`relative mx-auto h-24 w-24 overflow-hidden rounded-full border border-surface-2 ${reveal ? '' : 'opacity-70'}`}>
                    <Image
                        src={photoUrl}
                        alt={profile?.display_name || 'Kullanıcı'}
                        fill
                        className={`object-cover ${reveal ? '' : 'blur-md scale-110'}`}
                    />
                    {!reveal && (
                        <div className="absolute inset-0 bg-surface-0/40 backdrop-blur-sm" />
                    )}
                </div>
                <div className="mt-3 min-w-0 space-y-1">
                    <div className="truncate text-sm font-semibold text-text-primary">
                        {reveal ? profile?.display_name || 'Kullanıcı' : 'Gizli Kullanıcı'}
                    </div>
                    <div className="text-xs text-text-secondary">
                        {reveal ? `${profile?.age || '—'} • ${profile?.city || '—'}` : 'Detaylar gizli'}
                    </div>
                    {r.isMatch && (
                        <div className="mx-auto mt-1 w-fit rounded-full border border-status-success/30 bg-status-success/10 px-2 py-0.5 text-[10px] text-status-success">
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
                <div className="text-xs text-status-success">
                    Erişim açık: {new Date(unlockExpiresAt).toLocaleString()} tarihine kadar
                </div>
            )}
            {error && (
                <div className="p-3 text-sm text-status-destructive bg-status-destructive/10 border border-status-destructive/20 rounded-[var(--radius-md)]">
                    {error}
                </div>
            )}
            {!canAccess && !unlockActive && (
                <div className="bg-surface-1 border border-surface-2 p-5 rounded-[var(--radius-xl)] space-y-3 shadow-[var(--shadow-sm)]">
                    <div className="flex items-center gap-2 text-sm text-brand-accent">
                        <Star size={16} />
                        Bu özellik kapalı. Eşleşmen varsa açık görünür.
                    </div>
                    <p className="text-xs text-text-secondary">
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
                            <div className="text-xs text-text-disabled">Jetonla açma planı aktif değil.</div>
                        )}
                        {premiumHas && (
                            <Link href="/store/premium" className="px-4 py-2 rounded-[var(--radius-full)] bg-brand-primary text-text-primary text-sm font-semibold hover:opacity-90 transition-opacity">
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
                        className={`px-3 py-1.5 rounded-[var(--radius-full)] border transition-colors ${tab === key ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/50' : 'bg-surface-2 text-text-secondary border-transparent hover:text-text-primary'}`}
                    >
                        {key === 'matches' ? 'Eşleşmeler' : key === 'likes' ? 'Beğenenler' : 'Favoriler'}
                    </button>
                ))}
            </div>
            {tab === 'matches' && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-text-primary">Eşleşmeler</h2>
                        <span className="text-xs text-text-secondary">{matches.length}</span>
                    </div>
                    {matches.length === 0 && (
                        <div className="bg-surface-1 border border-surface-2 p-6 rounded-[var(--radius-xl)] text-center text-sm text-text-secondary shadow-[var(--shadow-sm)]">
                            Henüz eşleşme yok.
                            <div className="mt-4">
                                <Link href="/swipe" className="inline-flex px-4 py-2 rounded-[var(--radius-full)] bg-brand-primary text-text-primary font-semibold text-xs hover:opacity-90 transition-opacity">
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
                        <h2 className="text-lg font-semibold text-text-primary">Beğenenler</h2>
                        <span className="text-xs text-text-secondary">{likes.length}</span>
                    </div>
                    {likes.length === 0 && (
                        <div className="bg-surface-1 border border-surface-2 p-8 rounded-[var(--radius-xl)] text-center space-y-3 shadow-[var(--shadow-sm)]">
                            <div className="text-5xl">💫</div>
                            <h3 className="text-lg font-semibold text-text-primary">Henüz kimse beğenmemiş</h3>
                            <p className="text-sm text-text-secondary">
                                Profilini tamamla ve aktif ol. Yakında beğeniler gelmeye başlayacak!
                            </p>
                            <Link href="/swipe" className="inline-flex px-4 py-2 rounded-[var(--radius-full)] bg-surface-2 text-xs text-text-primary hover:bg-surface-3 transition-colors border border-surface-2 hover:border-surface-3 font-medium">
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
                        <h2 className="text-lg font-semibold text-text-primary">Favoriler</h2>
                        <span className="text-xs text-text-secondary">{favorites.length}</span>
                    </div>
                    {favorites.length === 0 && (
                        <div className="bg-surface-1 border border-surface-2 p-8 rounded-[var(--radius-xl)] text-center space-y-3 shadow-[var(--shadow-sm)]">
                            <div className="text-5xl">⭐</div>
                            <h3 className="text-lg font-semibold text-text-primary">Favorin yok</h3>
                            <p className="text-sm text-text-secondary">
                                Beğendiklerini favorilere ekleyerek daha sonra hızlıca bulabilirsin.
                            </p>
                            <Link href="/swipe" className="inline-flex px-4 py-2 rounded-[var(--radius-full)] bg-surface-2 text-xs text-text-primary hover:bg-surface-3 transition-colors border border-surface-2 hover:border-surface-3 font-medium">
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