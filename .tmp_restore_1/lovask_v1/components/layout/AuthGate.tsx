'use client'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import Spinner from '@/components/ui/Spinner'
const ONBOARDING_PATH = '/onboarding'
export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { session, user, isLoading } = useAuthStore()
    const [checkingProfile, setCheckingProfile] = useState(false)
    const [profileChecked, setProfileChecked] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    useEffect(() => {
        if (isLoading) return
        if (!session) {
            router.replace('/login')
            return
        }
        if (pathname.startsWith(ONBOARDING_PATH)) {
            return
        }
        if (!user) return
        if (profileChecked || checkingProfile) return
        const checkProfile = async () => {
            setCheckingProfile(true)
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', user.id)
                .maybeSingle()
            setCheckingProfile(false)
            setProfileChecked(true)
            if (error || !profile?.display_name) {
                router.replace(ONBOARDING_PATH)
            }
        }
        checkProfile()
    }, [isLoading, session, user, pathname, router, supabase, profileChecked, checkingProfile])
    if (isLoading || !session || checkingProfile) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-[9999]">
                <Spinner className="w-10 h-10 text-pink-500 animate-spin" />
            </div>
        )
    }
    return children
}