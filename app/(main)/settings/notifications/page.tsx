'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import PushToggle from '@/components/pwa/PushToggle'
import { useToast } from '@/components/ui/Toast'
import { useT } from '@/hooks/useT'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type UserSettings = {
    push_enabled: boolean
    email_enabled: boolean
    match_notifications: boolean
    message_notifications: boolean
    quiet_hours_enabled: boolean
    quiet_hours_start: string
    quiet_hours_end: string
    quiet_hours_tz: string
    priority_only: boolean
}

type ToggleKey = 'push_enabled' | 'email_enabled' | 'match_notifications' | 'message_notifications'

const defaultSettings: UserSettings = {
    push_enabled: true,
    email_enabled: true,
    match_notifications: true,
    message_notifications: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    quiet_hours_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    priority_only: false,
}

export default function NotificationSettingsPage() {
    const { user } = useAuthStore()
    const [settings, setSettings] = useState<UserSettings>(defaultSettings)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()
    const toast = useToast()
    const t = useT()
    const toggleItems: Array<{ key: ToggleKey; label: string }> = [
        { key: 'push_enabled', label: t('notifications.push') },
        { key: 'email_enabled', label: t('notifications.email') },
        { key: 'match_notifications', label: t('notifications.match') },
        { key: 'message_notifications', label: t('notifications.message') },
    ]

    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) return
            const { data, error } = await supabase
                .from('user_settings')
                .select('push_enabled,email_enabled,match_notifications,message_notifications,quiet_hours_enabled,quiet_hours_start,quiet_hours_end,quiet_hours_tz,priority_only')
                .eq('user_id', user.id)
                .maybeSingle()

            if (!error && data) {
                setSettings({
                    push_enabled: !!data.push_enabled,
                    email_enabled: !!data.email_enabled,
                    match_notifications: !!data.match_notifications,
                    message_notifications: !!data.message_notifications,
                    quiet_hours_enabled: !!data.quiet_hours_enabled,
                    quiet_hours_start: data.quiet_hours_start || '22:00',
                    quiet_hours_end: data.quiet_hours_end || '08:00',
                    quiet_hours_tz: data.quiet_hours_tz || defaultSettings.quiet_hours_tz,
                    priority_only: !!data.priority_only,
                })
            }
            setLoading(false)
        }

        fetchSettings()
    }, [user, supabase])

    const handleSave = async () => {
        if (!user) return
        setSaving(true)
        setError(null)
        const { error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                ...settings,
            }, { onConflict: 'user_id' })

        if (error) setError(error.message)
        if (!error) toast.push('Kaydedildi', 'success')
        setSaving(false)
    }

    const toggle = (key: keyof UserSettings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    }

    const sendTest = async () => {
        try {
            const res = await fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'test' }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.error || 'Failed to send test notification.')
            }
            toast.push('Test notification sent.', 'success')
        } catch (err: unknown) {
            toast.push(err instanceof Error ? err.message : 'Failed to send test notification.', 'error')
        }
    }

    return (
        <div className="space-y-6 pb-8">

            <div className="glass-panel p-6 rounded-2xl space-y-4">
                {toggleItems.map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                        <span className="text-sm">{item.label}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings[item.key]}
                                onChange={() => toggle(item.key)}
                                disabled={loading}
                            />
                            <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-pink-500/60 transition-colors" />
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                        </label>
                    </div>
                ))}

                <PushToggle />

                <div className="mt-4 space-y-3">
                    <div className="text-sm font-semibold">Sessiz Saatler</div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Sessiz saatleri etkinleştir</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={settings.quiet_hours_enabled}
                                onChange={() => toggle('quiet_hours_enabled')}
                                disabled={loading}
                            />
                            <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-pink-500/60 transition-colors" />
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Input
                            type="time"
                            value={settings.quiet_hours_start}
                            onChange={(e) => setSettings((prev) => ({ ...prev, quiet_hours_start: e.target.value }))}
                            className="bg-black/20"
                        />
                        <Input
                            type="time"
                            value={settings.quiet_hours_end}
                            onChange={(e) => setSettings((prev) => ({ ...prev, quiet_hours_end: e.target.value }))}
                            className="bg-black/20"
                        />
                    </div>
                    <div className="text-xs text-gray-400">
                        Saat dilimi: {settings.quiet_hours_tz}
                    </div>
                    <label className="flex items-center justify-between text-sm">
                        <span>Yalnızca önemli bildirimler</span>
                        <Input type="checkbox" checked={settings.priority_only} onChange={() => toggle('priority_only')} className="h-4 w-4 p-0 rounded-sm" />
                    </label>
                </div>

                <Button
                    onClick={sendTest}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                >
                    {t('notifications.test')}
                </Button>

                {error && (
                    <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}

                <Button
                    onClick={handleSave}
                    disabled={saving}
                    variant="secondary"
                    className="w-full"
                >
                    {saving ? t('common.loading') : t('common.save')}
                </Button>
            </div>
        </div>
    )
}
