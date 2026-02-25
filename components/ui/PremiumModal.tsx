'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Gem, X } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useEconomy } from '@/hooks/useEconomy'
import { FEATURE_ITEMS } from '@/lib/featureFlags'
import Spinner from '@/components/ui/Spinner'
import { useRouter } from 'next/navigation'
import { fetchCoinPackages, fetchPremiumPlans, type CoinPackage, type PremiumPlan } from '@/services/packageService'

interface PremiumModalProps {
    onClose: () => void
}
export default function PremiumModal({ onClose }: PremiumModalProps) {
    const { user } = useAuthStore()
    const { featureFlags } = useEconomy()
    const router = useRouter()
    const [loadingData, setLoadingData] = useState(true)
    const [packages, setPackages] = useState<CoinPackage[]>([])
    const [plans, setPlans] = useState<PremiumPlan[]>([])
    const [mounted, setMounted] = useState(false)
    const premiumList = useMemo(() => {
        const flags = featureFlags?.premium || {}
        return FEATURE_ITEMS.filter((f) => flags[f.key]).map((f) => f.label)
    }, [featureFlags])
    const premiumEnabled = premiumList.length > 0
    useEffect(() => {
        setMounted(true)
        const load = async () => {
            try {
                const [pkgs, pms] = await Promise.all([fetchCoinPackages(), fetchPremiumPlans()])
                setPackages(pkgs)
                setPlans(pms)
            } catch (err) {
                console.error(err)
            } finally {
                setLoadingData(false)
            }
        }
        load()
        return () => setMounted(false)
    }, [])

    const handlePackageClick = (kind: 'coins' | 'premium', id: string) => {
        onClose()
        router.push(`/store/premium?type=${kind}&id=${id}`)
    }
    if (!mounted) return null
    const modal = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-surface-1 border border-surface-2 rounded-[var(--radius-xl)] w-full max-w-sm overflow-hidden shadow-[var(--shadow-md)] relative"
            >
                <div className="p-6 text-center space-y-5">
                    <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors">
                        <X size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-accent to-fuchsia-500 bg-clip-text text-transparent">
                            Jeton ve Premium
                        </h2>
                        <p className="text-text-secondary text-sm mt-1">Deneyimini güçlendir</p>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-5 custom-scrollbar">
                        <div className="grid gap-3">
                            <div className="text-left text-[10px] font-bold uppercase tracking-wider text-text-secondary/60 ml-1">Jeton Paketleri</div>
                            {loadingData ? (
                                <div className="p-8 flex justify-center"><Spinner className="w-6 h-6 animate-spin text-brand-accent" /></div>
                            ) : packages.length > 0 ? (
                                packages.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => handlePackageClick('coins', p.id)}
                                        className="p-4 bg-surface-2 hover:bg-surface-1 rounded-[var(--radius-md)] flex items-center justify-between group transition-all border border-surface-1 hover:border-brand-accent/30"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-accent font-bold group-hover:scale-110 transition-transform duration-[var(--duration-fast)]">
                                                {p.coins}
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-bold text-text-primary text-sm">{p.title || `${p.coins} Jeton`}</h3>
                                                <span className="text-[10px] text-text-secondary">Paketi yönet</span>
                                            </div>
                                        </div>
                                        <span className="font-bold text-text-primary text-sm">{p.price} {p.currency || 'TRY'}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="text-xs text-text-secondary p-4 bg-surface-2 rounded-xl">Jeton paketi bulunamadı.</div>
                            )}
                        </div>

                        <div className="border-t border-surface-2 pt-5 space-y-3">
                            <div className="text-left">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary/60 ml-1">Premium Paketler</div>
                                <div className="text-[10px] text-text-secondary mt-1">
                                    {premiumEnabled ? premiumList.join(' • ') : 'Premium için aktif özellik bulunmuyor.'}
                                </div>
                            </div>
                            {loadingData ? (
                                <div className="p-8 flex justify-center"><Spinner className="w-6 h-6 animate-spin text-brand-primary" /></div>
                            ) : premiumEnabled && plans.length > 0 ? (
                                plans.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => handlePackageClick('premium', p.id)}
                                        className="w-full p-4 bg-gradient-to-r from-brand-primary/10 to-fuchsia-600/10 hover:from-brand-primary/20 hover:to-fuchsia-600/20 rounded-[var(--radius-md)] flex items-center justify-between group transition-all border border-brand-primary/30 shadow-sm"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-bold group-hover:scale-110 transition-transform duration-[var(--duration-fast)]">
                                                <Gem size={20} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-bold text-text-primary text-sm">{p.title || `${p.months} Aylık Premium`}</h3>
                                                <span className="text-[10px] text-brand-primary font-semibold">Tüm özellikleri aç</span>
                                            </div>
                                        </div>
                                        <span className="font-bold text-text-primary text-sm">{p.price} {p.currency || 'TRY'}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="text-xs text-text-disabled text-left">Premium şu an devre dışı.</div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            onClick={() => {
                                onClose()
                                router.push('/store/premium')
                            }}
                            className="text-xs text-brand-accent hover:underline font-medium"
                        >
                            Tüm paketleri ve ödeme yöntemlerini gör
                        </button>
                    </div>
                </div>
                {loadingData && (
                    <div className="absolute inset-0 bg-surface-0/60 backdrop-blur-sm flex items-center justify-center z-10">
                        <Spinner className="animate-spin w-10 h-10 text-brand-primary" />
                    </div>
                )}
            </motion.div>
        </div>
    )
    return createPortal(modal, document.body)
}