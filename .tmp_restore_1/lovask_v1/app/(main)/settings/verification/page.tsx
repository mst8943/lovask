'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { createVerification, fetchMyVerifications, VerificationRow, VerificationType } from '@/services/verificationService'
import { ShieldCheck, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
const typeLabels: Record<VerificationType, string> = {
    email: 'E-posta',
    device: 'Cihaz',
    photo: 'Fotoğraf',
    selfie: 'Selfie',
    kyc: 'Kimlik',
    video: 'Video',
}
const statusLabels: Record<string, string> = {
    pending: 'Beklemede',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
}
export default function VerificationPage() {
    const { user } = useAuthStore()
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [verifications, setVerifications] = useState<VerificationRow[]>([])
    const [emailConfirmed, setEmailConfirmed] = useState(false)
    const loadData = useCallback(async (userId: string) => {
        setLoading(true)
        const { data: auth } = await supabase.auth.getUser()
        setEmailConfirmed(!!auth.user?.email_confirmed_at)
        const rows = await fetchMyVerifications(userId)
        setVerifications(rows)
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        if (!user) return
        const id = setTimeout(() => {
            void loadData(user.id)
        }, 0)
        return () => clearTimeout(id)
    }, [loadData, user])
    const handleDeviceVerification = async () => {
        if (!user) return
        setSending(true)
        try {
            await createVerification({
                user_id: user.id,
                type: 'device',
                device_info: {
                    user_agent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                },
            })
            await loadData(user.id)
        } finally {
            setSending(false)
        }
    }
    const handlePhotoUpload = async (file: File, type: VerificationType) => {
        if (!user || !file) return
        setSending(true)
        try {
            const path = `${user.id}/${Date.now()}-${file.name}`
            const { error: uploadError } = await supabase.storage
                .from('verification')
                .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg' })
            if (uploadError) throw uploadError
            await createVerification({
                user_id: user.id,
                type,
                proof_url: path,
            })
            await loadData(user.id)
        } catch (error) {
            console.error(error)
        } finally {
            setSending(false)
        }
    }
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between">
            </div>
            <div className="glass-panel p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-semibold">E-posta</div>
                        <div className="text-xs text-gray-400">Hesabın e-posta doğrulaması</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${emailConfirmed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                        {emailConfirmed ? 'Doğrulandı' : 'Beklemede'}
                    </span>
                </div>
                {!emailConfirmed && user?.email && (
                    <Button
                        onClick={async () => {
                            try {
                                await supabase.auth.resend({ type: 'signup', email: user.email })
                            } catch (error) {
                                console.error(error)
                            }
                        }}
                        variant="secondary"
                        className="px-3 py-2 rounded-lg text-xs w-fit"
                    >
                        Doğrulama e-postası gönder
                    </Button>
                )}
            </div>
            <div className="glass-panel p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-semibold">Cihaz Doğrulama</div>
                        <div className="text-xs text-gray-400">Bu cihazı doğrula</div>
                    </div>
                    <Button
                        onClick={handleDeviceVerification}
                        disabled={sending}
                        variant="secondary"
                        className="px-3 py-2 rounded-lg text-xs"
                    >
                        Doğrula
                    </Button>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-semibold">Fotoğraf Doğrulama</div>
                        <div className="text-xs text-gray-400">Gerçek fotoğraf ile doğrulan</div>
                    </div>
                    <label className="px-3 py-2 rounded-lg bg-white/10 text-xs cursor-pointer flex items-center gap-2">
                        <Upload size={14} />
                        Yükle
                        <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handlePhotoUpload(file, 'photo')
                                e.currentTarget.value = ''
                            }}
                        />
                    </label>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-semibold">Selfie Doğrulama</div>
                        <div className="text-xs text-gray-400">Yüz doğrulama için selfie yükle</div>
                    </div>
                    <label className="px-3 py-2 rounded-lg bg-white/10 text-xs cursor-pointer flex items-center gap-2">
                        <Upload size={14} />
                        Yükle
                        <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handlePhotoUpload(file, 'selfie')
                                e.currentTarget.value = ''
                            }}
                        />
                    </label>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-semibold">Kimlik Doğrulama</div>
                        <div className="text-xs text-gray-400">Kimlik belgesi yükle</div>
                    </div>
                    <label className="px-3 py-2 rounded-lg bg-white/10 text-xs cursor-pointer flex items-center gap-2">
                        <Upload size={14} />
                        Yükle
                        <Input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handlePhotoUpload(file, 'kyc')
                                e.currentTarget.value = ''
                            }}
                        />
                    </label>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-semibold">Video Doğrulama</div>
                        <div className="text-xs text-gray-400">Kısa video ile doğrulan</div>
                    </div>
                    <label className="px-3 py-2 rounded-lg bg-white/10 text-xs cursor-pointer flex items-center gap-2">
                        <Upload size={14} />
                        Yükle
                        <Input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handlePhotoUpload(file, 'video')
                                e.currentTarget.value = ''
                            }}
                        />
                    </label>
                </div>
            </div>
            <div className="glass-panel p-4 rounded-2xl">
                <div className="font-semibold mb-3 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    Doğrulama Geçmişi
                </div>
                {verifications.length === 0 ? (
                    <div className="text-xs text-gray-400">Henüz doğrulama isteği yok.</div>
                ) : (
                    <div className="space-y-2">
                        {verifications.map((row) => (
                            <div key={row.id} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                                <div>
                                    <div className="font-semibold">{typeLabels[row.type]}</div>
                                    <div className="text-xs text-gray-400">
                                        {new Date(row.created_at).toLocaleString()}
                                    </div>
                                    {row.note && <div className="text-xs text-gray-400">Not: {row.note}</div>}
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${row.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : row.status === 'rejected' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                    {statusLabels[row.status]}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}