'use client'

import { useOnboardingStore } from '@/store/useOnboardingStore'
import StepBasicInfo from '@/components/onboarding/StepBasicInfo'
import StepPhotos from '@/components/onboarding/StepPhotos'
import StepReview from '@/components/onboarding/StepReview'
import { AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/useAuthStore'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function OnboardingWizard() {
    const { step } = useOnboardingStore()
    const { user, isLoading } = useAuthStore()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login')
        }
    }, [user, isLoading, router])

    if (isLoading) return null

    return (
        <div className="relative w-full max-w-lg mx-auto">
            {/* Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-violet-500 rounded-[2.5rem] blur-2xl opacity-20" />

            <div className="relative bg-[#09090b]/60 backdrop-blur-2xl p-6 sm:p-10 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
                {/* Progress Bar Container */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 transition-all duration-700 ease-in-out relative"
                        style={{ width: `${(step / 3) * 100}%` }}
                    >
                        <div className="absolute top-0 right-0 w-8 h-full bg-white/30 blur-sm mix-blend-overlay" />
                    </div>
                </div>

                <div className="mt-4">
                    <AnimatePresence mode="wait">
                        {step === 1 && <StepBasicInfo key="step1" />}
                        {step === 2 && <StepPhotos key="step2" />}
                        {step === 3 && <StepReview key="step3" />}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

