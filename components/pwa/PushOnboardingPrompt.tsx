'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export default function PushOnboardingPrompt() {
    const { user } = useAuthStore()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const supabase = useMemo(() => createClient(), [])
    const toast = useToast()

    useEffect(() => {
        let active = true

        const run = async () => {
            if (!user) return
            if (typeof window === 'undefined') return
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
            const key = `push-onboarding:${user.id}`
            if (localStorage.getItem(key)) return

            try {
                const reg = await navigator.serviceWorker.ready
                const existing = await reg.pushManager.getSubscription()
                if (existing) {
                    localStorage.setItem(key, '1')
                    return
                }
            } catch {
                return
            }

            const { data } = await supabase
                .from('user_settings')
                .select('push_enabled')
                .eq('user_id', user.id)
                .maybeSingle()

            if (data && data.push_enabled === false) {
                localStorage.setItem(key, '1')
                return
            }

            if (Notification.permission === 'denied') {
                localStorage.setItem(key, '1')
                return
            }

            if (active) setOpen(true)
        }

        run()
        return () => {
            active = false
        }
    }, [user, supabase])

    const markSeen = () => {
        if (!user || typeof window === 'undefined') return
        localStorage.setItem(`push-onboarding:${user.id}`, '1')
    }

    const enablePush = async () => {
        if (!user) return
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast.push('Push not supported in this browser.', 'error')
            markSeen()
            setOpen(false)
            return
        }
        if (!PUBLIC_KEY) {
            toast.push('Missing VAPID public key.', 'error')
            markSeen()
            setOpen(false)
            return
        }

        setLoading(true)
        try {
            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
            })

            const json = sub.toJSON()
            await supabase
                .from('push_subscriptions')
                .upsert(
                    {
                        user_id: user.id,
                        endpoint: sub.endpoint,
                        p256dh: json.keys?.p256dh,
                        auth: json.keys?.auth,
                        user_agent: navigator.userAgent,
                    },
                    { onConflict: 'user_id,endpoint' }
                )

            await supabase
                .from('user_settings')
                .upsert({ user_id: user.id, push_enabled: true })

            toast.push('Push enabled.', 'success')
        } catch (err: unknown) {
            toast.push(err instanceof Error ? err.message : 'Push enable failed.', 'error')
        } finally {
            setLoading(false)
            markSeen()
            setOpen(false)
        }
    }

    const skip = async () => {
        if (!user) return
        await supabase.from('user_settings').upsert({ user_id: user.id, push_enabled: false })
        markSeen()
        setOpen(false)
    }

    if (!open) return null

    return (
        <div className="fixed inset-x-4 bottom-24 z-[9999] md:right-6 md:left-auto md:max-w-sm">
            <div className="rounded-2xl border border-white/10 bg-black/85 text-white p-4 shadow-2xl backdrop-blur">
                <div className="text-xs uppercase tracking-wider text-white/60">Bildirimler</div>
                <div className="text-base font-semibold mt-1">Anlik bildirimleri ac</div>
                <p className="text-xs text-white/70 mt-2">
                    Mesaj ve eslesmeleri kacirmamak icin izin ver.
                </p>
                <div className="mt-3 flex gap-2">
                    <Button
                        onClick={enablePush}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? '...' : 'Izin ver'}
                    </Button>
                    <Button
                        onClick={skip}
                        disabled={loading}
                        variant="secondary"
                        className="w-full"
                    >
                        Simdi degil
                    </Button>
                </div>
            </div>
        </div>
    )
}
