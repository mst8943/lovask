'use client'
import { Profile } from '@/services/feedService'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Heart, X, MapPin } from 'lucide-react'
import { getProfileAvatar } from '@/utils/avatar'
import { Button } from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
interface ProfileCardProps {
    profile: Profile
    onLike: () => void
    onPass: () => void
    disabled?: boolean
}
export default function ProfileCard({ profile, onLike, onPass, disabled }: ProfileCardProps) {
    const photoUrl = getProfileAvatar(profile)
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
                    </h2>
                    <div className="flex items-center gap-1 text-gray-300 text-sm mt-1">
                        <MapPin size={14} />
                        <span>{profile.city}</span>
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
