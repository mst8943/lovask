'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { activateBoost, fetchActiveBoost } from '@/services/economyService'
import { claimDailyBoost } from '@/services/premiumService'
import { useEconomy } from '@/hooks/useEconomy'
import { activateBoostPlus } from '@/services/extraFeaturesService'
import { Zap } from 'lucide-react'
import { BOOST_CONFIG } from '@/lib/boostConfig'
import { Button } from '@/components/ui/Button'

export default function BoostPage() {
    const { user } = useAuthStore()
    const { spendCoins, balance, hasFeature, hasFeatureForTier } = useEconomy()
    const [activeUntil, setActiveUntil] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [dailyLoading, setDailyLoading] = useState(false)

    const canDailyBoost = hasFeature('daily_boost')
    const premiumDailyBoost = hasFeatureForTier('premium', 'daily_boost')

    useEffect(() => {
        const load = async () => {
            if (!user) return
            const boost = await fetchActiveBoost(user.id)
            if (boost?.ends_at) setActiveUntil(boost.ends_at)
        }
        load()
    }, [user])

    const handleBoost = async () => {
        if (!user) return
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            if (balance < BOOST_CONFIG.standardBoost.cost) {
                throw new Error('Yetersiz jeton')
            }
            const ok = await spendCoins({ amount: BOOST_CONFIG.standardBoost.cost, reason: 'boost_purchase', metadata: { minutes: BOOST_CONFIG.standardBoost.minutes } })
            if (!ok) return
            const boost = await activateBoost(user.id, BOOST_CONFIG.standardBoost.minutes, 'purchase')
            setActiveUntil(boost.ends_at)
            setSuccess(`Boost ${BOOST_CONFIG.standardBoost.minutes} dakika aktif edildi!`)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Boost aktif edilemedi.')
        } finally {
            setLoading(false)
        }
    }

    const handleBoostPlus = async () => {
        if (!user) return
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            if (balance < BOOST_CONFIG.boostPlus.cost) {
                throw new Error('Yetersiz jeton')
            }
            const ok = await spendCoins({ amount: BOOST_CONFIG.boostPlus.cost, reason: 'boost_plus', metadata: { minutes: BOOST_CONFIG.boostPlus.minutes } })
            if (!ok) return
            await activateBoostPlus(BOOST_CONFIG.boostPlus.minutes)
            const boost = await fetchActiveBoost(user.id)
            if (boost?.ends_at) setActiveUntil(boost.ends_at)
            setSuccess(`Boost Plus ${BOOST_CONFIG.boostPlus.minutes} dakika aktif edildi!`)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Boost Plus aktif edilemedi.')
        } finally {
            setLoading(false)
        }
    }

    const handleDailyBoost = async () => {
        if (!canDailyBoost) return
        setDailyLoading(true)
        setError(null)
        setSuccess(null)
        try {
            const ok = await claimDailyBoost()
            if (!ok) {
                setError('Gunluk boost zaten alinmis.')
                return
            }
            setSuccess('Gunluk boost aktif edildi!')
            const boost = await fetchActiveBoost(user!.id)
            if (boost?.ends_at) setActiveUntil(boost.ends_at)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Gunluk boost aktif edilemedi.')
        } finally {
            setDailyLoading(false)
        }
    }

    return (
        <div className="space-y-6 pb-8">

            <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <Zap className="text-violet-400" size={20} />
                    </div>
                    <div>
                        <h2 className="font-semibold">30 Dakika Boost</h2>
                        <p className="text-xs text-gray-400">Kesfette daha gorunur ol</p>
                    </div>
                </div>

                <div className="text-sm text-gray-300">
                    Ucret: <span className="text-yellow-400 font-semibold">{BOOST_CONFIG.standardBoost.cost} jeton</span>
                </div>
                <div className="text-xs text-gray-400">
                    Boost Aktiflestir: Profilini kesfette {BOOST_CONFIG.standardBoost.minutes} dakika boyunca daha ust siralarda gosterir.
                </div>
                <div className="text-[10px] text-gray-500">
                    Yaklaşık değer: {Math.floor(BOOST_CONFIG.standardBoost.cost / 20)} sohbet başlatma
                </div>
                <div className="text-xs text-gray-400">
                    Boost Plus: {BOOST_CONFIG.boostPlus.minutes} dakika {BOOST_CONFIG.boostPlus.cost} jeton. Gunluk Boost Premium icin ucretsiz.
                </div>
                <div className="text-xs text-gray-400">
                    Boost Plus: Daha uzun sureli one cikarma. Standart boosta gore daha uzun gorunurluk saglar.
                </div>
                <div className="text-[10px] text-gray-500">
                    Boost Plus değeri: {Math.floor(BOOST_CONFIG.boostPlus.cost / 20)} sohbet başlatma
                </div>

                {activeUntil && (
                    <div className="text-xs text-green-400">
                        {new Date(activeUntil).toLocaleTimeString()}&apos;e kadar aktif
                    </div>
                )}

                {error && (
                    <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 text-sm text-green-200 bg-green-500/10 border border-green-500/20 rounded-lg">
                        {success}
                    </div>
                )}

                <div className="space-y-2">
                    <Button
                        onClick={handleBoost}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Aktiflestiriliyor...' : 'Boost Aktiflestir'}
                    </Button>
                    <Button
                        onClick={handleBoostPlus}
                        disabled={loading}
                        variant="secondary"
                        className="w-full"
                    >
                        {loading ? 'Aktiflestiriliyor...' : `Boost Plus (${BOOST_CONFIG.boostPlus.cost} jeton)`}
                    </Button>
                    {canDailyBoost && (
                        <Button
                            onClick={handleDailyBoost}
                            disabled={dailyLoading}
                            variant="secondary"
                            className="w-full"
                        >
                            {dailyLoading ? 'Aliniyor...' : 'Gunluk Boost Al'}
                        </Button>
                    )}
                    {!canDailyBoost && premiumDailyBoost && (
                        <div className="text-xs text-gray-500">Gunluk boost Premium ile aktif olur.</div>
                    )}
                    {!canDailyBoost && !premiumDailyBoost && (
                        <div className="text-xs text-gray-500">Gunluk boost bu paketler icin kapali.</div>
                    )}
                </div>
            </div>
        </div>
    )
}
