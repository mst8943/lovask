'use client'

import { useEffect, useState } from 'react'
import { requestBankTransfer } from '@/services/economyService'
import { createPaymentRequest } from '@/services/paymentService'
import { fetchPaymentSettings } from '@/services/appSettingsService'
import { Gem } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const packages = [
    { coins: 100, price: 49 },
    { coins: 500, price: 199 },
    { coins: 1200, price: 399 },
]

export default function CoinsStorePage() {
    const [reference, setReference] = useState('')
    const [receiptUrl, setReceiptUrl] = useState('')
    const [selected, setSelected] = useState(packages[0])
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [paymentSettings, setPaymentSettings] = useState({ provider: 'bank_transfer', card_enabled: false })

    useEffect(() => {
        fetchPaymentSettings().then(setPaymentSettings)
    }, [])

    const handleRequest = async () => {
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            await requestBankTransfer({
                kind: 'coins',
                amount: selected.price,
                coinsAmount: selected.coins,
                reference,
                receiptUrl,
            })
            setSuccess('Talep gönderildi. Onaylayıp jetonları ekleyeceğiz.')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Talep gönderilemedi.')
        } finally {
            setLoading(false)
        }
    }

    const handleCardPayment = async () => {
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            await createPaymentRequest({
                provider: paymentSettings.provider,
                kind: 'coins',
                amount: selected.price,
                metadata: { coins: selected.coins },
            })
            setSuccess('Kart ödeme talebi oluşturuldu. Ödeme bağlantısı hazırlanınca yönlendirileceksin.')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Kart ödeme talebi oluşturulamadı.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 pb-8">

            <div className="space-y-3">
                {packages.map((p) => (
                    <Button
                        key={p.coins}
                        onClick={() => setSelected(p)}
                        variant="ghost"
                        size="lg"
                        className={`w-full h-auto glass-panel p-4 rounded-2xl flex items-center justify-between transition ${selected.coins === p.coins ? 'border border-pink-500/50' : 'border border-white/5 hover:border-white/15'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Gem className="text-yellow-400" />
                            <div className="text-left">
                                <div className="font-semibold">{p.coins} Jeton</div>
                                <div className="text-xs text-gray-400">{p.price} TRY</div>
                                <div className="text-[10px] text-gray-500 mt-1">
                                    ≈ {Math.floor(p.coins / 20)} sohbet • ≈ {Math.floor(p.coins / 50)} boost
                                </div>
                            </div>
                        </div>
                        {selected.coins === p.coins && <span className="text-xs text-pink-400">Seçili</span>}
                    </Button>
                ))}
            </div>

            {paymentSettings.card_enabled && paymentSettings.provider !== 'bank_transfer' && (
                <div className="glass-panel p-5 rounded-2xl space-y-3">
                    <h2 className="font-semibold">Kredi Kartı</h2>
                    <p className="text-xs text-gray-400">{paymentSettings.provider} ile güvenli ödeme.</p>
                    <Button
                        onClick={handleCardPayment}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                    >
                        {loading ? 'Yönlendiriliyor...' : 'Kart ile Öde'}
                    </Button>
                </div>
            )}

            <div className="glass-panel p-5 rounded-2xl space-y-3">
                <h2 className="font-semibold">Havale</h2>
                <p className="text-xs text-gray-400">Havale yapıp referans/makbuz ekle.</p>
                <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Havale referansı (opsiyonel)"
                />
                <Input
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="Makbuz linki (opsiyonel)"
                />

                {error && (
                    <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 text-sm text-green-200 bg-green-500/10 border border-green-500/20 rounded-lg">
                        {success}
                    </div>
                )}

                <Button
                    onClick={handleRequest}
                    disabled={loading}
                    className="w-full"
                >
                    {loading ? 'Gönderiliyor...' : 'Talep Gönder'}
                </Button>
            </div>
        </div>
    )
}
