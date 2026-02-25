'use client'
import { ProfileWithMeta } from '@/services/feedService'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Heart, X, MapPin, ShieldCheck, Smartphone, Camera, IdCard, Video } from 'lucide-react'
import { getProfileAvatar } from '@/utils/avatar'
import { getLocationLabel } from '@/utils/location'
import { Button } from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
interface ProfileCardProps {
    profile: ProfileWithMeta
    onLike: () => void
    onPass: () => void
    disabled?: boolean
}
export default function ProfileCard({ profile, onLike, onPass, disabled }: ProfileCardProps) {
    const photoUrl = getProfileAvatar(profile)
    const verificationMeta: Record<string, { label: string; icon: typeof ShieldCheck }> = {
        device: { label: 'Cihaz', icon: Smartphone },
        photo: { label: 'Fotoğraf', icon: Camera },
        selfie: { label: 'Fotoğraf', icon: Camera },
        kyc: { label: 'Kimlik', icon: IdCard },
        video: { label: 'Video', icon: Video },
        email: { label: 'E-posta', icon: ShieldCheck },
    }
    const verifiedTypes = Array.from(new Set((profile.verified_types || []).map((t) => (t === 'selfie' ? 'photo' : t))))
    return (
        <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0, x: 100 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative w-full aspect-[3/4] max-h-[70vh] rounded-3xl overflow-hidden glass-card shadow-2xl"
        >
            <Image
                src={photoUrl}
                alt={profile.display_name || 'Kullanıcı'}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover pointer-events-none"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-4">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-end gap-2">
                        {profile.display_name}
                        <span className="text-xl font-normal opacity-80">{profile.age}</span>
                        {verifiedTypes.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-300">
                                {verifiedTypes.slice(0, 4).map((type) => {
                                    const meta = verificationMeta[type]
                                    const Icon = meta?.icon || ShieldCheck
                                    return (
                                        <span key={type} title={meta?.label || type}>
                                            <Icon size={16} />
                                        </span>
                                    )
                                })}
                            </span>
                        ) : profile.is_verified ? (
                            <span title="Doğrulanmış">
                                <ShieldCheck size={18} className="text-emerald-300" />
                            </span>
                        ) : null}
                    </h2>
                    <div className="flex items-center gap-1 text-gray-300 text-sm mt-1">
                        <MapPin size={14} />
                        <span>{getLocationLabel(profile)}</span>
                    </div>
                    {profile.bio && (
                        <p className="text-gray-300 text-sm mt-3 line-clamp-2">
                            {profile.bio}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                        {profile.interests?.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-white">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between gap-4 pt-2">
                    <Button
                        onClick={onPass}
                        disabled={disabled}
                        variant="secondary"
                        size="lg"
                        className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 text-red-500 hover:bg-red-500/10"
                    >
                        <X size={28} />
                    </Button>
                    <Button
                        onClick={onLike}
                        disabled={disabled}
                        size="lg"
                        className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95"
                    >
                        {disabled ? <Spinner className="animate-spin" /> : <Heart size={28} fill="currentColor" />}
                    </Button>
                </div>
            </div>
        </motion.div>
    )
}
