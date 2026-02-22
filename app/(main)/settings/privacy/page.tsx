'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { useEconomy } from '@/hooks/useEconomy'
import { activateIncognito, getIncognitoActive } from '@/services/extraFeaturesService'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'

export default function PrivacySettingsPage() {
    const { user } = useAuthStore()
    const [hideFromDiscovery, setHideFromDiscovery] = useState(false)
    const [locationVisibility, setLocationVisibility] = useState<'public' | 'approx' | 'hidden'>('approx')
    const [lastActiveVisibility, setLastActiveVisibility] = useState<'everyone' | 'matches' | 'hidden'>('matches')
    const [messageRequestMode, setMessageRequestMode] = useState<'open' | 'request' | 'verified_only'>('open')
    const [harassmentMode, setHarassmentMode] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [incognitoActive, setIncognitoActive] = useState(false)
    const [incognitoLoading, setIncognitoLoading] = useState(false)
    const supabase = createClient()
    const { isPremium, spendCoins, hasFeature } = useEconomy()
    const toast = useToast()

    const canIncognito = hasFeature('incognito')

    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) return
            const { data, error } = await supabase
                .from('profiles')
                .select('hide_from_discovery,location_visibility')
                .eq('id', user.id)
                .maybeSingle()

            if (!error && data) {
                setHideFromDiscovery(!!data.hide_from_discovery)
                setLocationVisibility((data.location_visibility as typeof locationVisibility) || 'approx')
            }
            const { data: settings } = await supabase
                .from('user_settings')
                .select('last_active_visibility,message_request_mode,harassment_mode')
                .eq('user_id', user.id)
                .maybeSingle()
            if (settings) {
                setLastActiveVisibility((settings.last_active_visibility as 'everyone' | 'matches' | 'hidden') || 'matches')
                setMessageRequestMode((settings.message_request_mode as 'open' | 'request' | 'verified_only') || 'open')
                setHarassmentMode(!!settings.harassment_mode)
            }
            const incognito = await getIncognitoActive(user.id)
            setIncognitoActive(incognito)
            setLoading(false)
        }

        fetchSettings()
    }, [user, supabase])

    const handleSave = async () => {
        if (!user) return
        setSaving(true)
        setError(null)
        const { error } = await supabase
            .from('profiles')
            .update({ hide_from_discovery: hideFromDiscovery, location_visibility: locationVisibility })
            .eq('id', user.id)

        const { error: settingsError } = await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                last_active_visibility: lastActiveVisibility,
                message_request_mode: messageRequestMode,
                harassment_mode: harassmentMode,
            }, { onConflict: 'user_id' })

        if (error) setError(error.message)
        if (settingsError) setError(settingsError.message)
        setSaving(false)
    }

    return (
        <div className="space-y-6 pb-8">

            <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Kesfette Gizle</h2>
                        <p className="text-sm text-gray-400">Profilin kesfet akisinda gorunmez.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={hideFromDiscovery}
                            onChange={(e) => setHideFromDiscovery(e.target.checked)}
                            disabled={loading}
                        />
                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-pink-500/60 transition-colors" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                    </label>
                </div>

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
                    {saving ? 'Kaydediliyor...' : 'Degisiklikleri Kaydet'}
                </Button>
            </div>

            <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="space-y-3">
                    <div className="text-sm font-semibold">Konum gorunurlugu</div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: 'public', label: 'Tam konum' },
                            { value: 'approx', label: 'Yaklasik' },
                            { value: 'hidden', label: 'Gizle' },
                        ].map((opt) => (
                            <Button
                                key={opt.value}
                                type="button"
                                variant={locationVisibility === opt.value ? 'default' : 'secondary'}
                                size="sm"
                                className="text-xs"
                                onClick={() => setLocationVisibility(opt.value as typeof locationVisibility)}
                                disabled={loading}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                    <div className="text-xs text-gray-400">
                        Yaklasik mod mesafeyi gosterir ama tam konumu gizler.
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="text-sm font-semibold">Son aktif gorunurlugu</div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: 'everyone', label: 'Herkese acik' },
                            { value: 'matches', label: 'Sadece eslesmeler' },
                            { value: 'hidden', label: 'Gizle' },
                        ].map((opt) => (
                            <Button
                                key={opt.value}
                                type="button"
                                variant={lastActiveVisibility === opt.value ? 'default' : 'secondary'}
                                size="sm"
                                className="text-xs"
                                onClick={() => setLastActiveVisibility(opt.value as typeof lastActiveVisibility)}
                                disabled={loading}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="text-sm font-semibold">Mesaj istegi modu</div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: 'open', label: 'Acik' },
                            { value: 'request', label: 'Istekle' },
                            { value: 'verified_only', label: 'Sadece dogrulanmis' },
                        ].map((opt) => (
                            <Button
                                key={opt.value}
                                type="button"
                                variant={messageRequestMode === opt.value ? 'default' : 'secondary'}
                                size="sm"
                                className="text-xs"
                                onClick={() => setMessageRequestMode(opt.value as typeof messageRequestMode)}
                                disabled={loading}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                    <div className="text-xs text-gray-400">
                        Ilk mesajlar icin izin iste. Kabul edilmeden mesaj dusmez.
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold">Taciz modu</div>
                        <div className="text-xs text-gray-400">
                            Yeni mesajlarda bildirimleri azaltir, istek modunu zorunlu yapar.
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={harassmentMode}
                            onChange={(e) => {
                                setHarassmentMode(e.target.checked)
                                if (e.target.checked) setMessageRequestMode('request')
                            }}
                            disabled={loading}
                        />
                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-pink-500/60 transition-colors" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                    </label>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Gizli Mod</h2>
                        <p className="text-sm text-gray-400">
                            Profil goruntulemelerini gizle. Premium: ucretsiz. Premium degil: 15 jeton/gun.
                        </p>
                    </div>
                    <Button
                        onClick={async () => {
                            if (!user || !canIncognito) return
                            setIncognitoLoading(true)
                            try {
                                if (!isPremium) {
                                    const ok = await spendCoins({ amount: 15, reason: 'incognito' })
                                    if (!ok) return
                                }
                                await activateIncognito()
                                setIncognitoActive(true)
                                toast.push('Gizli mod 24 saat aktif.', 'success')
                            } catch (err: unknown) {
                                toast.push(err instanceof Error ? err.message : 'Gizli mod acilirken hata olustu.', 'error')
                            } finally {
                                setIncognitoLoading(false)
                            }
                        }}
                        disabled={!canIncognito || incognitoLoading || incognitoActive}
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                    >
                        {incognitoActive ? 'Aktif' : incognitoLoading ? '...' : canIncognito ? 'Ac' : 'Kapali'}
                    </Button>
                </div>
                {incognitoActive && (
                    <div className="text-xs text-green-400">Gizli mod aktif (24s)</div>
                )}
                {!canIncognito && (
                    <div className="text-xs text-gray-500">Bu ozellik bu paket icin kapali.</div>
                )}
            </div>
        </div>
    )
}
