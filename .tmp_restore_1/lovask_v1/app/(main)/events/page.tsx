'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, MapPin, Users, Sparkles } from 'lucide-react'
import { fetchEventParticipants, fetchEvents, joinEvent, EventItem } from '@/services/eventService'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuthStore } from '@/store/useAuthStore'
import Image from 'next/image'
import Link from 'next/link'
import { getProfileAvatar } from '@/utils/avatar'

export default function EventsPage() {
    const [events, setEvents] = useState<EventItem[]>([])
    const [loading, setLoading] = useState(true)
    const [joiningId, setJoiningId] = useState<string | null>(null)
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
    const [participants, setParticipants] = useState<Array<{
        user_id: string
        status: 'going' | 'maybe' | 'not_going'
        created_at: string
        profiles?: {
            id: string
            display_name: string | null
            age: number | null
            city: string | null
            photos: string[] | null
            is_verified: boolean | null
            is_bot: boolean | null
        } | null
    }>>([])
    const [participantsLoading, setParticipantsLoading] = useState(false)
    const { user } = useAuthStore()
    const toast = useToast()

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchEvents()
                setEvents(data)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const loadParticipants = useCallback(async (eventId: string) => {
        setParticipantsLoading(true)
        try {
            const rows = await fetchEventParticipants(eventId)
            setParticipants(rows)
        } finally {
            setParticipantsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!selectedEventId) {
            setParticipants([])
            return
        }
        void loadParticipants(selectedEventId)
    }, [loadParticipants, selectedEventId])

    const recommendedParticipants = useMemo(() => {
        return participants
            .filter((p) => p.profiles && p.user_id !== user?.id)
            .slice(0, 8)
    }, [participants, user?.id])

    const refreshCounts = useCallback(async () => {
        const data = await fetchEvents()
        setEvents(data)
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh] text-sm text-gray-400">
                Etkinlikler yukleniyor...
            </div>
        )
    }

    return (
        <div className="space-y-4 pb-8">
            <div className="glass-panel p-4 rounded-2xl">
                <div className="text-sm font-semibold">Tema ve etkinlikler</div>
                <div className="text-xs text-gray-400">Ortak ilgi alanlariyla esles.</div>
            </div>

            {events.length === 0 && (
                <div className="text-sm text-gray-400 text-center">Aktif etkinlik yok.</div>
            )}

            <div className="space-y-3">
                {events.map((event) => (
                    <div key={event.id} className="glass-panel p-4 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Calendar size={14} className="text-pink-300" />
                            {event.title}
                        </div>
                        {event.description && (
                            <div className="text-xs text-gray-400">{event.description}</div>
                        )}
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                            <MapPin size={12} />
                            {event.category || 'Genel'}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-2">
                            <Users size={12} />
                            {event.participants_count || 0} katilimci
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                className="text-xs"
                                onClick={async () => {
                                    setJoiningId(event.id)
                                    try {
                                        await joinEvent(event.id, 'going')
                                        toast.push('Etkinlige katildin.', 'success')
                                        await refreshCounts()
                                    } finally {
                                        setJoiningId(null)
                                    }
                                }}
                                disabled={joiningId === event.id}
                            >
                                {joiningId === event.id ? 'Kaydediliyor...' : 'Katiliyorum'}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="text-xs"
                                onClick={async () => {
                                    setJoiningId(event.id)
                                    try {
                                        await joinEvent(event.id, 'maybe')
                                        toast.push('Belki olarak kaydedildi.', 'success')
                                        await refreshCounts()
                                    } finally {
                                        setJoiningId(null)
                                    }
                                }}
                                disabled={joiningId === event.id}
                            >
                                Belki
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                    setSelectedEventId((prev) => (prev === event.id ? null : event.id))
                                }}
                            >
                                {selectedEventId === event.id ? 'Kapat' : 'Katilimcilar'}
                            </Button>
                        </div>

                        {selectedEventId === event.id && (
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Sparkles size={12} />
                                    Etkinlikten önerilen profiller
                                </div>
                                {participantsLoading ? (
                                    <div className="text-xs text-gray-500">Katilimcilar yukleniyor...</div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        {recommendedParticipants.length === 0 && (
                                            <div className="text-xs text-gray-500 col-span-2 sm:col-span-3">
                                                Henuz katilimci yok.
                                            </div>
                                        )}
                                        {recommendedParticipants.map((row) => {
                                            const profile = row.profiles
                                            if (!profile) return null
                                            const avatar = getProfileAvatar(profile)
                                            return (
                                                <Link
                                                    key={row.user_id}
                                                    href={`/profiles/${row.user_id}`}
                                                    className="glass-panel p-3 rounded-xl border border-white/10 hover:border-white/20"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10">
                                                            <Image src={avatar} alt={profile.display_name || 'Kullanici'} fill className="object-cover" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold truncate">
                                                                {profile.display_name || 'Kullanici'}
                                                            </div>
                                                            <div className="text-[11px] text-gray-400 truncate">
                                                                {profile.age ? `${profile.age} • ` : ''}{profile.city || '—'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
