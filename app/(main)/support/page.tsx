'use client'
import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { createSupportTicket, fetchMySupportTickets, SupportTicket } from '@/services/supportService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
export default function SupportPage() {
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [tickets, setTickets] = useState<SupportTicket[]>([])
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const loadData = useCallback(async (userId: string) => {
        setLoading(true)
        const rows = await fetchMySupportTickets(userId)
        setTickets(rows)
        setLoading(false)
    }, [])
    useEffect(() => {
        if (!user) return
        const id = setTimeout(() => {
            void loadData(user.id)
        }, 0)
        return () => clearTimeout(id)
    }, [loadData, user])
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user || !subject.trim() || !message.trim()) return
        setSending(true)
        try {
            await createSupportTicket({
                user_id: user.id,
                subject: subject.trim(),
                message: message.trim(),
            })
            setSubject('')
            setMessage('')
            await loadData(user.id)
        } finally {
            setSending(false)
        }
    }
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    return (
        <div className="space-y-6 pb-8">
            <form onSubmit={handleSubmit} className="glass-panel p-4 rounded-2xl space-y-3">
                <div className="text-sm font-semibold">Destek talebi oluştur</div>
                <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Konu"
                />
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mesajın"
                    rows={4}
                    className="glass-input w-full px-4 py-3 rounded-xl border border-white/10"
                />
                <Button
                    type="submit"
                    disabled={sending}
                    className="w-full"
                >
                    {sending ? 'Gönderiliyor...' : 'Gönder'}
                </Button>
            </form>
            <div className="glass-panel p-4 rounded-2xl space-y-3">
                <div className="text-sm font-semibold">Taleplerim</div>
                {tickets.length === 0 ? (
                    <div className="text-xs text-gray-400">Henüz destek talebi yok.</div>
                ) : (
                    <div className="space-y-2">
                        {tickets.map((t) => (
                            <div key={t.id} className="bg-white/5 rounded-xl p-3">
                                <div className="flex items-center justify-between">
                                    <div className="font-semibold text-sm">{t.subject}</div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-white/10">{t.status}</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{t.message}</div>
                                {t.admin_note && <div className="text-xs text-emerald-300 mt-2">Not: {t.admin_note}</div>}
                                <div className="text-[10px] text-gray-500 mt-2">
                                    {new Date(t.created_at).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}