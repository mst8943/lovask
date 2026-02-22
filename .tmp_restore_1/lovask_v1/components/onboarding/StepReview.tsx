'use client'

import { useOnboardingStore } from '@/store/useOnboardingStore'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import { useState } from 'react'
import { MapPin, Sparkles, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import Spinner from '@/components/ui/Spinner'

export default function StepReview() {
    const { data, setStep } = useOnboardingStore()
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(false)
    const toast = useToast()
    const router = useRouter()

    const handleFinish = async () => {
        if (!user) return
        setLoading(true)
        try {
            const res = await fetch('/api/profile/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    photos: data.photos,
                    looking_for_genders: data.looking_for_genders,
                }),
            })

            if (!res.ok) {
                const message = await res.text()
                throw new Error(message || 'Profil kaydedilemedi.')
            }

            router.push('/feed')
        } catch (error: unknown) {
            console.error('Error saving profile: ', error)
            toast.push(error instanceof Error ? error.message : 'Profil kaydedilemedi.', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8 text-center"
        >
            <div className="space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-white flex justify-center items-center gap-2">
                    Her Şey Hazır<Sparkles className="w-6 h-6 text-pink-500 fill-pink-500" />
                </h2>
                <p className="text-white/50 font-medium">Yeni bir dünyaya adım atmaya ramak kaldı.</p>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-[1px] shadow-2xl">
                <div className="absolute -inset-[50%] animate-spin-slow bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,rgba(236,72,153,0.3)_50%,transparent_100%)] opacity-30" />

                <div className="relative bg-[#09090b]/80 backdrop-blur-xl rounded-[2rem] p-8 space-y-5 text-left h-full w-full">
                    <div className="flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 relative shadow-[0_0_20px_rgba(236,72,153,0.2)]">
                            <img src={data.photos[0] || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-2">
                                {data.display_name}
                                <span className="text-lg text-pink-400 font-medium">{data.age}</span>
                            </h3>
                            <p className="text-white/50 flex items-center font-medium gap-1.5 mt-1 text-sm">
                                <MapPin size={14} className="text-pink-500" /> {data.city}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                        {data.interests && data.interests.length > 0 ? data.interests.map((i) => (
                            <span key={i} className="px-3 py-1.5 bg-pink-500/10 border border-pink-500/20 text-pink-300 font-medium text-xs rounded-full">
                                {i}
                            </span>
                        )) : (
                            <span className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/50 font-medium text-xs rounded-full">
                                İlgi alanınız henüz yok
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-6 rounded-xl font-bold text-base transition-all duration-300 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 flex items-center justify-center gap-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Geri
                </button>
                <button
                    onClick={handleFinish}
                    disabled={loading}
                    className="flex-[2] py-6 rounded-xl font-bold text-base transition-all duration-300 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white shadow-[0_0_40px_-10px_rgba(236,72,153,0.5)] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] flex justify-center items-center"
                >
                    {loading ? (
                        <div className="flex items-center gap-3">
                            <Spinner className="w-5 h-5 border-white text-transparent animate-spin" />
                            <span>Hazırlanıyor...</span>
                        </div>
                    ) : (
                        "Yolculuğa Başla"
                    )}
                </button>
            </div>
        </motion.div>
    )
}