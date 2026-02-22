'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { usePresenceStore } from '@/store/usePresenceStore'

const HEARTBEAT_MS = 120_000
const MIN_UPDATE_GAP_MS = 90_000
const MAX_IDLE_MS = 10 * 60_000

export default function PresenceHeartbeat() {
    const { user } = useAuthStore()
    const supabase = useMemo(() => createClient(), [])
    const lastSentRef = useRef(0)
    const lastActiveRef = useRef(0)
    const channelRef = useRef<RealtimeChannel | null>(null)
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (!user) return

        const markActive = () => {
            lastActiveRef.current = Date.now()
        }

        const maybeSend = async (force = false) => {
            if (!user) return
            const now = Date.now()
            const sinceActive = now - lastActiveRef.current
            const sinceSent = now - lastSentRef.current
            if (!force && sinceActive > MAX_IDLE_MS) return
            if (!force && sinceSent < MIN_UPDATE_GAP_MS) return
            lastSentRef.current = now
            const { error } = await supabase
                .from('users')
                .update({ last_active_at: new Date().toISOString() })
                .eq('id', user.id)
            if (error) {
                try {
                    await fetch('/api/presence/heartbeat', { method: 'POST' })
                } catch {
                    // ignore heartbeat failures
                }
            }
        }

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                markActive()
                void maybeSend(true)
            }
        }

        const onFocus = () => {
            markActive()
            void maybeSend(true)
        }

        const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll']
        activityEvents.forEach((event) => window.addEventListener(event, markActive, { passive: true }))
        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('focus', onFocus)

        const interval = setInterval(() => {
            void maybeSend(false)
        }, HEARTBEAT_MS)

        markActive()
        void maybeSend(true)

        const clearReconnect = () => {
            if (reconnectRef.current) {
                clearTimeout(reconnectRef.current)
                reconnectRef.current = null
            }
        }

        const teardownChannel = () => {
            if (channelRef.current) {
                void supabase.removeChannel(channelRef.current)
                channelRef.current = null
            }
        }

        const startChannel = async () => {
            teardownChannel()
            clearReconnect()

            const { data: sessionData } = await supabase.auth.getSession()
            const token = sessionData.session?.access_token
            if (token) supabase.realtime.setAuth(token)

            const channel = supabase.channel('global-presence', {
                config: {
                    presence: {
                        key: user.id,
                    },
                },
            })

            channel
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState()
                    const newOnlineUsers = new Set<string>()
                    for (const key of Object.keys(state)) {
                        newOnlineUsers.add(key)
                    }
                    usePresenceStore.getState().setOnlineUsers(newOnlineUsers)
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({ online_at: new Date().toISOString() })
                        return
                    }
                    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                        clearReconnect()
                        reconnectRef.current = setTimeout(() => {
                            void startChannel()
                        }, 5000)
                    }
                })

            channelRef.current = channel
        }

        void startChannel()

        return () => {
            clearInterval(interval)
            activityEvents.forEach((event) => window.removeEventListener(event, markActive))
            document.removeEventListener('visibilitychange', onVisibility)
            window.removeEventListener('focus', onFocus)
            clearReconnect()
            teardownChannel()
        }
    }, [supabase, user])

    return null
}
