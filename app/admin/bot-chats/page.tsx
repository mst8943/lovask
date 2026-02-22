'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type MatchRow = {
    id: string
    user_a: string
    user_b: string
    created_at: string
}

type ProfileRow = {
    id: string
    display_name: string | null
    photos: string[] | null
    is_bot?: boolean | null
}

type MessageRow = {
    id: string
    match_id: string
    sender_id: string
    content: string | null
    media_url: string | null
    type: string | null
    created_at: string
}

export default function AdminBotChatsPage() {
    const supabase = useMemo(() => createClient(), [])
    const [matches, setMatches] = useState<MatchRow[]>([])
    const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({})
    const [selectedMatch, setSelectedMatch] = useState<MatchRow | null>(null)
    const [messages, setMessages] = useState<MessageRow[]>([])
    const [aiEnabled, setAiEnabled] = useState(true)
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [text, setText] = useState('')

    const loadMatches = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const { data: bots } = await supabase
                .from('profiles')
                .select('id,display_name,photos,is_bot')
                .eq('is_bot', true)

            const botIdList = (bots || []).map((b) => b.id)
            if (botIdList.length === 0) {
                setMatches([])
                setProfiles({})
                setLoading(false)
                return
            }

            const { data: matchRows, error: matchError } = await supabase
                .from('matches')
                .select('*')
                .or(`user_a.in.(${botIdList.join(',')}),user_b.in.(${botIdList.join(',')})`)
                .order('created_at', { ascending: false })

            if (matchError) throw matchError
            const rows = matchRows || []

            const ids = new Set<string>()
            botIdList.forEach((id) => ids.add(id))
            rows.forEach((m) => {
                ids.add(m.user_a)
                ids.add(m.user_b)
            })

            const { data: allProfiles } = await supabase
                .from('profiles')
                .select('id,display_name,photos,is_bot')
                .in('id', Array.from(ids))

            const map: Record<string, ProfileRow> = {}
            for (const p of allProfiles || []) map[p.id] = p as ProfileRow

            setProfiles(map)
            setMatches(rows)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load automation matches.')
        } finally {
            setLoading(false)
        }
    }, [supabase])

    const loadMessages = async (matchId: string) => {
        setError(null)
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('match_id', matchId)
            .order('created_at', { ascending: true })

        if (error) {
            setError(error.message)
            return
        }
        setMessages(data || [])

        const { data: override } = await supabase
            .from('bot_chat_overrides')
            .select('ai_enabled')
            .eq('match_id', matchId)
            .maybeSingle()
        setAiEnabled(override?.ai_enabled !== false)
    }

    const handleSelect = async (match: MatchRow) => {
        setSelectedMatch(match)
        await loadMessages(match.id)
    }

    const toggleAi = async () => {
        if (!selectedMatch) return
        const next = !aiEnabled
        setAiEnabled(next)
        await fetch('/api/admin/bot-chat/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ match_id: selectedMatch.id, ai_enabled: next }),
        })
    }

    const sendAsBot = async () => {
        if (!selectedMatch || !text.trim()) return
        setSending(true)
        try {
            const res = await fetch('/api/admin/bot-chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ match_id: selectedMatch.id, content: text.trim() }),
            })
            if (!res.ok) {
                throw new Error(await res.text())
            }
            setText('')
            await loadMessages(selectedMatch.id)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'G?nderilemedi.')
        } finally {
            setSending(false)
        }
    }

    useEffect(() => {
        const id = setTimeout(() => {
            void loadMatches()
        }, 0)
        return () => clearTimeout(id)
    }, [loadMatches])

    const displayName = (id: string) => profiles[id]?.display_name || id.slice(0, 6)

    const getBotId = (match: MatchRow) => {
        if (profiles[match.user_a]?.is_bot) return match.user_a
        if (profiles[match.user_b]?.is_bot) return match.user_b
        return null
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Sohbetleri</h1>
                    <p className="text-sm text-gray-400">Bot mesajlarini izle ve yonet</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                    Moderasyon
                </div>
            </div>

            {error && (
                <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                <div className="glass-panel p-3 rounded-2xl space-y-2 max-h-[70vh] overflow-auto border border-white/10">
                    {loading && <div className="text-sm text-gray-400">Yükleniyor...</div>}
                    {!loading && matches.length === 0 && (
                        <div className="text-sm text-gray-400">Henüz Bot eşleşmesi yok.</div>
                    )}
                    {matches.map((m) => {
                        const botId = getBotId(m)
                        const otherId = botId === m.user_a ? m.user_b : m.user_a
                        return (
                            <button
                                key={m.id}
                                onClick={() => handleSelect(m)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedMatch?.id === m.id ? 'bg-white/15' : 'bg-white/5 hover:bg-white/10'}`}
                            >
                                <div className="font-semibold">{displayName(botId || '')}</div>
                                <div className="text-xs text-gray-400">Kullanıcı: {displayName(otherId)}</div>
                            </button>
                        )
                    })}
                </div>

                <div className="glass-panel p-4 rounded-2xl min-h-[60vh] flex flex-col border border-white/10">
                    {!selectedMatch && (
                        <div className="text-sm text-gray-400">Mesajları görmek için sohbet seç.</div>
                    )}
                    {selectedMatch && (
                        <>
                            <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                <div className="text-sm">
                                    Bot: <span className="font-semibold">{displayName(getBotId(selectedMatch) || '')}</span>
                                </div>
                                <button onClick={toggleAi} className="text-xs px-3 py-1 rounded-full bg-white/10">
                                    {aiEnabled ? 'AI A??k' : 'AI Kapal?'}
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto space-y-2 py-3">
                                {messages.map((msg) => (
                                    <div key={msg.id} className="text-sm">
                                        <span className="text-gray-400">{displayName(msg.sender_id)}:</span>{' '}
                                        <span>{msg.content || (msg.type === 'image' ? 'Bir g?rsel g?nderildi' : '')}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-2 border-t border-white/10 flex gap-2">
                                <input
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Bot olarak gonder..."
                                    className="flex-1 px-3 py-2 bg-black/20 border border-white/10 rounded-lg"
                                />
                                <button
                                    onClick={sendAsBot}
                                    disabled={sending}
                                    className="px-4 py-2 rounded-lg bg-white/10"
                                >
                                    {sending ? '...' : 'G?nder'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}




