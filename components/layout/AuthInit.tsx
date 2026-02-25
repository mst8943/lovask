'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabase/client'
import { claimDailyBonus } from '@/services/economyService'
import Spinner from '@/components/ui/Spinner'
export default function AuthInit({ children }: { children: React.ReactNode }) {
    const [hydrated, setHydrated] = useState(false)
    const { setSession, setLoading } = useAuthStore()
    const supabase = createClient()
    const retryRef = useRef(0)
    useEffect(() => {
        // 1. Get initial session
        const getSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                setSession(session)
                setLoading(false)
                setHydrated(true)
                if (session?.user) {
                    try {
                        await claimDailyBonus()
                    } catch {
                        // non-blocking
                    }
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError' && retryRef.current < 3) {
                    retryRef.current += 1
                    setTimeout(getSession, 200)
                    return
                }
                setLoading(false)
                setHydrated(true)
            }
        }
        getSession()
        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
                setLoading(false)
            }
        )
        return () => subscription.unsubscribe()
    }, [setSession, setLoading, supabase])
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null
        const updateLastActive = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            await supabase.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', user.id)
        }
        updateLastActive()
        interval = setInterval(updateLastActive, 60000)
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [supabase])
    if (!hydrated) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-[9999]">
                <Spinner className="w-10 h-10 text-pink-500 animate-spin" />
            </div>
        )
    }
    return children
}
