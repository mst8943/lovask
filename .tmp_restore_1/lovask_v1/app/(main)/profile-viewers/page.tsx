'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useEconomy } from '@/hooks/useEconomy'
import { fetchProfileViewers } from '@/services/premiumService'
import { fetchAccessPlan, fetchActiveUnlock, unlockAccess } from '@/services/accessPlanService'
import { createClient } from '@/lib/supabase/client'
import { Star } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
export default function ProfileViewersPage() {
    const { user } = useAuthStore()
    const { hasFeature, hasFeatureForTier, featureFlags } = useEconomy()
    const [rows, setRows] = useState<Array<{
        viewer_id: string
        profile?: { display_name: string | null; age: number | null; city: string | null }
    }>>([])
    const [loading, setLoading] = useState(true)
    const [unlocking, setUnlocking] = useState(false)
    const [unlockActive, setUnlockActive] = useState(false)
    const [unlockExpiresAt, setUnlockExpiresAt] = useState<string | null>(null)
    const [plan, setPlan] = useState<{ hours: number; cost: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const supabase = useMemo(() => createClient(), [])
    const premiumHas = hasFeatureForTier('premium', 'profile_viewers')
    const canAccess = hasFeature('profile_viewers')
    const loadViewers = useCallback(async (userId: string) => {
        setLoading(true)
        setError(null)
        try {
            const currentPlan = await fetchAccessPlan('profile_viewers')
            if (currentPlan?.is_active) {
                setPlan({ hours: currentPlan.hours, cost: currentPlan.cost })
            }
            const unlock = await fetchActiveUnlock(userId, 'profile_viewers')
            setUnlockActive(!!unlock)
            setUnlockExpiresAt(unlock?.expires_at || null)
            if (!canAccess && !unlock) {
                setRows([])
                return
            }
            const views = await fetchProfileViewers(userId) as Array<{ viewer_id: string }>
            const ids = views.map((v) => v.viewer_id)
            if (ids.length === 0) {
                setRows([])
                return
            }
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, photos, age, city')
                .in('id', ids)
            const profileRows = (profiles || []) as Array<{ id: string; display_name: string | null; age: number | null; city: string | null }>
            const map = new Map(profileRows.map((p) => [p.id, p]))
            setRows(views.map((v) => ({ ...v, profile: map.get(v.viewer_id) })))
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Görüntüleyenler yüklenemedi.')
        } finally {
            setLoading(false)
        }
    }, [canAccess, supabase])
    useEffect(() => {
        if (!user) return
        const id = setTimeout(() => {
            void loadViewers(user.id)
        }, 0)
        return () => clearTimeout(id)
    }, [featureFlags, loadViewers, user])
    const handleUnlock = async () => {
        if (!user) return
        setUnlocking(true)
        try {
            await unlockAccess('profile_viewers')
            const unlock = await fetchActiveUnlock(user.id, 'profile_viewers')
            setUnlockActive(!!unlock)
            setUnlockExpiresAt(unlock?.expires_at || null)
            setLoading(true)
            const views = await fetchProfileViewers(user.id) as Array<{ viewer_id: string }>
            const ids = views.map((v) => v.viewer_id)
            if (ids.length === 0) {
                setRows([])
                setLoading(false)
                return
            }
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, photos, age, city')
                .in('id', ids)
            const profileRows = (profiles || []) as Array<{ id: string; display_name: string | null; age: number | null; city: string | null }>
            const map = new Map(profileRows.map((p) => [p.id, p]))
            setRows(views.map((v) => ({ ...v, profile: map.get(v.viewer_id) })))
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
    if (!canAccess && !unlockActive) {
        return (
            <div className="glass-panel p-6 rounded-2xl space-y-3 text-center">
                <Star className="mx-auto text-yellow-400" />
                <h2 className="font-semibold">Bu özellik kapalı</h2>
                <p className="text-sm text-gray-400">Bu paket bu özelliğe erişim vermiyor.</p>
                {plan ? (
                    <Button
                        onClick={handleUnlock}
                        disabled={unlocking}
                        variant="secondary"
                        size="sm"
                        className="inline-block text-sm"
                    >
                        {unlocking ? 'Açılıyor...' : `${plan.hours} saat aç (${plan.cost} jeton)`}
                    </Button>
                ) : (
                    <div className="text-xs text-gray-500">Jetonla açma planı aktif değil.</div>
                )}
                {premiumHas && (
                    <Link href="/store/premium" className="inline-block px-4 py-2 rounded-full bg-pink-500 text-white text-sm">
                        Premium&apos;a Geç
                    </Link>
                )}
            </div>
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
            <div className="space-y-3">
                {rows.map((r) => (
                    <Link key={r.viewer_id} href={`/profiles/${r.viewer_id}`} className="glass-panel p-4 rounded-2xl block">
                        <div className="font-semibold">{r.profile?.display_name || 'Kullanıcı'}</div>
                        <div className="text-xs text-gray-400">
                            {r.profile?.age || '—'} • {r.profile?.city || '—'}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}