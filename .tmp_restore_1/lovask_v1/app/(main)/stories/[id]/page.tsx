'use client'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useStories } from '@/hooks/useStories'
import { useAuthStore } from '@/store/useAuthStore'
import Image from 'next/image'
import { Eye, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEconomy } from '@/hooks/useEconomy'
import { Button } from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
type StoryRecord = {
    id: string
    user_id: string
    media_url: string
    media_type: 'image' | 'video'
    highlight?: boolean | null
}
type StoryViewRow = {
    viewer_id: string
    created_at: string
}
type StoryProfile = {
    id: string
    display_name: string | null
    photos: unknown
}
export default function StoryViewerPage() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuthStore()
    const { recordView } = useStories()
    const { isPremium } = useEconomy()
    const [loading, setLoading] = useState(true)
    const [story, setStory] = useState<StoryRecord | null>(null)
    const [views, setViews] = useState<StoryViewRow[]>([])
    const [viewProfiles, setViewProfiles] = useState<Record<string, StoryProfile>>({})
    const viewRecordedRef = useRef<string | null>(null)
    const router = useRouter()
    const supabase = createClient()
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const load = async () => {
                if (!id) return
                const { data, error } = await supabase
                    .from('stories')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle()
                if (!error && data) {
                    setStory(data)
                    if (user && viewRecordedRef.current !== id) {
                        try {
                            await recordView(id)
                            viewRecordedRef.current = id
                        } catch {
                            // Ignore duplicate/permission edge cases so viewer doesn't break.
                        }
                    }
                    if (user && data.user_id === user.id) {
                        const { data: viewRows } = await supabase
                            .from('story_views')
                            .select('viewer_id, created_at')
                            .eq('story_id', id)
                            .order('created_at', { ascending: false })
                        const rows = viewRows || []
                        setViews(rows)
                        const ids = Array.from(new Set(rows.map((v: StoryViewRow) => v.viewer_id)))
                        if (ids.length > 0) {
                            const { data: profiles } = await supabase
                                .from('profiles')
                                .select('id, display_name, photos')
                                .in('id', ids)
                            const map: Record<string, StoryProfile> = {}
                            ;(profiles || []).forEach((p: StoryProfile) => (map[p.id] = p))
                            setViewProfiles(map)
                        }
                    }
                }
                setLoading(false)
            }
            void load()
        }, 0)
        return () => clearTimeout(timeoutId)
    }, [id, user, recordView, supabase])
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    if (!story) {
        return <div className="text-center text-gray-400 py-12">Hikaye bulunamadı</div>
    }
    const isOwner = user?.id === story.user_id
    return (
        <div className="space-y-6 pb-8">
            <div className="flex items-center gap-2">
                <Button
                    onClick={() => router.back()}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                >
                    Geri
                </Button>
                {isOwner && isPremium && (
                    <Button
                        onClick={async () => {
                            const next = !story.highlight
                            await supabase.from('stories').update({ highlight: next }).eq('id', story.id)
                            setStory({ ...story, highlight: next })
                        }}
                        variant="secondary"
                        size="sm"
                        className="text-xs flex items-center gap-2 bg-yellow-500/20"
                    >
                        <Star size={12} className="text-yellow-300" />
                        {story.highlight ? 'Öne çıkarıldı' : 'Öne çıkar'}
                    </Button>
                )}
            </div>
            <div className="relative w-full h-[70vh] rounded-3xl overflow-hidden border border-white/10">
                {story.media_type === 'video' ? (
                    <video src={story.media_url} controls className="w-full h-full object-cover" />
                ) : (
                    <Image src={story.media_url} alt="Hikaye" fill className="object-cover" />
                )}
            </div>
            {isOwner && (
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Eye size={14} className="text-emerald-300" />
                        Görüntüleyenler
                    </div>
                    {views.length === 0 ? (
                        <div className="text-xs text-gray-400 mt-2">Henüz görüntüleyen yok.</div>
                    ) : (
                        <div className="space-y-2 mt-3">
                            {views.map((v, idx: number) => {
                                const p = viewProfiles[v.viewer_id]
                                return (
                                    <div key={`${v.viewer_id}-${idx}`} className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                                        <div>
                                            <div className="font-semibold">{p?.display_name || 'Kullanıcı'}</div>
                                            <div className="text-xs text-gray-400">{new Date(v.created_at).toLocaleString()}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}