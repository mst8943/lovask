'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { useToast } from '@/components/ui/Toast'
import { useT } from '@/hooks/useT'
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

export default function PushToggle() {
    const { user } = useAuthStore()
    const [enabled, setEnabled] = useState(false)
    const [loading, setLoading] = useState(false)
    const supabase = createClient()
    const toast = useToast()
    const t = useT()

    useEffect(() => {
        let mounted = true
        const check = async () => {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.getSubscription()
            if (mounted) setEnabled(!!sub)
        }
        check()
        return () => {
            mounted = false
        }
    }, [])

    const subscribe = async () => {
        if (!user) return
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast.push('Push not supported in this browser.', 'error')
            return
        }
        if (!PUBLIC_KEY) {
            toast.push('Missing VAPID public key.', 'error')
            return
        }

        setLoading(true)
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
        toast.push('Push enabled.', 'success')
        setEnabled(true)
        setLoading(false)
    }

    const unsubscribe = async () => {
        if (!user) return
        setLoading(true)
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
            await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', sub.endpoint)
            await sub.unsubscribe()
        }
        toast.push('Push disabled.', 'info')
        setEnabled(false)
        setLoading(false)
    }

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">{t('notifications.push')}</span>
            <Button
                onClick={() => (enabled ? unsubscribe() : subscribe())}
                disabled={loading}
                variant="secondary"
                size="sm"
                className="text-xs"
            >
                {loading ? '...' : enabled ? t('common.disable') : t('common.enable')}
            </Button>
        </div>
    )
}
