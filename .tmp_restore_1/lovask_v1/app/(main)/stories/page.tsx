'use client'
import { useEffect, useRef, useState } from 'react'
import { useStories } from '@/hooks/useStories'
import { useAuthStore } from '@/store/useAuthStore'
import Image from 'next/image'
import { Plus, Play, Clock } from 'lucide-react'
import Link from 'next/link'
import { getProfileAvatar } from '@/utils/avatar'
import { getPublicImageVariant } from '@/utils/media'
import { Button } from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
export default function StoriesPage() {
    const { stories, isLoading, uploadStory, isUploading } = useStories()
    const { user } = useAuthStore()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [now, setNow] = useState(0)
    const handleUpload = async (file: File) => {
        setError(null)
        try {
            await uploadStory(file)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Hikaye yüklenemedi.')
        }
    }
    const getRemaining = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - now
        const hours = Math.max(0, Math.ceil(diff / (1000 * 60 * 60)))
        return `${hours} saat`
    }
    useEffect(() => {
        const tick = () => setNow(Date.now())
        const id = setTimeout(tick, 0)
        const timer = setInterval(tick, 60000)
        return () => {
            clearTimeout(id)
            clearInterval(timer)
        }
    }, [])
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center justify-between">
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!user || isUploading}
                    variant="secondary"
                    size="sm"
                    className="text-xs font-semibold flex items-center gap-2"
                >
                    <Plus size={14} />
                    Hikaye Ekle
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUpload(file)
                        e.currentTarget.value = ''
                    }}
                />
            </div>
            {error && (
                <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg">
                    {error}
                </div>
            )}
            {stories.filter((s) => s.highlight).length > 0 && (
                <div className="space-y-3">
                    <div className="text-sm font-semibold text-yellow-300">Öne Çıkanlar</div>
                    <div className="grid grid-cols-2 gap-4">
                        {stories.filter((s) => s.highlight).map((story) => {
                            const avatar = getProfileAvatar(story.profiles)
                            return (
                                <Link
                                    key={story.id}
                                    href={`/stories/${story.id}`}
                                    className="glass-panel rounded-2xl overflow-hidden border border-yellow-500/30"
                                >
                                    <div className="relative w-full h-40">
                                        {story.media_type === 'video' ? (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Play size={24} className="text-white" />
                                            </div>
                                        ) : (
                                            <Image
                                                src={getPublicImageVariant(story.media_url, { width: 360, height: 480, quality: 70 })}
                                                alt="Hikaye"
                                                fill
                                                className="object-cover"
                                            />
                                        )}
                                        <div className="absolute top-2 right-2 text-[10px] bg-black/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Clock size={10} /> {getRemaining(story.expires_at)}
                                        </div>
                                    </div>
                                    <div className="p-3 flex items-center gap-2">
                                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-yellow-500">
                                            <Image src={avatar} alt="Kullanıcı" fill className="object-cover" />
                                        </div>
                                        <div className="text-sm font-semibold truncate">
                                            {story.profiles?.display_name || 'Kullanıcı'}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}
            <div className="space-y-3">
                <div className="text-sm font-semibold">Tüm Hikayeler</div>
                <div className="grid grid-cols-2 gap-4">
                    {stories.filter((s) => !s.highlight).map((story) => {
                        const avatar = getProfileAvatar(story.profiles)
                        return (
                            <Link
                                key={story.id}
                                href={`/stories/${story.id}`}
                                className="glass-panel rounded-2xl overflow-hidden border border-white/10"
                            >
                                <div className="relative w-full h-40">
                                    {story.media_type === 'video' ? (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Play size={24} className="text-white" />
                                        </div>
                                    ) : (
                                            <Image
                                                src={getPublicImageVariant(story.media_url, { width: 360, height: 480, quality: 70 })}
                                                alt="Hikaye"
                                                fill
                                                className="object-cover"
                                            />
                                    )}
                                    <div className="absolute top-2 right-2 text-[10px] bg-black/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Clock size={10} /> {getRemaining(story.expires_at)}
                                    </div>
                                </div>
                                <div className="p-3 flex items-center gap-2">
                                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-pink-500">
                                        <Image src={avatar} alt="Kullanıcı" fill className="object-cover" />
                                    </div>
                                    <div className="text-sm font-semibold truncate">
                                        {story.profiles?.display_name || 'Kullanıcı'}
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}