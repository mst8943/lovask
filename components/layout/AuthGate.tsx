'use client'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import LoadingSplash from '@/components/ui/LoadingSplash'
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
        return <LoadingSplash />
    }
    return children
}