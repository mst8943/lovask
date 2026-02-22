'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchGifts, fetchGiftHistory, Gift, GiftSend } from '@/services/giftService'
import { Gift as GiftIcon } from 'lucide-react'
import { getGiftStickerUrl } from '@/lib/giftStickers'
import Image from 'next/image'
import Spinner from '@/components/ui/Spinner'
export default function GiftsPage() {
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [gifts, setGifts] = useState<Gift[]>([])
    const [history, setHistory] = useState<GiftSend[]>([])
    useEffect(() => {
        const loadData = async () => {
            if (!user) return
            setLoading(true)
            const [g, h] = await Promise.all([
                fetchGifts(),
                fetchGiftHistory(user.id),
            ])
            setGifts(g)
            setHistory(h)
            setLoading(false)
        }
        loadData()
    }, [user])
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    return (
        <div className="space-y-6 pb-8">
            <div className="glass-panel p-4 rounded-2xl">
                <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <GiftIcon size={16} className="text-pink-400" />
                    Hediye Listesi
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {gifts.map((g) => (
                        <div key={g.id} className="bg-white/5 rounded-xl p-3">
                            <Image
                                src={getGiftStickerUrl(g.name) || g.image_url || '/placeholder-user.jpg'}
                                alt={g.name}
                                width={320}
                                height={192}
                                className="w-full h-24 rounded-lg object-cover mb-2"
                            />
                            <div className="text-sm font-semibold">{g.name}</div>
                            <div className="text-xs text-gray-400">{g.price} jeton</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="glass-panel p-4 rounded-2xl">
                <div className="text-sm font-semibold mb-3">Hediye Geçmişi</div>
                {history.length === 0 ? (
                    <div className="text-xs text-gray-400">Henüz hediye gönderimi yok.</div>
                ) : (
                    <div className="space-y-2">
                        {history.map((h) => (
                            <div key={h.id} className="bg-white/5 rounded-xl p-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <Image
                                        src={getGiftStickerUrl(h.gift?.name || '') || h.gift?.image_url || '/placeholder-user.jpg'}
                                        alt={h.gift?.name || 'Hediye'}
                                        width={40}
                                        height={40}
                                        className="w-10 h-10 rounded-lg object-cover"
                                    />
                                    <div>
                                        <div className="font-semibold">{h.gift?.name || 'Hediye'}</div>
                                        <div className="text-xs text-gray-400">{h.amount} jeton</div>
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-500">{new Date(h.created_at).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}