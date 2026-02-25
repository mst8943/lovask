'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { Heart, MapPin, Star, ChevronLeft, ChevronRight, Target, HeartHandshake, Briefcase, Baby, PawPrint, Dumbbell, Ruler, GraduationCap, Cigarette, Wine, Landmark, Leaf, Users, Link as LinkIcon, Languages, Sparkles, Ban, Flag } from 'lucide-react'
import { likeUser } from '@/services/feedService'
import { toggleFavorite } from '@/services/favoritesService'
import { blockUser, reportUser } from '@/services/moderationService'
import { createBotMatch } from '@/services/chatService'
import { useToast } from '@/components/ui/Toast'
import { getIncognitoActive } from '@/services/extraFeaturesService'
import LoadingSplash from '@/components/ui/LoadingSplash'
import AnimatedLoader from '@/components/ui/AnimatedLoader'
import MatchCelebration from '@/components/ui/MatchCelebration'
import InputDialog from '@/components/ui/InputDialog'
import { getProfileAvatar } from '@/utils/avatar'
import { getLocationLabel } from '@/utils/location'
import { fetchUserStories, Story } from '@/services/storiesService'
import { Button } from '@/components/ui/Button'
import { usePresenceStore } from '@/store/usePresenceStore'
import { canShowLastActive } from '@/utils/lastActive'
import type { LastActiveVisibility } from '@/utils/lastActive'

type ProfileDetail = {
    id: string
    display_name: string | null
    age: number | null
    gender: string | null
    bio: string | null
    city: string | null
    location_visibility?: 'public' | 'approx' | 'hidden' | null
    intent?: string | null
    relationship_goal?: string | null
    work_title?: string | null
    languages?: string[] | null
    values?: string[] | null
    dealbreakers?: string[] | null
    family_plans?: string | null
    pets?: string | null
    fitness?: string | null
    height?: number | string | null
    education?: string | null
    smoking?: string | null
    alcohol?: string | null
    religion?: string | null
    children?: string | null
    photos: unknown
    interests: string[] | null
    is_bot?: boolean | null
    is_verified?: boolean | null
    users?: { is_premium: boolean; last_active_at: string | null } | null
    last_active_visibility?: LastActiveVisibility
    [key: string]: unknown
}

