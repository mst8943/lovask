'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart, MapPin, Star, Circle, X } from 'lucide-react'
import { ProfileWithMeta } from '@/services/feedService'
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { getProfileAvatar } from '@/utils/avatar'
import { Button } from '@/components/ui/Button'
import { usePresenceStore } from '@/store/usePresenceStore'

type ProfileListItemProps = {
    profile: ProfileWithMeta
    isFavorited: boolean
    onFavorite: () => void
    onLike: () => void
    onSuperLike: () => void
    onPass: () => void
    disabled?: boolean
}

export default function ProfileListItem({
    profile,
    isFavorited,
    onFavorite,
    onLike,
    onSuperLike,
    onPass,
    disabled,
}: ProfileListItemProps) {
    const photoUrl = getProfileAvatar(profile)

    const [now, setNow] = useState(() => Date.now())
    const isOnlineRealtime = usePresenceStore((s) => s.isUserOnline(profile.id))
    const lastActive = profile.last_active_at ? new Date(profile.last_active_at).getTime() : 0
    const isOnlineFallback = !!lastActive && now - lastActive < 10 * 60 * 1000
    const isOnline = isOnlineRealtime || isOnlineFallback

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60000)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="glass-panel rounded-2xl p-4 flex gap-4">
            <div className="relative w-24 h-28 rounded-xl overflow-hidden shrink-0 border border-white/10">
                <Image src={photoUrl} alt={profile.display_name || 'Kullanıcı'} fill className="object-cover" />
                {isOnline && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-green-300">
                        <Circle size={8} className="fill-green-400 text-green-400" />
                        Çevrim içi
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                    <Link href={`/profiles/${profile.id}`} className="min-w-0">
                        <h3 className="text-lg font-bold truncate">
                            {profile.display_name}
                            {profile.age ? <span className="opacity-70 font-normal">, {profile.age}</span> : null}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <MapPin size={12} />
                            <span className="truncate">{profile.city || 'Bilinmiyor'}</span>
                            {typeof profile.distance_km === 'number' && (
                                <span className="ml-2 text-[10px] text-gray-500">
                                    {profile.distance_km.toFixed(0)} km
                                </span>
                            )}
                        </div>
                    </Link>

                    {profile.is_premium && (
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                            <Star size={12} className="fill-yellow-400" />
                            Premium
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                    {profile.is_verified && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                            Doğrulandı
                        </span>
                    )}
                    {typeof profile.compatibility_score === 'number' && profile.compatibility_score > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Uyum {profile.compatibility_score}%
                        </span>
                    )}
                </div>

                {profile.bio && (
                    <p className="text-sm text-gray-300 mt-2 line-clamp-2">{profile.bio}</p>
                )}

                <div className="flex flex-wrap gap-2 mt-2">
                    {profile.interests?.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="px-2 py-1 bg-white/10 rounded-full text-[10px] font-semibold text-white"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="flex items-center gap-2 mt-3">
                    <Button
                        type="button"
                        onClick={onPass}
                        disabled={disabled}
                        variant="secondary"
                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-red-400 text-xs font-semibold"
                    >
                        <X size={14} />
                    </Button>
                    <Button
                        type="button"
                        onClick={onLike}
                        disabled={disabled}
                        className="px-3 py-2 rounded-lg text-white text-xs font-semibold"
                    >
                        Beğen
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onSuperLike}
                        disabled={disabled}
                        className="px-3 py-2 rounded-lg bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-500/40"
                    >
                        <Star size={14} className="inline-block mr-1" />
                        Süper
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onFavorite}
                        disabled={disabled}
                        className={clsx(
                            'ml-auto px-3 py-2 rounded-lg text-xs font-semibold border',
                            isFavorited
                                ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                                : 'bg-white/5 border-white/10 text-gray-300'
                        )}
                    >
                        <Heart size={14} className={clsx(isFavorited && 'fill-current')} />
                    </Button>
                </div>
            </div>
        </div>
    )
}
