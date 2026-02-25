'use client'

import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings, Shield, Heart, Wallet, Eye, BarChart2, Gift, Bell, Plus, X, Star, ShieldCheck, Smartphone, Camera, IdCard, Video } from 'lucide-react'
import { useEconomy } from '@/hooks/useEconomy'
import { FEATURE_ITEMS } from '@/lib/featureFlags'
import { useEffect, useMemo, useState } from 'react'
import NotificationsBadge from '@/components/profile/NotificationsBadge'
import { fetchUserStories, Story, uploadStory } from '@/services/storiesService'
import { getProfileAvatar } from '@/utils/avatar'
import Image from 'next/image'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { fetchPublicVerifications } from '@/services/verificationService'
import LoadingSplash from '@/components/ui/LoadingSplash'
import type { VerificationType } from '@/services/verificationService'

export default function ProfilePage() {
    const { user, setSession } = useAuthStore()
    const { balance, isPremium, hasFeature, featureFlags } = useEconomy()
    const router = useRouter()
    const toast = useToast()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const [metrics, setMetrics] = useState({
        views: 0,
        newLikes: 0,
        matches: 0,
        unread: 0,
        blocks: 0,
        notifications: 0,
    })
    const [profileData, setProfileData] = useState<{ photos: unknown; display_name: string | null; gender?: string | null; is_bot?: boolean | null } | null>(null)
    const [stories, setStories] = useState<Story[]>([])
    const [storyUploading, setStoryUploading] = useState(false)
    const [pendingStoryFile, setPendingStoryFile] = useState<File | null>(null)
    const [pendingStoryPreview, setPendingStoryPreview] = useState<string | null>(null)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [historyFilter, setHistoryFilter] = useState<'all' | 'payments' | 'coin_spend'>('all')
    const [verifiedTypes, setVerifiedTypes] = useState<VerificationType[]>([])
    const [historyRows, setHistoryRows] = useState<Array<{
        id: string
        created_at: string
        kind: 'transaction' | 'payment' | 'bank_transfer'
        title: string
        subtitle?: string | null
        amount: number | null
        currency?: string | null
        status?: string | null
        meta?: Record<string, unknown> | null
    }>>([])

    const premiumList = useMemo(() => {
        const flags = featureFlags?.premium || {}
        return FEATURE_ITEMS.filter((f) => flags[f.key]).map((f) => f.label)
    }, [featureFlags])
    const filteredHistory = useMemo(() => {
        if (historyFilter === 'payments') {
            return historyRows.filter((row) => row.kind === 'payment' || row.kind === 'bank_transfer')
        }
        if (historyFilter === 'coin_spend') {
            return historyRows.filter((row) => row.kind === 'transaction' && (row.amount || 0) < 0)
        }
        return historyRows
    }, [historyRows, historyFilter])

    useEffect(() => {
        const loadRole = async () => {
            if (!user) return
            const { data } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()
            setIsAdmin(data?.role === 'admin')
        }
        loadRole()
    }, [user, supabase])

    useEffect(() => {
        const loadStoryContext = async () => {
            if (!user) return
            const { data } = await supabase
                .from('profiles')
                .select('photos,display_name,gender,is_bot')
                .eq('id', user.id)
                .maybeSingle()
            setProfileData(data || null)

            try {
                const rows = await fetchUserStories(user.id)
                setStories(rows)
            } catch {
                setStories([])
            }

            const verificationRows = await fetchPublicVerifications(user.id)
            const types = Array.from(new Set((verificationRows || []).map((row) => row.type)))
            setVerifiedTypes(types)
        }
        loadStoryContext()
    }, [user, supabase])

    useEffect(() => {
        const loadHistory = async () => {
            if (!user) return
            setHistoryLoading(true)
            try {
                const [txRes, payRes, transferRes] = await Promise.all([
                    supabase
                        .from('transactions')
                        .select('id,amount,type,metadata,created_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('payments')
                        .select('id,kind,provider,amount,currency,status,metadata,created_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('bank_transfers')
                        .select('id,reference,amount,status,created_at')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false }),
                ])

                if (txRes.error) throw txRes.error
                if (payRes.error) throw payRes.error
                if (transferRes.error) throw transferRes.error

                const txRows = (txRes.data || []).map((row) => ({
                    id: row.id,
                    created_at: row.created_at,
                    kind: 'transaction' as const,
                    title: row.type === 'spend'
                        ? 'Jeton Harcaması'
                        : row.type === 'purchase'
                            ? 'Jeton Satın Alma'
                            : row.type === 'bonus'
                                ? 'Bonus Jeton'
                                : 'Hediye',
                    subtitle: (row.metadata as { reason?: string } | null)?.reason || null,
                    amount: row.amount,
                    currency: 'JETON',
                    meta: row.metadata as Record<string, unknown> | null,
                }))

                const paymentRows = (payRes.data || []).map((row) => ({
                    id: row.id,
                    created_at: row.created_at,
                    kind: 'payment' as const,
                    title: row.kind === 'premium' ? 'Premium Ödemesi' : 'Jeton Ödemesi',
                    subtitle: row.provider || 'Kart Ödemesi',
                    amount: row.amount,
                    currency: row.currency,
                    status: row.status || undefined,
                    meta: row.metadata as Record<string, unknown> | null,
                }))

                const transferRows = (transferRes.data || []).map((row) => ({
                    id: row.id,
                    created_at: row.created_at,
                    kind: 'bank_transfer' as const,
                    title: 'Havale/EFT',
                    subtitle: row.reference || 'Banka transferi',
                    amount: row.amount ?? null,
                    currency: 'TRY',
                    status: row.status || undefined,
                    meta: null,
                }))

                const merged = [...txRows, ...paymentRows, ...transferRows].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
                setHistoryRows(merged)
            } catch (err: unknown) {
                toast.push(err instanceof Error ? err.message : 'İşlem geçmişi yüklenemedi.', 'error')
                setHistoryRows([])
            } finally {
                setHistoryLoading(false)
            }
        }
        void loadHistory()
    }, [user, supabase, toast])

    useEffect(() => {
        if (!user) return
        const id = setTimeout(() => {
            const loadMetrics = async () => {
                const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

                const [{ count: views }, { count: likes }, { count: matches }, { count: blocks }, { count: notifications }] = await Promise.all([
                    supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('viewed_id', user.id),
                    supabase.from('likes').select('id', { count: 'exact', head: true }).eq('to_user', user.id).gte('created_at', since),
                    supabase.from('matches').select('id', { count: 'exact', head: true }).or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
                    supabase.from('blocks').select('id', { count: 'exact', head: true }).eq('blocker_id', user.id),
                    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
                ])

                const { data: matchIds } = await supabase
                    .from('matches')
                    .select('id')
                    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

                const ids = (matchIds || []).map((m: { id: string }) => m.id)
                let unread = 0
                if (ids.length > 0) {
                    const { count } = await supabase
                        .from('messages')
                        .select('id', { count: 'exact', head: true })
                        .in('match_id', ids)
                        .neq('sender_id', user.id)
                        .is('read_at', null)
                    unread = count || 0
                }

                setMetrics({
                    views: views || 0,
                    newLikes: likes || 0,
                    matches: matches || 0,
                    unread,
                    blocks: blocks || 0,
                    notifications: notifications || 0,
                })
            }
            void loadMetrics()
        }, 0)
        return () => clearTimeout(id)
    }, [user, supabase])

    useEffect(() => {
        return () => {
            if (pendingStoryPreview) URL.revokeObjectURL(pendingStoryPreview)
        }
    }, [pendingStoryPreview])

    const resetPendingStory = () => {
        if (pendingStoryPreview) URL.revokeObjectURL(pendingStoryPreview)
        setPendingStoryFile(null)
        setPendingStoryPreview(null)
    }

    const handleStoryFileSelect = (file: File) => {
        if (!file) return
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            toast.push('Sadece görsel veya video seçebilirsin.', 'error')
            return
        }
        if (pendingStoryPreview) URL.revokeObjectURL(pendingStoryPreview)
        setPendingStoryFile(file)
        setPendingStoryPreview(URL.createObjectURL(file))
    }

    const handleStoryUpload = async () => {
        if (!user || !pendingStoryFile) return
        setStoryUploading(true)
        try {
            await uploadStory(pendingStoryFile, user.id, isPremium)
            const rows = await fetchUserStories(user.id)
            setStories(rows)
            toast.push('Hikaye paylaşıldı.', 'success')
            resetPendingStory()
        } catch (err: unknown) {
            toast.push(err instanceof Error ? err.message : 'Hikaye yüklenemedi.', 'error')
        } finally {
            setStoryUploading(false)
        }
    }

    const handleLogout = async () => {
        setLoading(true)
        await supabase.auth.signOut()
        setSession(null)
        router.push('/login')
    }

    if (!user) {
        return <LoadingSplash text="Lütfen giriş yap" />
    }

    const myAvatar = profileData ? getProfileAvatar(profileData) : '/placeholder-user.jpg'
    const displayName = profileData?.display_name || user.email || 'Profil'
    const firstStory = stories[0] || null
    const verificationMeta: Record<VerificationType, { label: string; icon: typeof ShieldCheck }> = {
        device: { label: 'Cihaz Doğrulama', icon: Smartphone },
        photo: { label: 'Fotoğraf Doğrulama', icon: Camera },
        selfie: { label: 'Fotoğraf Doğrulama', icon: Camera },
        kyc: { label: 'Kimlik Doğrulama', icon: IdCard },
        video: { label: 'Video Doğrulama', icon: Video },
        email: { label: 'E-posta Doğrulama', icon: ShieldCheck },
    }
    const visibleVerifications = Array.from(new Set(
        verifiedTypes
            .map((t) => (t === 'selfie' ? 'photo' : t))
            .filter((t) => t !== 'email')
    ))

    return (
        <div className="profile-shell space-y-6 pb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                    onClick={() => document.getElementById('profile-story-upload')?.click()}
                    disabled={storyUploading}
                    variant="ghost"
                    size="lg"
                    className="flex w-full items-center gap-3 sm:w-auto"
                >
                    <span className="relative block h-16 w-16 rounded-full bg-[conic-gradient(from_180deg,#22d3ee,#ec4899,#f59e0b,#22d3ee)] p-[2px]">
                        <span className="relative block h-full w-full overflow-hidden rounded-full border border-black/50">
                            <Image src={myAvatar} alt="Hikaye Ekle" fill sizes="64px" className="object-cover" />
                        </span>
                        <span className="absolute -bottom-1 -right-1 rounded-full border border-black/60 bg-cyan-500 p-1 text-white">
                            <Plus size={10} />
                        </span>
                    </span>
                    <span className="text-left">
                        <span className="block text-sm font-semibold text-white">{storyUploading ? 'Yükleniyor...' : 'Hikaye Ekle'}</span>
                        <span className="block text-xs text-gray-300">24 saat görünür • Foto veya video</span>
                    </span>
                </Button>

                {firstStory && (
                    <Button
                        onClick={() => router.push(`/stories/${firstStory.id}`)}
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto text-xs"
                    >
                        Hikayeni Gör
                    </Button>
                )}
                <input
                    id="profile-story-upload"
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleStoryFileSelect(file)
                        e.currentTarget.value = ''
                    }}
                />
            </div>

            {pendingStoryFile && pendingStoryPreview && (
                <div className="fixed inset-0 z-[110] flex items-end bg-black/80 p-3 sm:static sm:z-auto sm:bg-transparent sm:p-0">
                    <div className="glass-panel w-full rounded-2xl border border-white/10 p-4 sm:mt-2">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-white">Hikaye Önizleme</div>
                                <div className="max-w-[220px] truncate text-xs text-gray-400 sm:max-w-none">{pendingStoryFile.name}</div>
                            </div>
                            <Button
                                onClick={resetPendingStory}
                                variant="secondary"
                                size="icon"
                                className="rounded-full border border-white/15 bg-white/10 text-gray-200 hover:bg-white/20"
                                title="Kaldır"
                            >
                                <X size={14} />
                            </Button>
                        </div>

                        <div className="relative mb-3 h-[58dvh] w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 sm:h-72">
                            {pendingStoryFile.type.startsWith('video/') ? (
                                <video src={pendingStoryPreview} controls className="h-full w-full object-contain" />
                            ) : (
                                <Image src={pendingStoryPreview} alt="Hikaye önizleme" fill sizes="(max-width: 768px) 100vw, 720px" className="object-contain" />
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={resetPendingStory}
                                variant="secondary"
                                className="flex-1 text-sm"
                            >
                                Vazgeç
                            </Button>
                            <Button
                                onClick={handleStoryUpload}
                                disabled={storyUploading}
                                className="flex-1 text-sm"
                            >
                                {storyUploading ? 'Paylaşılıyor...' : 'Hikayeyi Paylaş'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-panel rounded-3xl p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <span className="relative block h-20 w-20 rounded-full bg-[conic-gradient(from_180deg,#22d3ee,#ec4899,#f59e0b,#22d3ee)] p-[2px]">
                                <span className="relative block h-full w-full overflow-hidden rounded-full border border-black/50">
                                    <Image src={myAvatar} alt="Profil" fill sizes="80px" className="object-cover" />
                                </span>
                            </span>
                            {isPremium && hasFeature('premium_badge') && (
                                <span className="absolute -bottom-1 -right-1 rounded-full border border-black/60 bg-pink-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                                    Premium
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="text-lg font-semibold">{displayName}</div>
                            <div className="text-xs text-gray-400">{user.email}</div>
                            <div className="mt-2 flex items-center gap-2 text-xs">
                                <span className="text-gray-400">Bakiye</span>
                                <span className="text-yellow-500 font-semibold">{balance} jeton</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                        <Button
                            onClick={() => router.push('/profile/edit')}
                            variant="secondary"
                            size="sm"
                            className="flex-1 sm:flex-none"
                        >
                            Profil Düzenle
                        </Button>
                        <Button
                            onClick={() => router.push('/settings')}
                            variant="ghost"
                            size="sm"
                            className="flex-1 sm:flex-none"
                        >
                            Ayarlar
                        </Button>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="profile-stat-card rounded-2xl bg-white/5 p-3 text-center">
                        <div className="text-xs text-gray-400">Görüntülenme</div>
                        <div className="text-lg font-semibold">{metrics.views}</div>
                    </div>
                    <div className="profile-stat-card rounded-2xl bg-white/5 p-3 text-center">
                        <div className="text-xs text-gray-400">Eşleşme</div>
                        <div className="text-lg font-semibold">{metrics.matches}</div>
                    </div>
                    <div className="profile-stat-card rounded-2xl bg-white/5 p-3 text-center">
                        <div className="text-xs text-gray-400">Okunmamış</div>
                        <div className="text-lg font-semibold">{metrics.unread}</div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <BarChart2 size={16} className="text-emerald-400" />
                    Profil Özeti
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-xs text-gray-400">Yeni Beğeni (7g)</div>
                        <div className="text-lg font-bold">{metrics.newLikes}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-xs text-gray-400">Bildirim</div>
                        <div className="text-lg font-bold">{metrics.notifications}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-xs text-gray-400">Engellediklerim</div>
                        <div className="text-lg font-bold">{metrics.blocks}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-xs text-gray-400">Profil Görüntüleyen</div>
                        <div className="text-lg font-bold">{metrics.views}</div>
                    </div>
                </div>
            </div>

            <NotificationsBadge />

            <div className="glass-panel p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    Doğrulamalar
                </div>
                {visibleVerifications.length === 0 ? (
                    <div className="text-xs text-gray-400">Henüz doğrulama yok.</div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {visibleVerifications.map((type) => {
                            const meta = verificationMeta[type]
                            const Icon = meta?.icon || ShieldCheck
                            return (
                                <span key={type} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                                    <Icon size={12} />
                                    {meta?.label || type}
                                </span>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="glass-panel p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <Wallet size={16} className="text-yellow-400" />
                    Harcama ve Ödeme Geçmişi
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] mb-3">
                    <button
                        onClick={() => setHistoryFilter('all')}
                        className={`px-2.5 py-1 rounded-full border ${historyFilter === 'all' ? 'bg-white/15 text-white border-white/20' : 'bg-white/5 text-gray-300 border-white/10'}`}
                    >
                        Tümü
                    </button>
                    <button
                        onClick={() => setHistoryFilter('payments')}
                        className={`px-2.5 py-1 rounded-full border ${historyFilter === 'payments' ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30' : 'bg-white/5 text-gray-300 border-white/10'}`}
                    >
                        Ödemeler
                    </button>
                    <button
                        onClick={() => setHistoryFilter('coin_spend')}
                        className={`px-2.5 py-1 rounded-full border ${historyFilter === 'coin_spend' ? 'bg-rose-500/20 text-rose-100 border-rose-400/30' : 'bg-white/5 text-gray-300 border-white/10'}`}
                    >
                        Jeton Harcamaları
                    </button>
                </div>
                {historyLoading ? (
                    <div className="text-xs text-gray-400">Yükleniyor...</div>
                ) : filteredHistory.length === 0 ? (
                    <div className="text-xs text-gray-400">Henüz bir işlem yok.</div>
                ) : (
                    <div className="space-y-2">
                        {filteredHistory.map((row) => {
                            const isCoin = row.currency === 'JETON'
                            const amountLabel = row.amount === null
                                ? '—'
                                : isCoin
                                    ? `${Math.abs(row.amount)} jeton`
                                    : `${row.amount} ${row.currency || 'TRY'}`
                            const amountColor = row.amount !== null && row.amount < 0 ? 'text-rose-400' : 'text-emerald-300'
                            const ref = row.meta
                                ? String(
                                    (row.meta as { reference?: string; ref?: string; transaction_id?: string; payment_id?: string; order_id?: string }).reference
                                    || (row.meta as { ref?: string }).ref
                                    || (row.meta as { transaction_id?: string }).transaction_id
                                    || (row.meta as { payment_id?: string }).payment_id
                                    || (row.meta as { order_id?: string }).order_id
                                    || ''
                                )
                                : ''
                            return (
                                <div key={`${row.kind}-${row.id}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold truncate">{row.title}</div>
                                            {row.subtitle && <div className="text-[11px] text-gray-400 truncate">{row.subtitle}</div>}
                                            <div className="text-[10px] text-gray-500">
                                                {new Date(row.created_at).toLocaleString('tr-TR')}
                                                {row.status ? ` • ${row.status}` : ''}
                                            </div>
                                        </div>
                                        <div className={`text-sm font-semibold whitespace-nowrap ${amountColor}`}>
                                            {amountLabel}
                                        </div>
                                    </div>
                                    {row.meta && (row.meta as { reason?: string }).reason && (
                                        <div className="text-[10px] text-gray-500 mt-1">
                                            Sebep: {(row.meta as { reason?: string }).reason}
                                        </div>
                                    )}
                                    {ref && (
                                        <div className="text-[10px] text-gray-500 mt-1 truncate">
                                            Ref: {ref}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <div className="text-xs uppercase tracking-wider text-gray-400 px-1">Kısa Yollar</div>
                <Button
                    onClick={() => router.push('/profile/edit')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <User size={20} className="text-pink-500" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">Profil Düzenle</h3>
                        <p className="text-xs text-gray-400">Fotoğraflarını ve bilgilerini güncelle</p>
                    </div>
                </Button>

                <Button
                    onClick={() => router.push('/store')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Wallet size={20} className="text-yellow-500" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">Mağaza</h3>
                        <p className="text-xs text-gray-400">Jeton, Premium, Boost</p>
                    </div>
                </Button>

                <Button
                    onClick={() => router.push('/gifts')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <Gift size={20} className="text-pink-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">Hediyeler</h3>
                        <p className="text-xs text-gray-400">Hediye listesi ve geçmiş</p>
                    </div>
                </Button>

                <div className="glass-panel p-5 rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-pink-500/5 to-violet-500/10">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-sm font-semibold text-yellow-200">Premium Ayrıcalıklar</div>
                            <div className="premium-perks mt-2 flex flex-wrap gap-2 text-[11px]">
                                {(premiumList.length > 0
                                    ? premiumList
                                    : [
                                        'Sınırsız sohbet başlatma',
                                        'Gelişmiş filtreler',
                                        'Profilimi görenler',
                                        'Seni beğenenler',
                                        'Günlük boost',
                                        'Mini Boost',
                                        'Okundu bilgisi',
                                        'Gizli mod',
                                        'Günlük 1 Super Like',
                                        'Geri alma',
                                        'Mesaj jetonu iadesi',
                                        'Reklamsız deneyim',
                                        'Premium rozet',
                                    ]
                                ).map((item) => (
                                    <span key={item} className="premium-perk-chip">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/20 text-yellow-300">
                            <Gift size={18} />
                        </div>
                    </div>
                    {!isPremium && (
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="premium-subcopy text-xs text-gray-300">
                                7 günlük farkı hisset. İptal ettiğinde kaybetmezsin.
                            </div>
                            <Button
                                onClick={() => router.push('/store/premium')}
                                variant="premium"
                                size="sm"
                                className="text-xs"
                            >
                                Premium&apos;a Yükselt
                            </Button>
                        </div>
                    )}
                </div>

                {isAdmin && (
                    <Button
                        onClick={() => router.push('/admin')}
                        variant="ghost"
                        size="lg"
                        className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            <Shield size={20} className="text-white" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-semibold">Admin Paneli</h3>
                            <p className="text-xs text-gray-400">Ödemeleri ve kullanıcıları yönet</p>
                        </div>
                    </Button>
                )}

                <Button
                    onClick={() => router.push('/settings')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <Settings size={20} className="text-violet-500" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">Ayarlar</h3>
                        <p className="text-xs text-gray-400">Tercihler ve bildirimler</p>
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
                        <h3 className="font-semibold">Gizlilik ve Güvenlik</h3>
                        <p className="text-xs text-gray-400">Seni kimlerin göreceğini kontrol et</p>
                    </div>
                </Button>

                <Button
                    onClick={() => router.push('/liked-you')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Heart size={20} className="text-green-500" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">Seni Beğenenler</h3>
                        <p className="text-xs text-gray-400">Seni beğenen profilleri gör</p>
                    </div>
                </Button>

                <Button
                    onClick={() => router.push('/profile-viewers')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Eye size={20} className="text-yellow-500" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">Profili Görüntüleyenler</h3>
                        <p className="text-xs text-gray-400">Profilini görüntüleyenleri gör</p>
                    </div>
                </Button>

                <Button
                    onClick={() => router.push('/liked-you?tab=favorites')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Star size={20} className="text-amber-400" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">Favorilerim</h3>
                        <p className="text-xs text-gray-400">Kaydettigin profiller</p>
                    </div>
                </Button>

                <Button
                    onClick={() => router.push('/notifications')}
                    variant="ghost"
                    size="lg"
                    className="w-full h-auto glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <Bell size={20} className="text-white" />
                    </div>
                    <div className="flex-1 text-left">
                        <h3 className="font-semibold">Bildirimler</h3>
                        <p className="text-xs text-gray-400">Okunmamış: {metrics.notifications}</p>
                    </div>
                </Button>
            </div>

            <Button
                onClick={handleLogout}
                disabled={loading}
                variant="destructive"
                className="w-full p-4 rounded-2xl flex items-center justify-center gap-3"
            >
                <LogOut size={20} />
                {loading ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
            </Button>

            <p className="text-center text-xs text-gray-500 mt-4">Sürüm 1.0.0</p>
        </div>
    )
}
