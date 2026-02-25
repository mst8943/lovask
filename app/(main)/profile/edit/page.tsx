'use client'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Plus, X, MapPin } from 'lucide-react'
import Image from 'next/image'
import { useToast } from '@/components/ui/Toast'
import { processImage } from '@/utils/imageUtils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fetchProfileVariantApprovals, fetchProfileVariantsEnabled } from '@/services/appSettingsService'
import Spinner from '@/components/ui/Spinner'
import { CITY_OPTIONS } from '@/utils/cities'
interface ProfileData {
    id: string
    display_name: string
    age: number
    gender: string
    bio: string
    city: string
    looking_for_genders: string[]
    photos: string[]
    interests: string[]
    relationship_type?: string
    education?: string
    smoking?: string
    alcohol?: string
    kids_status?: string
    height_cm?: number
    religion?: string
    lifestyle?: string
    intent?: string
    relationship_goal?: string
    work_title?: string
    languages?: string[]
    dealbreakers?: string[]
    values?: string[]
    family_plans?: string
    pets?: string
    fitness?: string
}
export default function EditProfilePage() {
    const { user } = useAuthStore()
    const router = useRouter()
    const supabase = createClient()
    const toast = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState<ProfileData>({
        id: '',
        display_name: '',
        age: 18,
        gender: '',
        bio: '',
        city: '',
        looking_for_genders: [],
        photos: [],
        interests: [],
    })
    const [variants, setVariants] = useState<Array<{ id: string; name: string | null; is_active: boolean }>>([])
    const [variantForm, setVariantForm] = useState({ name: '', bio: '', photos: '' })
    const [variantPendingCount, setVariantPendingCount] = useState(0)
    const [variantsEnabled, setVariantsEnabled] = useState(true)
    const fileInputRef = useRef<HTMLInputElement>(null)
    useEffect(() => {
        const id = setTimeout(() => {
            const fetchProfile = async () => {
                if (!user) return
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle()
                if (error) {
                    console.error('Error fetching profile:', error)
                } else if (data) {
                    let photos: string[] = []
                    if (Array.isArray(data.photos)) {
                        photos = data.photos
                    } else if (typeof data.photos === 'string') {
                        try {
                            photos = JSON.parse(data.photos)
                        } catch {
                            photos = []
                        }
                    }
                    setProfile({
                        id: data.id,
                        display_name: data.display_name || '',
                        age: data.age || 18,
                        gender: data.gender || '',
                        bio: data.bio || '',
                        city: data.city || '',
                        looking_for_genders: data.looking_for_genders || [],
                        photos,
                        interests: data.interests || [],
                        relationship_type: data.relationship_type || '',
                        education: data.education || '',
                        smoking: data.smoking || '',
                        alcohol: data.alcohol || '',
                        kids_status: data.kids_status || '',
                        height_cm: data.height_cm || undefined,
                        religion: data.religion || '',
                        lifestyle: data.lifestyle || '',
                        intent: data.intent || '',
                        relationship_goal: data.relationship_goal || '',
                        work_title: data.work_title || '',
                        languages: data.languages || [],
                        dealbreakers: data.dealbreakers || [],
                        values: data.values || [],
                        family_plans: data.family_plans || '',
                        pets: data.pets || '',
                        fitness: data.fitness || '',
                    })
                }
                const { data: variantRows } = await supabase
                    .from('profile_variants')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                if (variantRows) {
                    const [approval, enabled] = await Promise.all([
                        fetchProfileVariantApprovals(),
                        fetchProfileVariantsEnabled(),
                    ])
                    setVariantsEnabled(enabled)
                    if (!approval.hasConfig) {
                        setVariants(variantRows)
                        setVariantPendingCount(0)
                    } else {
                        const approved = variantRows.filter((row: { id: string }) => approval.approvedIds.has(row.id))
                        setVariants(approved)
                        setVariantPendingCount(variantRows.length - approved.length)
                    }
                }
                setLoading(false)
            }
            void fetchProfile()
        }, 0)
        return () => clearTimeout(id)
    }, [user, supabase])
    const handleInputChange = (field: keyof ProfileData, value: ProfileData[keyof ProfileData]) => {
        setProfile((prev) => ({ ...prev, [field]: value }))
    }
    const handleSave = async () => {
        if (!user) return
        setSaving(true)
        try {
            const safeAge = Number.isFinite(profile.age) && profile.age > 0 ? profile.age : null
            const safeHeight = Number.isFinite(profile.height_cm || NaN) && (profile.height_cm || 0) > 0
                ? profile.height_cm
                : null
            const payload = {
                    id: user.id,
                    display_name: profile.display_name,
                    age: safeAge,
                    gender: profile.gender,
                    bio: profile.bio,
                    city: profile.city,
                    looking_for_genders: profile.looking_for_genders,
                    photos: profile.photos,
                    interests: profile.interests,
                    relationship_type: profile.relationship_type || null,
                    education: profile.education || null,
                    smoking: profile.smoking || null,
                    alcohol: profile.alcohol || null,
                    kids_status: profile.kids_status || null,
                    height_cm: safeHeight,
                    religion: profile.religion || null,
                    lifestyle: profile.lifestyle || null,
                    intent: profile.intent || null,
                    relationship_goal: profile.relationship_goal || null,
                    work_title: profile.work_title || null,
                    languages: profile.languages || [],
                    dealbreakers: profile.dealbreakers || [],
                    values: profile.values || [],
                    family_plans: profile.family_plans || null,
                    pets: profile.pets || null,
                    fitness: profile.fitness || null,
                }
            const cleanPayload = Object.fromEntries(
                Object.entries(payload).filter(([, value]) => value !== undefined)
            )
            const res = await fetch('/api/profile/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanPayload),
            })
            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || 'Save failed')
            }
            toast.push('Kaydedildi', 'success')
            router.push('/profile')
        } catch (error) {
            console.error('Error saving profile:', error)
            toast.push('Profil değişiklikleri kaydedilemedi.', 'error')
        } finally {
            setSaving(false)
        }
    }
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !user) return
        const originalFile = e.target.files[0]
        const fileName = `${user.id}/${Date.now()}.webp`
        setSaving(true)
        try {
            // Process image: Resize/Crop to 3:4 and convert to WebP
            const processedFile = await processImage(originalFile)
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, processedFile, {
                    contentType: 'image/webp',
                    upsert: true
                })
            if (uploadError) throw uploadError
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
            const publicUrl = data.publicUrl
            setProfile((prev) => ({
                ...prev,
                photos: [publicUrl, ...prev.photos].slice(0, 6),
            }))
        } catch (error) {
            console.error('Upload error:', error)
            toast.push('Fotoğraf yüklenemedi.', 'error')
        } finally {
            setSaving(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }
    const removePhoto = (photoUrl: string) => {
        setProfile((prev) => ({
            ...prev,
            photos: prev.photos.filter((p) => p !== photoUrl),
        }))
    }
    const createVariant = async () => {
        if (!user) return
        try {
            const photos = variantForm.photos
                .split(',')
                .map((p) => p.trim())
                .filter(Boolean)
            if (!variantsEnabled) {
                toast.push('Varyantlar admin tarafindan pasif durumda.', 'error')
                return
            }
            await supabase.from('profile_variants').insert({
                user_id: user.id,
                name: variantForm.name || null,
                bio: variantForm.bio || null,
                photos,
                is_active: false,
            })
            setVariantForm({ name: '', bio: '', photos: '' })
            const { data: variantRows } = await supabase
                .from('profile_variants')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
            if (variantRows) {
                const [approval, enabled] = await Promise.all([
                    fetchProfileVariantApprovals(),
                    fetchProfileVariantsEnabled(),
                ])
                setVariantsEnabled(enabled)
                if (!approval.hasConfig) {
                    setVariants(variantRows)
                    setVariantPendingCount(0)
                } else {
                    const approved = variantRows.filter((row: { id: string }) => approval.approvedIds.has(row.id))
                    setVariants(approved)
                    setVariantPendingCount(variantRows.length - approved.length)
                }
            }
            toast.push('Varyant admin onayina gonderildi.', 'success')
        } catch (err: unknown) {
            toast.push(err instanceof Error ? err.message : 'Varyant oluşturulamadı.', 'error')
        }
    }
    const setActiveVariant = async (id: string) => {
        if (!user) return
        if (!variantsEnabled) {
            toast.push('Varyantlar admin tarafindan pasif durumda.', 'error')
            return
        }
        await supabase.from('profile_variants').update({ is_active: false }).eq('user_id', user.id)
        await supabase.from('profile_variants').update({ is_active: true }).eq('id', id)
        const { data: variantRows } = await supabase
            .from('profile_variants')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        if (variantRows) {
            const [approval, enabled] = await Promise.all([
                fetchProfileVariantApprovals(),
                fetchProfileVariantsEnabled(),
            ])
            setVariantsEnabled(enabled)
            if (!approval.hasConfig) {
                setVariants(variantRows)
                setVariantPendingCount(0)
            } else {
                const approved = variantRows.filter((row: { id: string }) => approval.approvedIds.has(row.id))
                setVariants(approved)
                setVariantPendingCount(variantRows.length - approved.length)
            }
        }
    }
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    return (
        <div className="profile-edit-shell pb-24">
            <div className="profile-edit-header sticky top-0 z-50 bg-[var(--background)]/85 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <Button onClick={() => router.back()} variant="ghost" size="icon" className="-ml-2">
                    <ArrowLeft size={20} />
                </Button>
                <span className="font-bold">Profil Düzenle</span>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    variant="ghost"
                    size="sm"
                    className="text-pink-500 font-bold text-sm"
                >
                    {saving ? 'Kaydediliyor...' : 'Bitti'}
                </Button>
            </div>
            <div className="p-4 space-y-8">
                <section className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg">Fotoğraflar</h3>
                        <span className="text-xs text-gray-400">{profile.photos.length} / 6</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {profile.photos.map((url, index) => (
                            <div key={url + index} className="relative aspect-[3/4] rounded-xl overflow-hidden group bg-white/5">
                                <Image
                                    src={url}
                                    alt="Profil"
                                    fill
                                    sizes="(max-width: 768px) 33vw, 200px"
                                    className="object-cover"
                                />
                                <Button
                                    onClick={() => removePhoto(url)}
                                    variant="secondary"
                                    size="icon"
                                    className="absolute top-1 right-1 h-7 w-7 bg-black/50 text-white opacity-0 group-hover:opacity-100"
                                >
                                    <X size={14} />
                                </Button>
                                {index === 0 && (
                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-center py-1 text-white font-medium">
                                        Ana
                                    </div>
                                )}
                            </div>
                        ))}
                        {profile.photos.length < 6 && (
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                variant="ghost"
                                className="aspect-[3/4] h-auto rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                            >
                                <Plus size={24} />
                                <span className="text-xs font-medium">Fotoğraf Ekle</span>
                            </Button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoUpload}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>
                </section>
                <section className="space-y-4">
                    <h3 className="font-bold text-lg">Hakkında</h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Görünen Ad</label>
                            <Input
                                type="text"
                                value={profile.display_name}
                                onChange={(e) => handleInputChange('display_name', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 font-medium"
                                placeholder="Adın"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Biyografi</label>
                            <textarea
                                value={profile.bio || ''}
                                onChange={(e) => handleInputChange('bio', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all min-h-[100px] resize-none text-sm leading-relaxed"
                                placeholder="Kendinden kısaca bahset..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Niyet</label>
                                <select
                                    value={profile.intent || ''}
                                    onChange={(e) => handleInputChange('intent', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all appearance-none text-center"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="serious" className="bg-black">Ciddi</option>
                                    <option value="casual" className="bg-black">Gündelik</option>
                                    <option value="friendship" className="bg-black">Arkadaşlık</option>
                                    <option value="network" className="bg-black">Sosyal</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Hedef</label>
                                <select
                                    value={profile.relationship_goal || ''}
                                    onChange={(e) => handleInputChange('relationship_goal', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all appearance-none text-center"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="long_term" className="bg-black">Uzun vade</option>
                                    <option value="short_term" className="bg-black">Kısa vade</option>
                                    <option value="open_to_all" className="bg-black">Farketmez</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Yaş</label>
                                <Input
                                    type="number"
                                    value={profile.age || ''}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        handleInputChange('age', val ? parseInt(val, 10) : 0)
                                    }}
                                    className="w-full bg-white/5 border border-white/10 text-center"
                                    placeholder="18"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Cinsiyet</label>
                                <select
                                    value={profile.gender || ''}
                                    onChange={(e) => handleInputChange('gender', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all appearance-none text-center"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="Male" className="bg-black">Erkek</option>
                                    <option value="Female" className="bg-black">Kadın</option>
                                    <option value="Non-binary" className="bg-black">İkili olmayan</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Kimi Arıyorsun?</label>
                            <div className="flex gap-2">
                                {[
                                    { value: 'Male', label: 'Erkek' },
                                    { value: 'Female', label: 'Kadın' },
                                    { value: 'Non-binary', label: 'İkili olmayan' },
                                ].map((option) => {
                                    const selected = profile.looking_for_genders.includes(option.value)
                                    return (
                                        <Button
                                            key={`edit-looking-${option.value}`}
                                            type="button"
                                            onClick={() => {
                                                const exists = profile.looking_for_genders.includes(option.value)
                                                const next = exists
                                                    ? profile.looking_for_genders.filter((g) => g !== option.value)
                                                    : [...profile.looking_for_genders, option.value]
                                                handleInputChange('looking_for_genders', next)
                                            }}
                                            variant="secondary"
                                            className={`looking-for-btn flex-1 rounded-xl border px-4 py-3 text-sm transition-all ${selected
                                                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                                                : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                                                }`}
                                        >
                                            {option.label}
                                        </Button>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">İlişki Tipi</label>
                                <select
                                    value={profile.relationship_type || ''}
                                    onChange={(e) => handleInputChange('relationship_type', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all appearance-none text-center"
                                >
                                    <option value="" className="bg-black">Farketmez</option>
                                    <option value="serious" className="bg-black">Ciddi</option>
                                    <option value="casual" className="bg-black">Gündelik</option>
                                    <option value="friendship" className="bg-black">Arkadaşlık</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Boy (cm)</label>
                                <Input
                                    type="number"
                                    value={profile.height_cm || ''}
                                    onChange={(e) => {
                                        const val = e.target.value
                                        handleInputChange('height_cm', val ? parseInt(val, 10) : 0)
                                    }}
                                    className="w-full bg-white/5 border border-white/10 text-center"
                                    placeholder="170"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Meslek</label>
                            <Input
                                type="text"
                                value={profile.work_title || ''}
                                onChange={(e) => handleInputChange('work_title', e.target.value)}
                                className="w-full bg-white/5 border border-white/10"
                                placeholder="Örn: UI/UX Designer"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Aile</label>
                                <select
                                    value={profile.family_plans || ''}
                                    onChange={(e) => handleInputChange('family_plans', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="want" className="bg-black">İstiyorum</option>
                                    <option value="dont_want" className="bg-black">İstemiyorum</option>
                                    <option value="maybe" className="bg-black">Belki</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Evcil</label>
                                <select
                                    value={profile.pets || ''}
                                    onChange={(e) => handleInputChange('pets', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="have" className="bg-black">Var</option>
                                    <option value="want" className="bg-black">İsterim</option>
                                    <option value="no" className="bg-black">Yok</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Fitness</label>
                                <select
                                    value={profile.fitness || ''}
                                    onChange={(e) => handleInputChange('fitness', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="active" className="bg-black">Aktif</option>
                                    <option value="sometimes" className="bg-black">Ara sıra</option>
                                    <option value="rare" className="bg-black">Nadiren</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Eğitim</label>
                                <select
                                    value={profile.education || ''}
                                    onChange={(e) => handleInputChange('education', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="high_school" className="bg-black">Lise</option>
                                    <option value="university" className="bg-black">Üniversite</option>
                                    <option value="masters" className="bg-black">Yüksek Lisans</option>
                                    <option value="phd" className="bg-black">Doktora</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Yaşam Tarzı</label>
                                <select
                                    value={profile.lifestyle || ''}
                                    onChange={(e) => handleInputChange('lifestyle', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="active" className="bg-black">Aktif</option>
                                    <option value="calm" className="bg-black">Sakin</option>
                                    <option value="nightlife" className="bg-black">Gece hayatı</option>
                                    <option value="home" className="bg-black">Ev odaklı</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Sigara</label>
                                <select
                                    value={profile.smoking || ''}
                                    onChange={(e) => handleInputChange('smoking', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="no" className="bg-black">Hayır</option>
                                    <option value="sometimes" className="bg-black">Ara sıra</option>
                                    <option value="yes" className="bg-black">Evet</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Alkol</label>
                                <select
                                    value={profile.alcohol || ''}
                                    onChange={(e) => handleInputChange('alcohol', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="no" className="bg-black">Hayır</option>
                                    <option value="sometimes" className="bg-black">Ara sıra</option>
                                    <option value="yes" className="bg-black">Evet</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Çocuk</label>
                                <select
                                    value={profile.kids_status || ''}
                                    onChange={(e) => handleInputChange('kids_status', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="no" className="bg-black">Yok</option>
                                    <option value="have" className="bg-black">Var</option>
                                    <option value="want" className="bg-black">İstiyor</option>
                                    <option value="dont_want" className="bg-black">İstemiyor</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Din</label>
                                <select
                                    value={profile.religion || ''}
                                    onChange={(e) => handleInputChange('religion', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                                >
                                    <option value="" className="bg-black">Seç</option>
                                    <option value="muslim" className="bg-black">Müslüman</option>
                                    <option value="christian" className="bg-black">Hristiyan</option>
                                    <option value="jewish" className="bg-black">Yahudi</option>
                                    <option value="atheist" className="bg-black">Ateist</option>
                                    <option value="other" className="bg-black">Diğer</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Diller (virgül ile)</label>
                            <Input
                                type="text"
                                value={(profile.languages || []).join(', ')}
                                onChange={(e) => handleInputChange('languages', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                                className="w-full bg-white/5 border border-white/10"
                                placeholder="Türkçe, İngilizce"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Değerler (virgül ile)</label>
                            <Input
                                type="text"
                                value={(profile.values || []).join(', ')}
                                onChange={(e) => handleInputChange('values', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                                className="w-full bg-white/5 border border-white/10"
                                placeholder="Dürüstlük, Mizah, Aile"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Kırmızı çizgiler (virgül ile)</label>
                            <Input
                                type="text"
                                value={(profile.dealbreakers || []).join(', ')}
                                onChange={(e) => handleInputChange('dealbreakers', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                                className="w-full bg-white/5 border border-white/10"
                                placeholder="Sigara, Uzak mesafe"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase text-gray-500 font-semibold tracking-wider">Şehir</label>
                            <div className="relative">
                                <select
                                    value={profile.city || ''}
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 pl-10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500/50 transition-all appearance-none"
                                >
                                    <option value="" className="bg-black">Şehir seç</option>
                                    {CITY_OPTIONS.map((city) => (
                                        <option key={city} value={city} className="bg-black">{city}</option>
                                    ))}
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                    <MapPin size={16} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                {variantsEnabled && (
                    <section className="space-y-4">
                        <h3 className="font-bold text-lg">Profil Varyantları</h3>
                        <p className="text-xs text-gray-400">Farklı biyografi ve fotoğraf setleri oluşturup birini aktif edebilirsin.</p>
                        {variantPendingCount > 0 && (
                            <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                {variantPendingCount} varyant admin onayi bekliyor.
                            </div>
                        )}
                    <div className="glass-panel p-4 rounded-2xl space-y-3">
                        <Input
                            value={variantForm.name}
                            onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                            placeholder="Varyant adı"
                            className="w-full bg-white/5 border border-white/10"
                        />
                        <textarea
                            value={variantForm.bio}
                            onChange={(e) => setVariantForm({ ...variantForm, bio: e.target.value })}
                            placeholder="Varyant biyografi"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-h-[80px]"
                        />
                        <Input
                            value={variantForm.photos}
                            onChange={(e) => setVariantForm({ ...variantForm, photos: e.target.value })}
                            placeholder="Foto URL (virgül ile)"
                            className="w-full bg-white/5 border border-white/10"
                        />
                        <Button
                            onClick={createVariant}
                            variant="secondary"
                            className="w-full text-sm"
                            disabled={!variantsEnabled}
                        >
                            Varyant Ekle
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {variants.map((v) => (
                            <div key={v.id} className="glass-panel p-3 rounded-2xl flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">{v.name || 'Varyant'}</div>
                                    <div className="text-xs text-gray-400">{v.is_active ? 'Aktif' : 'Pasif'}</div>
                                </div>
                                <Button
                                    onClick={() => setActiveVariant(v.id)}
                                    variant="secondary"
                                    size="sm"
                                    className="text-xs"
                                    disabled={!variantsEnabled}
                                >
                                    Aktif Et
                                </Button>
                            </div>
                        ))}
                    </div>
                    </section>
                )}
            </div>
        </div>
    )
}