export default function ProfileDetailClient() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuthStore()
    const router = useRouter()
    const [profile, setProfile] = useState<ProfileDetail | null>(null)
    const [isFavorited, setIsFavorited] = useState(false)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [reporting, setReporting] = useState(false)
    const [blocking, setBlocking] = useState(false)
    const [isBot, setIsBot] = useState(false)
    const [isMatched, setIsMatched] = useState(false)
    const [matchOpen, setMatchOpen] = useState(false)
    const [blockOpen, setBlockOpen] = useState(false)
    const [reportOpen, setReportOpen] = useState(false)
    const [stories, setStories] = useState<Story[]>([])
    const [galleryIndex, setGalleryIndex] = useState(0)
    const [compatibility, setCompatibility] = useState<{ score: number; breakdown: Record<string, unknown> } | null>(null)
    const [showMoreDetails, setShowMoreDetails] = useState(false)
    const supabase = createClient()
    const toast = useToast()
    const isOwnProfile = !!user && !!profile && user.id === profile.id
    const [now, setNow] = useState(() => Date.now())

    const onlineUsers = usePresenceStore((s) => s.onlineUsers)
    const isOnlineRealtime = profile ? onlineUsers.has(profile.id) : false
    const lastActiveFallback = profile?.users?.last_active_at ? new Date(profile.users.last_active_at).getTime() : 0
    const isOnlineFallback = !!lastActiveFallback && now - lastActiveFallback < 10 * 60 * 1000
    const canShowPresence = canShowLastActive(profile?.last_active_visibility, isMatched)
    const isHiddenPresence = profile?.last_active_visibility === 'hidden'
    const isOnline = (profile?.is_bot || isOnlineRealtime || isOnlineFallback) && canShowPresence

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        const fetchProfile = async () => {
            if (!id || !user) return
            setLoading(true)

            const { data, error } = await supabase
                .from('profiles')
                .select('*, users:users(is_premium,last_active_at)')
                .eq('id', id)
                .maybeSingle()

            if (!error && data) setProfile(data as ProfileDetail)
            if (data?.is_bot) setIsBot(true)

            if (user?.id) {
                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('last_active_visibility')
                    .eq('user_id', id)
                    .maybeSingle()
                if (settings && data) {
                    setProfile((prev) => prev ? ({ ...prev, last_active_visibility: settings.last_active_visibility }) : prev)
                } else if (data) {
                    const { data: session } = await supabase.auth.getSession()
                    const token = session.session?.access_token
                    if (token) {
                        const res = await fetch('/api/profile/visibility', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify({ userId: id }),
                        })
                        if (res.ok) {
                            const payload = await res.json()
                            const visibility = (payload?.visibilities || {})[id]
                            if (visibility) {
                                setProfile((prev) => prev ? ({ ...prev, last_active_visibility: visibility }) : prev)
                            }
                        }
                    }
                }
                const { data: matchRow } = await supabase
                    .from('matches')
                    .select('id')
                    .or(`and(user_a.eq.${user.id},user_b.eq.${id}),and(user_a.eq.${id},user_b.eq.${user.id})`)
                    .maybeSingle()
                setIsMatched(!!matchRow)
            }

            const { data: fav } = await supabase
                .from('favorites')
                .select('id')
                .eq('from_user', user.id)
                .eq('to_user', id)
                .maybeSingle()

            setIsFavorited(!!fav)

            try {
                const userStories = await fetchUserStories(id)
                setStories(userStories)
            } catch {
                setStories([])
            }

            const incognito = await getIncognitoActive(user.id)
            if (!incognito) {
                await supabase.from('profile_views').insert({
                    viewer_id: user.id,
                    viewed_id: id,
                })
            }

            setLoading(false)
        }

        fetchProfile()
    }, [id, user, supabase])

    useEffect(() => {
        const loadCompatibility = async () => {
            if (!user || !id) return
            const { data } = await supabase
                .from('compatibility_scores')
                .select('score,breakdown')
                .eq('user_id', user.id)
                .eq('other_id', id)
                .maybeSingle()
            if (data) {
                setCompatibility({ score: data.score || 0, breakdown: (data.breakdown as Record<string, unknown>) || {} })
            }
        }
        loadCompatibility()
    }, [id, supabase, user])

    useEffect(() => {
        if (isOwnProfile) {
            router.replace('/profile')
        }
    }, [isOwnProfile, router])

    const handleLike = async () => {
        if (!user || !profile) return
        setActionLoading(true)
        try {
            const res = await likeUser(user.id, profile.id)
            if (res?.isMatch) {
                setMatchOpen(true)
                setTimeout(() => {
                    setMatchOpen(false)
                    router.push('/matches')
                }, 1400)
            }
        } finally {
            setActionLoading(false)
        }
    }

    const handleFavorite = async () => {
        if (!user || !profile) return
        setActionLoading(true)
        try {
            const next = await toggleFavorite(user.id, profile.id, isFavorited)
            setIsFavorited(next)
        } finally {
            setActionLoading(false)
        }
    }

    const handleBlock = async () => {
        if (!user || !profile) return
        setBlockOpen(true)
    }

    const handleReport = async () => {
        if (!user || !profile) return
        setReportOpen(true)
    }

    const handleStartChat = async () => {
        if (!user || !profile) return
        setActionLoading(true)
        try {
            if (isBot) {
                const matchId = await createBotMatch(profile.id)
                router.push(`/matches/${matchId}`)
            } else {
                // Check if a match already exists
                const { data: matchA } = await supabase
                    .from('matches')
                    .select('id')
                    .eq('user_a', user.id)
                    .eq('user_b', profile.id)
                    .maybeSingle()
                const { data: matchB } = await supabase
                    .from('matches')
                    .select('id')
                    .eq('user_a', profile.id)
                    .eq('user_b', user.id)
                    .maybeSingle()

                let matchId = matchA?.id || matchB?.id

                if (!matchId) {
                    // Start a direct chat by creating a match
                    const { data: newMatch, error } = await supabase
                        .from('matches')
                        .insert({
                            user_a: user.id,
                            user_b: profile.id,
                            is_active: true
                        })
                        .select('id')
                        .single()
                    if (error) throw error
                    matchId = newMatch.id
                }
                router.push(`/matches/${matchId}`)
            }
        } catch (err: unknown) {
            toast.push(err instanceof Error ? err.message : 'Sohbet başlatılamadı.', 'error')
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return <LoadingSplash text="Profil yükleniyor..." />
    }

    if (!profile) {
        return (
            <div className="text-center text-gray-400 py-12">
                Profil bulunamadı.
            </div>
        )
    }

    const parsedPhotos = (() => {
        const raw = profile.photos
        if (!raw) return [] as string[]
        if (Array.isArray(raw)) return raw.filter(Boolean) as string[]
        if (typeof raw === 'string') {
            try {
                const arr = JSON.parse(raw)
                return Array.isArray(arr) ? arr.filter(Boolean) : []
            } catch {
                return []
            }
        }
        return []
    })()
    const photoUrl = getProfileAvatar(profile)
    const galleryPhotos = parsedPhotos.length > 0 ? parsedPhotos : [photoUrl]
    const activePhoto = galleryPhotos[Math.min(galleryIndex, galleryPhotos.length - 1)] || photoUrl
    const firstStory = stories[0] || null

    // Resolve potentially different key names from DB
    const profileHeight = profile.height_cm || profile.height || profile.boy || profile.length || profile.cm;
    const normalizeProfileText = (value: unknown) => {
        if (typeof value !== 'string') return null
        const trimmed = value.trim()
        return trimmed ? trimmed : null
    }
    const profileEducation =
        normalizeProfileText(profile.education)
        || normalizeProfileText(profile.egitim)
        || normalizeProfileText(profile.school)
    const profileSmoking =
        normalizeProfileText(profile.smoking)
        || normalizeProfileText(profile.sigara)
        || normalizeProfileText(profile.smoke)
    const profileAlcohol =
        normalizeProfileText(profile.alcohol)
        || normalizeProfileText(profile.alkol)
        || normalizeProfileText(profile.drink)
    const profileReligion =
        normalizeProfileText(profile.religion)
        || normalizeProfileText(profile.din)
        || normalizeProfileText(profile.faith)
    const profileChildren =
        normalizeProfileText(profile.kids_status)
        || normalizeProfileText(profile.children)
        || normalizeProfileText(profile.cocuk)
        || normalizeProfileText(profile.kids)
    const profileLifestyle = normalizeProfileText(profile.lifestyle)
    const profileLookingFor = Array.isArray(profile.looking_for_genders)
        ? (profile.looking_for_genders as string[])
        : null
    const profileRelationshipType = normalizeProfileText(profile.relationship_type)
    const genderLabel: Record<string, string> = {
        Male: 'Erkek',
        Female: 'Kadın',
        'Non-binary': 'İkili olmayan',
    }

    const intentLabel: Record<string, string> = {
        serious: 'Ciddi',
        casual: 'Gündelik',
        friendship: 'Arkadaşlık',
        network: 'Sosyal',
    }
    const goalLabel: Record<string, string> = {
        long_term: 'Uzun vade',
        short_term: 'Kisa vade',
        open_to_all: 'Farketmez',
    }
    const familyLabel: Record<string, string> = {
        want: 'Istiyorum',
        dont_want: 'Istemiyorum',
        maybe: 'Belki',
    }
    const petsLabel: Record<string, string> = {
        have: 'Var',
        want: 'Isterim',
        no: 'Yok',
    }
    const educationLabel: Record<string, string> = {
        high_school: 'Lise',
        bally_bachelor: 'Lisans',
        master: 'Yüksek Lisans',
        phd: 'Doktora',
        other: 'Diğer',
    }
    const smokingLabel: Record<string, string> = {
        no: 'Hayır',
        yes: 'Evet',
        social: 'Sosyal içici',
    }
    const alcoholLabel: Record<string, string> = {
        no: 'Hayır',
        yes: 'Evet',
        social: 'Sosyal içici',
    }
    const childrenLabel: Record<string, string> = {
        have: 'Var',
        dont_have: 'Yok',
        want: 'İstiyorum',
        dont_want: 'İstemiyorum',
    }
    const religionLabel: Record<string, string> = {
        muslim: 'Müslüman',
        christian: 'Hristiyan',
        jewish: 'Musevi',
        atheist: 'Ateist',
        agnostic: 'Agnostik',
        spiritual: 'Spiritüel',
        other: 'Diğer',
    }

    const fitnessLabel: Record<string, string> = {
        active: 'Aktif',
        sometimes: 'Ara sıra',
        rare: 'Nadiren',
    }
    const lifestyleLabel: Record<string, string> = {
        active: 'Aktif',
        calm: 'Sakin',
        nightlife: 'Gece hayatı',
        home: 'Ev odaklı',
    }
    const relationshipTypeLabel: Record<string, string> = {
        serious: 'Ciddi',
        casual: 'Gündelik',
        friendship: 'Arkadaşlık',
    }

    if (isOwnProfile) {
        return <LoadingSplash text="Profil sayfasına yönlendiriliyor..." />
    }

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12 pb-24">

            {/* Mobile Header Nav */}
            <div className="md:hidden flex items-center mb-6" />

            <div className="grid grid-cols-1 md:grid-cols-[45%_55%] gap-8 lg:gap-12 items-start">

                {/* --- SOL KOLON: FOTOĞRAF GALERİSİ --- */}
                <div className="space-y-4 sticky top-6">
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-800">
                        <Image
                            src={activePhoto}
                            alt={profile.display_name || 'Kullanıcı'}
                            fill
                            className="object-cover"
                            priority
                        />

                        {/* Fotoğraf Üstü Bilgiler */}
                        <div className="absolute top-4 left-4 flex gap-2">
                            {profile.users?.is_premium && (
                                <div className="flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950 shadow-sm">
                                    <Star size={10} className="fill-current" />
                                    <span>PREMIUM</span>
                                </div>
                            )}
                            {isOnline && (
                                <div className="flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-white border border-white/10">
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                    <span>Aktif</span>
                                </div>
                            )}
                        </div>

                        {/* Galeri Navigasyon */}
                        {galleryPhotos.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setGalleryIndex((idx) => (idx === 0 ? galleryPhotos.length - 1 : idx - 1));
                                    }}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md transition hover:bg-white hover:scale-105"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setGalleryIndex((idx) => (idx + 1) % galleryPhotos.length);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md transition hover:bg-white hover:scale-105"
                                >
                                    <ChevronRight size={20} />
                                </button>

                                {/* Pagination Dots */}
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                                    {galleryPhotos.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setGalleryIndex(idx)}
                                            className={`h-1.5 rounded-full transition-all shadow-sm ${idx === galleryIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Küçük Resimler (Thumbnail) */}
                    {galleryPhotos.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {galleryPhotos.map((src, idx) => (
                                <button
                                    key={`thumb-${idx}`}
                                    onClick={() => setGalleryIndex(idx)}
                                    className={`relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${idx === galleryIndex
                                        ? 'border-pink-500 ring-1 ring-pink-500/20'
                                        : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    <Image src={src} alt="" fill className="object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>


                {/* --- SAĞ KOLON: PROFİL BİLGİLERİ --- */}
                <div className="flex flex-col space-y-8">

                    {/* Başlık Alanı */}
                    <div>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-[var(--foreground)] flex items-center gap-2">
                                    {profile.display_name}
                                    <span className="text-slate-400 font-normal">{profile.age ? `, ${profile.age}` : ''}</span>
                                    {profile.is_verified && (
                                        <div title="Doğrulanmış Hesap" className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </h1>
                                <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                                    <MapPin size={16} />
                                    {getLocationLabel(profile)}
                                    {profile.gender && (
                                        <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold uppercase">{profile.gender === 'male' ? 'Erkek' : profile.gender === 'female' ? 'Kadın' : 'Diğer'}</span>
                                    )}
                                </div>
                            </div>

                            {/* Uyumluluk Skoru */}
                            {compatibility && (
                                <div className="text-center">
                                    <div className="flex items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2">
                                        <div className="text-center">
                                            <span className="block text-lg font-bold text-emerald-600 dark:text-emerald-400">%{compatibility.score}</span>
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/60">Uyum</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* İstatistikler (Son Aktif / Hikaye) */}
                        <div className="mt-6 flex divide-x divide-white/10 bg-[var(--background)]/70 rounded-xl border border-white/10 p-4">
                            <div className="flex-1 text-center px-4">
                                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Durum</div>
                                <div className={`font-semibold ${isHiddenPresence ? 'text-slate-400' : isOnline ? 'text-emerald-500' : 'text-[var(--foreground)]'}`}>
                                    {isHiddenPresence ? 'Gizli' : isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                                </div>
                            </div>
                            <div className="flex-1 text-center px-4">
                                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-1">Hikaye</div>
                                <div className="font-semibold text-[var(--foreground)]">
                                    {stories.length > 0 ? `${stories.length} Paylaşım` : '-'}
                                </div>
                            </div>
                        </div>

                        {/* Mobil: Engelle / Raporla (Durum & Hikaye kartının altında) */}
                        <div className="mt-4 md:hidden flex gap-3">
                            <button
                                onClick={handleBlock}
                                className="flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                <Ban size={14} />
                                Gizle / Engelle
                            </button>
                            <button
                                onClick={handleReport}
                                className="flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                <Flag size={14} />
                                Raporla
                            </button>
                        </div>

                        {/* Hikaye Butonu (Varsa) */}
                        {firstStory && (
                            <div className="mt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(`/stories/${firstStory.id}`)}
                                    className="w-full justify-between h-auto py-3 px-4 border-pink-200 text-pink-600 hover:text-pink-700 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-900/30 dark:text-pink-400 dark:hover:bg-pink-900/10"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative h-8 w-8 overflow-hidden rounded-full ring-2 ring-pink-500 ring-offset-2 dark:ring-offset-slate-900">
                                            <Image src={photoUrl} alt="Story" fill className="object-cover" />
                                        </div>
                                        <span className="font-medium">Hikayeleri Görüntüle</span>
                                    </div>
                                    <ChevronRight size={18} />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Biyografi */}
                    {profile.bio && (
                        <div>
                            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">Hakkında</h3>
                            <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                                {profile.bio}
                            </p>
                        </div>
                    )}

                    {/* İlgili Alanları Tagleri */}
                    {profile.interests && profile.interests.length > 0 && (
                        <div>
                            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">İlgi Alanları</h3>
                            <div className="flex flex-wrap gap-2">
                                {profile.interests.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detay Bilgileri Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                        {[
                            { label: 'Niyet', value: intentLabel[profile.intent || ''] || profile.intent, icon: Target },
                            { label: 'İlişki Hedefi', value: goalLabel[profile.relationship_goal || ''] || profile.relationship_goal, icon: HeartHandshake },
                            { label: 'Meslek', value: profile.work_title, icon: Briefcase },
                            { label: 'Aile Planı', value: familyLabel[profile.family_plans || ''] || profile.family_plans, icon: Baby },
                            { label: 'Evcil Hayvan', value: petsLabel[profile.pets || ''] || profile.pets, icon: PawPrint },
                            { label: 'Spor', value: fitnessLabel[profile.fitness || ''] || profile.fitness, icon: Dumbbell },
                            { label: 'Boy', value: profileHeight ? `${profileHeight} cm` : null, icon: Ruler },
                            { label: 'Eğitim', value: educationLabel[profileEducation || ''] || profileEducation, icon: GraduationCap },
                            { label: 'Sigara', value: smokingLabel[profileSmoking || ''] || profileSmoking, icon: Cigarette },
                            { label: 'Alkol', value: alcoholLabel[profileAlcohol || ''] || profileAlcohol, icon: Wine },
                            { label: 'Din', value: religionLabel[profileReligion || ''] || profileReligion, icon: Landmark },
                            { label: 'Çocuk', value: childrenLabel[profileChildren || ''] || profileChildren, icon: Baby },
                            { label: 'Yaşam Tarzı', value: lifestyleLabel[profileLifestyle || ''] || profileLifestyle, icon: Leaf },
                            {
                                label: 'Kimi Arıyor',
                                value: profileLookingFor?.length
                                    ? profileLookingFor.map((g) => genderLabel[g] || g).join(', ')
                                    : null,
                                icon: Users
                            },
                            { label: 'İlişki Tipi', value: relationshipTypeLabel[profileRelationshipType || ''] || profileRelationshipType, icon: LinkIcon },
                            { label: 'Diller', value: profile.languages?.length ? profile.languages.join(', ') : null, icon: Languages },
                            { label: 'Değerler', value: profile.values?.length ? profile.values.join(', ') : null, icon: Sparkles },
                            { label: 'Kırmızı Çizgiler', value: profile.dealbreakers?.length ? profile.dealbreakers.join(', ') : null, icon: Ban },
                        ].filter((item) => item.value).slice(0, showMoreDetails ? 999 : 6).map((item, i) => (
                            item.value ? (
                                <div key={i} className="flex gap-3">
                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        <item.icon size={18} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-medium text-slate-400 uppercase">{item.label}</div>
                                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.value}</div>
                                    </div>
                                </div>
                            ) : null
                        ))}
                    </div>
                    {(() => {
                        const total = [
                            { label: 'Niyet', value: intentLabel[profile.intent || ''] || profile.intent },
                            { label: 'İlişki Hedefi', value: goalLabel[profile.relationship_goal || ''] || profile.relationship_goal },
                            { label: 'Meslek', value: profile.work_title },
                            { label: 'Aile Planı', value: familyLabel[profile.family_plans || ''] || profile.family_plans },
                            { label: 'Evcil Hayvan', value: petsLabel[profile.pets || ''] || profile.pets },
                            { label: 'Spor', value: fitnessLabel[profile.fitness || ''] || profile.fitness },
                            { label: 'Boy', value: profileHeight ? `${profileHeight} cm` : null },
                            { label: 'Eğitim', value: educationLabel[profileEducation || ''] || profileEducation },
                            { label: 'Sigara', value: smokingLabel[profileSmoking || ''] || profileSmoking },
                            { label: 'Alkol', value: alcoholLabel[profileAlcohol || ''] || profileAlcohol },
                            { label: 'Din', value: religionLabel[profileReligion || ''] || profileReligion },
                            { label: 'Çocuk', value: childrenLabel[profileChildren || ''] || profileChildren },
                            { label: 'Yaşam Tarzı', value: lifestyleLabel[profileLifestyle || ''] || profileLifestyle },
                            { label: 'Kimi Arıyor', value: profileLookingFor?.length ? profileLookingFor.map((g) => genderLabel[g] || g).join(', ') : null },
                            { label: 'İlişki Tipi', value: relationshipTypeLabel[profileRelationshipType || ''] || profileRelationshipType },
                            { label: 'Diller', value: profile.languages?.length ? profile.languages.join(', ') : null },
                            { label: 'Değerler', value: profile.values?.length ? profile.values.join(', ') : null },
                            { label: 'Kırmızı Çizgiler', value: profile.dealbreakers?.length ? profile.dealbreakers.join(', ') : null },
                        ].filter((item) => item.value).length
                        if (total <= 6) return null
                        return (
                            <button
                                type="button"
                                onClick={() => setShowMoreDetails((v) => !v)}
                                className="mt-4 text-sm font-semibold text-pink-500 hover:text-pink-400 transition-colors"
                            >
                                {showMoreDetails ? 'Daha az göster' : 'Devamını gör'}
                            </button>
                        )
                    })()}


                    {/* --- BUTONLAR (Masaüstü) --- */}
                    <div className="hidden md:flex flex-col gap-3 pt-6">
                        <div className="flex gap-3">
                            {/* Bot ise Direkt Mesaj Başlatabilir, Bot değilse ve normal biriyse de Sohbet Başlat (Eşleşme varsa ya da normal chat) ve Beğen */}
                            <Button
                                onClick={handleStartChat}
                                size="lg"
                                className="flex-1 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.35)] hover:brightness-110 transition-all"
                            >
                                Sohbet Başlat
                            </Button>
                            {!isMatched && (
                                <Button
                                    onClick={handleLike}
                                    size="lg"
                                    disabled={actionLoading}
                                    className="flex-1 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 border border-white/10 shadow-[0_10px_30px_rgba(236,72,153,0.3)] hover:brightness-110 transition-all"
                                >
                                    <Heart className="mr-2" size={20} fill="currentColor" />
                                    Beğen
                                </Button>
                            )}

                            {/* Favoriye Ekle */}
                            <Button
                                onClick={handleFavorite}
                                size="lg"
                                variant="outline"
                                className={`px-4 rounded-xl border shadow-[0_10px_24px_rgba(0,0,0,0.2)] ${isFavorited
                                    ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 border-amber-300/60 text-white'
                                    : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10'
                                    }`}
                                title={isFavorited ? 'Favoriden kaldir' : 'Favoriye ekle'}
                            >
                                <Star size={22} className={isFavorited ? 'fill-white text-white' : 'text-white/80'} />
                            </Button>
                        </div>

                        {/* Alt Aksiyonlar */}
                        <div className="flex justify-center gap-6 mt-2">
                            <button
                                onClick={handleBlock}
                                className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                            >
                                {blocking ? 'İşleniyor...' : 'Profili Gizle / Engelle'}
                            </button>
                            <button
                                onClick={handleReport}
                                className="text-xs font-medium text-slate-400 hover:text-yellow-600 transition-colors"
                            >
                                {reporting ? 'İşleniyor...' : 'Kullanıcıyı Raporla'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MOBİL SABİT BUTONLAR --- */}
            <div className="md:hidden fixed bottom-14 left-0 right-0 z-50 bg-transparent px-6 pb-4 pt-2">
                <div className="flex items-stretch gap-2.5 w-full max-w-3xl mx-auto">
                    <Button
                        onClick={handleStartChat}
                        className="flex-1 rounded-xl h-12 text-base font-semibold text-white bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/10 shadow-[0_10px_28px_rgba(0,0,0,0.3)] hover:brightness-110 transition-all"
                    >
                        Sohbet
                    </Button>
                    {!isMatched && (
                        <Button
                            onClick={handleLike}
                            disabled={actionLoading}
                            className="flex-1 rounded-xl h-12 text-base font-semibold text-white bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 border border-white/10 shadow-[0_10px_28px_rgba(236,72,153,0.35)] hover:brightness-110 transition-all"
                        >
                            <Heart className="mr-1" size={18} fill="currentColor" />
                            Beğen
                        </Button>
                    )}
                    <Button
                        onClick={handleFavorite}
                        variant="outline"
                        className={`h-12 w-12 rounded-xl border shadow-[0_10px_24px_rgba(0,0,0,0.25)] ${isFavorited
                            ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 border-amber-300/60 text-white'
                            : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10'
                            }`}
                    >
                        <Star size={24} className={isFavorited ? 'fill-white text-white' : 'text-white/80'} />
                    </Button>
                </div>

                <div className="flex justify-around mt-4 px-4 md:hidden" />
            </div>

            {/* Modallar */}
            <MatchCelebration
                open={matchOpen}
                onClose={() => setMatchOpen(false)}
                name={profile.display_name}
                photoUrl={photoUrl}
            />

            <InputDialog
                open={blockOpen}
                title="Engelle"
                description="Bu kişiyi engellemek istediğine emin misin?"
                placeholder="Sebep (İsteğe bağlı)"
                confirmText={blocking ? 'Engelleniyor...' : 'Engelle'}
                cancelText="Vazgeç"
                onClose={() => setBlockOpen(false)}
                onConfirm={async (reason) => {
                    if (!user || !profile) return
                    setBlocking(true)
                    try {
                        await blockUser(user.id, profile.id, reason || '')
                        router.push('/feed')
                    } catch (err: unknown) {
                        toast.push(err instanceof Error ? err.message : 'Hata oluştu', 'error')
                    } finally {
                        setBlocking(false)
                        setBlockOpen(false)
                    }
                }}
            />

            <InputDialog
                open={reportOpen}
                title="Raporla"
                description="Bu kullanıcıyı raporlama nedeninizi belirtin."
                placeholder="Raporlama nedeni..."
                confirmText={reporting ? 'Gönderiliyor...' : 'Raporla'}
                cancelText="İptal"
                required
                onClose={() => setReportOpen(false)}
                onConfirm={async (reason) => {
                    if (!user || !profile) return
                    setReporting(true)
                    try {
                        await reportUser(user.id, profile.id, reason)
                        toast.push('Rapor başarıyla gönderildi.', 'success')
                    } catch (err: unknown) {
                        toast.push(err instanceof Error ? err.message : 'Hata oluştu', 'error')
                    } finally {
                        setReporting(false)
                        setReportOpen(false)
                    }
                }}
            />
        </div>
    )
}
