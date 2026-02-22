'use client'

import { useRouter } from 'next/navigation'
import { Bell, Lock, Shield, ShieldCheck, Ban, MessageCircle, Calendar, Smartphone, Activity } from 'lucide-react'
import { useT } from '@/hooks/useT'
import LanguageSelect from '@/components/i18n/LanguageSelect'
import { Button } from '@/components/ui/Button'

export default function SettingsPage() {
    const router = useRouter()
    const t = useT()

    return (
        <div className="settings-shell space-y-6 pb-8">
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-xs text-gray-400 mt-1">Güvenlik, gizlilik ve hesap yönetimi</p>
                </div>
            </div>

            <div className="space-y-3">
                <Button
                    onClick={() => router.push('/settings/account')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <Lock size={20} className="text-pink-500" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">{t('settings.account')}</h3>
                        <p className="text-xs text-gray-400">Şifre ve hesap silme</p>
                    </div>
                </Button>

                <Button
                    onClick={() => router.push('/settings/verification')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <ShieldCheck size={20} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">{t('settings.verification')}</h3>
                        <p className="text-xs text-gray-400">E-posta, cihaz ve fotoğraf doğrulama</p>
                    </div>
                </Button>

                <Button
                    onClick={() => router.push('/settings/privacy')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Shield size={20} className="text-blue-500" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">{t('settings.privacy')}</h3>
                        <p className="text-xs text-gray-400">Keşfet görünürlüğü</p>
                    </div>
                </Button>

                <Button
                    onClick={() => router.push('/settings/blocks')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Ban size={20} className="text-amber-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">Engellediklerim</h3>
                        <p className="text-xs text-gray-400">Engellediğin kişileri yönet</p>
                    </div>
                </Button>

                <Button
                    onClick={() => router.push('/settings/notifications')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <Bell size={20} className="text-violet-500" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">{t('settings.notifications')}</h3>
                        <p className="text-xs text-gray-400">Push ve e-posta tercihleri</p>
                    </div>
                </Button>

                <Button
                    onClick={() => router.push('/support')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <MessageCircle size={20} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">Destek</h3>
                        <p className="text-xs text-gray-400">Sorun bildir ve destek al</p>
                    </div>
                </Button>
            </div>

            <div className="glass-panel p-4 rounded-2xl space-y-3">
                <div className="text-sm font-semibold">Platform</div>
                <div className="text-xs text-gray-400">Etkinlikler, PWA ve sistem durumu</div>
                <div className="space-y-2">
                    <Button
                        onClick={() => router.push('/events')}
                        variant="secondary"
                        size="sm"
                        className="w-full justify-start gap-2 bg-white/5 border border-white/10"
                    >
                        <Calendar size={16} className="text-amber-300" />
                        Etkinlikler
                    </Button>
                    <Button
                        onClick={() => router.push('/pwa')}
                        variant="secondary"
                        size="sm"
                        className="w-full justify-start gap-2 bg-white/5 border border-white/10"
                    >
                        <Smartphone size={16} className="text-sky-300" />
                        PWA Durumu
                    </Button>
                    <Button
                        onClick={() => router.push('/status')}
                        variant="secondary"
                        size="sm"
                        className="w-full justify-start gap-2 bg-white/5 border border-white/10"
                    >
                        <Activity size={16} className="text-emerald-300" />
                        Sistem Durumu
                    </Button>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl space-y-3">
                <div className="text-sm font-semibold">Güvenlik ve Gizlilik</div>
                <div className="text-xs text-gray-400">Hızlı kontrol listesi</div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={() => router.push('/settings/verification')}
                        variant="secondary"
                        size="sm"
                        className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
                    >
                        Doğrulama
                    </Button>
                    <Button
                        onClick={() => router.push('/settings/privacy')}
                        variant="secondary"
                        size="sm"
                        className="text-xs bg-blue-500/10 border border-blue-500/30 text-blue-200"
                    >
                        Gizlilik
                    </Button>
                    <Button
                        onClick={() => router.push('/settings/blocks')}
                        variant="secondary"
                        size="sm"
                        className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-200"
                    >
                        Engeller
                    </Button>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl">
                <div className="text-sm font-semibold">{t('settings.language')}</div>
                <div className="text-xs text-gray-400 mb-3">{t('settings.language_desc')}</div>
                <LanguageSelect label={t('common.language')} />
            </div>
        </div>
    )
}
