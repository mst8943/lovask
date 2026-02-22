'use client'

import React, { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabase/client'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

export default function OnboardingPage() {
    const router = useRouter()
    const { session, isLoading } = useAuthStore()
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        if (!isLoading && !session) {
            router.replace('/login')
        } else if (session) {
            // Check if profile exists
            const checkProfile = async () => {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', session.user.id)
                    .maybeSingle()

                if (error) {
                    return
                }

                if (data) {
                    router.replace('/feed')
                }
            }
            checkProfile()
        }
    }, [session, isLoading, router, supabase])

    if (isLoading) return null

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] relative overflow-hidden py-12 px-4 sm:px-6">
            {/* Premium Background Effects */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60vh] rounded-full bg-pink-600/10 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50vh] rounded-full bg-violet-600/10 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
            <div className="absolute top-[40%] left-[30%] w-[40%] h-[40vh] rounded-full bg-fuchsia-600/10 blur-[120px] mix-blend-screen" />

            {/* Header branding */}
            <div className="absolute top-8 left-8 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-violet-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                </div>
                <span className="text-2xl font-bold text-white tracking-tight hidden sm:block">Lovask</span>
            </div>

            <div className="w-full relative z-10">
                <OnboardingWizard />
            </div>
        </div>
    )
}
