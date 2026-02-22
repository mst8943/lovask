'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Gem, X } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { addCoins } from '@/services/userService'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { useEconomy } from '@/hooks/useEconomy'
import { FEATURE_ITEMS } from '@/lib/featureFlags'
import Spinner from '@/components/ui/Spinner'
interface PremiumModalProps {
    onClose: () => void
}
export default function PremiumModal({ onClose }: PremiumModalProps) {
    const { user } = useAuthStore()
    const { featureFlags } = useEconomy()
    const [loading, setLoading] = useState(false)
    const supabase = createClient()
    const toast = useToast()
    const [mounted, setMounted] = useState(false)
    const premiumList = useMemo(() => {
        const flags = featureFlags?.premium || {}
        return FEATURE_ITEMS.filter((f) => flags[f.key]).map((f) => f.label)
    }, [featureFlags])
    const premiumEnabled = premiumList.length > 0
    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])
    const handlePurchaseCoins = async (amount: number) => {
        if (!user) return
        setLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 1200))
        try {
            await addCoins(user.id, amount, 'purchase')
            toast.push(`${amount} jeton satin alindi!`, 'success')
            onClose()
        } catch (error) {
            console.error(error)
            toast.push('Satin alma basarisiz', 'error')
        } finally {
            setLoading(false)
        }
    }
    const handleSubscribe = async () => {
        if (!user || !premiumEnabled) return
        setLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 1200))
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    is_premium: true,
                    premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                })
                .eq('id', user.id)
            if (error) throw error
            toast.push('Premiuma hos geldin!', 'success')
            onClose()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
            console.error(error)
            toast.push('Abonelik basarisiz: ' + message, 'error')
        } finally {
            setLoading(false)
        }
    }
    if (!mounted) return null
    const modal = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden"
            >
                <div className="p-6 text-center space-y-4 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                        <X size={20} />
                    </button>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        Jeton ve Premium
                    </h2>
                    <p className="text-gray-400 text-sm">Deneyimini guclendir</p>
                    <div className="grid gap-3">
                        <button
                            onClick={() => handlePurchaseCoins(100)}
                            disabled={loading}
                            className="p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-between group transition-all border border-transparent hover:border-yellow-500/50"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold group-hover:scale-110 transition-transform">
                                    100
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-white">100 Jeton</h3>
                                    <span className="text-xs text-gray-400">5 sohbet</span>
                                </div>
                            </div>
                            <span className="font-bold text-white">$4.99</span>
                        </button>
                        <button
                            onClick={() => handlePurchaseCoins(500)}
                            disabled={loading}
                            className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20 rounded-xl flex items-center justify-between group transition-all border border-yellow-500/30"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold group-hover:scale-110 transition-transform">
                                    500
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-white">500 Jeton</h3>
                                    <span className="text-xs text-yellow-500/80 font-semibold">En iyi fiyat</span>
                                </div>
                            </div>
                            <span className="font-bold text-white">$19.99</span>
                        </button>
                    </div>
                    <div className="border-t border-white/10 pt-4 mt-2 space-y-3">
                        <div className="text-left">
                            <div className="text-sm font-semibold">Premium Ayricaliklar</div>
                            <div className="text-xs text-gray-400">
                                {premiumEnabled ? premiumList.join(' ? ') : 'Premium icin aktif ozellik bulunmuyor.'}
                            </div>
                        </div>
                        {premiumEnabled ? (
                            <button
                                onClick={handleSubscribe}
                                disabled={loading}
                                className="w-full p-4 bg-gradient-to-r from-pink-500/20 to-violet-600/20 hover:from-pink-500/30 hover:to-violet-600/30 rounded-xl flex items-center justify-between group transition-all border border-pink-500/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 font-bold group-hover:scale-110 transition-transform">
                                        <Gem size={20} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-white">Premium</h3>
                                        <span className="text-xs text-pink-400 font-semibold">Ozellikleri ac</span>
                                    </div>
                                </div>
                                <span className="font-bold text-white">$29.99/ay</span>
                            </button>
                        ) : (
                            <div className="text-xs text-gray-500">Premium su an devre disi.</div>
                        )}
                    </div>
                </div>
                {loading && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <Spinner className="animate-spin w-10 h-10 text-yellow-500" />
                    </div>
                )}
            </motion.div>
        </div>
    )
    return createPortal(modal, document.body)
}