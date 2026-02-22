'use client'

import { useEffect, useMemo, useState } from 'react'
import { requestBankTransfer } from '@/services/economyService'
import { createPaymentRequest } from '@/services/paymentService'
import { fetchPaymentSettings } from '@/services/appSettingsService'
import { Crown } from 'lucide-react'
import { FEATURE_ITEMS } from '@/lib/featureFlags'
import { useEconomy } from '@/hooks/useEconomy'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const plans = [
    { label: 'Aylık', price: 199, months: 1 },
    { label: '3 Aylık', price: 499, months: 3 },
]

export default function PremiumStorePage() {
    const [receiptUrl, setReceiptUrl] = useState('')
    const [selected, setSelected] = useState(plans[0])
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const { featureFlags } = useEconomy()
    const { user } = useAuthStore()
    const [paymentSettings, setPaymentSettings] = useState({ provider: 'bank_transfer', card_enabled: false })
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('bank')
    const [payerName, setPayerName] = useState('')
    const [paymentDate, setPaymentDate] = useState('')

    useEffect(() => {
        fetchPaymentSettings().then(setPaymentSettings)
    }, [])

    useEffect(() => {
        if (paymentSettings.card_enabled && paymentSettings.provider !== 'bank_transfer') {
            setPaymentMethod('card')
        } else {
            setPaymentMethod('bank')
        }
    }, [paymentSettings])

    const paymentRef = useMemo(() => {
        const base = user?.id ? user.id.slice(0, 8) : 'anon'
        return `PRM-${base}-${selected.months}M`
    }, [selected.months, user?.id])

    const premiumList = useMemo(() => {
        const flags = featureFlags?.premium || {}
        return FEATURE_ITEMS.filter((f) => flags[f.key]).map((f) => f.label)
    }, [featureFlags])

    const premiumEnabled = premiumList.length > 0

    const handleRequest = async () => {
        if (!premiumEnabled) return
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            if (!payerName.trim() || !paymentDate.trim()) {
                throw new Error('Lütfen ad soyad ve ödeme tarihini gir.')
            }
            const cleanName = payerName.trim()
            const cleanDate = paymentDate.trim()
            await requestBankTransfer({
                kind: 'premium',
                amount: selected.price,
                premiumMonths: selected.months,
                reference: `${paymentRef} | ${cleanName} | ${cleanDate}`,
                receiptUrl: receiptUrl.trim() || undefined,
            })
            setSuccess('Ödeme bildirimi gönderildi. Onaylayıp kısa sürede aktif edeceğiz.')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Premium talebi gönderilemedi.')
        } finally {
            setLoading(false)
        }
    }

    const handleCardPayment = async () => {
        if (!premiumEnabled) return
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            await createPaymentRequest({
                provider: paymentSettings.provider,
                kind: 'premium',
                amount: selected.price,
                metadata: { months: selected.months },
            })
            setSuccess('Kart ödeme talebi oluşturuldu. Ödeme bağlantısı hazırlanınca yönlendirileceksin.')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Kart ödeme talebi oluşturulamadı.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative space-y-6 pb-10">
            <div className="absolute -top-8 right-[-20%] h-56 w-56 rounded-full bg-pink-500/20 blur-[80px]" />
            <div className="absolute top-20 left-[-20%] h-64 w-64 rounded-full bg-violet-500/20 blur-[90px]" />

            <section className="glass-panel p-6 rounded-3xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-violet-500/10" />
                <div className="relative space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-gray-300">
                        <Crown size={12} className="text-pink-300" />
                        Premium
                    </div>
                    <h1 className="text-2xl md:text-3xl font-semibold text-white">Daha hızlı eşleş, daha akıllı filtrele</h1>
                    <p className="text-sm text-gray-300 max-w-xl">
                        Premium ile keşif alanını büyüt, gizli modu aç, sınırsız sohbet başlat ve günlük boost’larla öne çık.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {(premiumEnabled ? premiumList : ['Premium şu an devre dışı.']).slice(0, 10).map((item) => (
                            <span
                                key={item}
                                className="px-3 py-1 rounded-full text-[11px] border border-white/10 bg-white/5 text-gray-200"
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                {plans.map((p) => (
                    <button
                        key={p.label}
                        onClick={() => setSelected(p)}
                        className={`glass-panel p-5 rounded-3xl text-left transition border ${
                            selected.label === p.label
                                ? 'border-pink-500/60 shadow-[0_0_0_1px_rgba(236,72,153,0.35)]'
                                : 'border-white/5 hover:border-white/15'
                        }`}
                        disabled={!premiumEnabled}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                <div className="text-sm text-gray-300">Plan</div>
                                <div className="text-xl font-semibold text-white">{p.label}</div>
                                <div className="text-xs text-gray-400">{p.months} ay premium • Günlük boost + sınırsız sohbet</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-400">Ücret</div>
                                <div className="text-2xl font-bold text-white">{p.price} TRY</div>
                                {selected.label === p.label && (
                                    <div className="text-[10px] text-pink-300 mt-1">Seçili plan</div>
                                )}
                            </div>
                        </div>
                    </button>
                ))}
            </section>

            <section className="grid gap-4 md:grid-cols-2">
                <div className="glass-panel p-5 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPaymentMethod('card')}
                            disabled={!paymentSettings.card_enabled || paymentSettings.provider === 'bank_transfer'}
                            className={`px-4 py-2 rounded-full text-xs border transition ${
                                paymentMethod === 'card'
                                    ? 'bg-white/10 border-white/20 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                            }`}
                        >
                            Kart
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentMethod('bank')}
                            className={`px-4 py-2 rounded-full text-xs border transition ${
                                paymentMethod === 'bank'
                                    ? 'bg-white/10 border-white/20 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                            }`}
                        >
                            Havale
                        </button>
                    </div>

                    {paymentMethod === 'card' ? (
                        <div className="space-y-3">
                            <h2 className="font-semibold text-white">Kartla Öde</h2>
                            <p className="text-xs text-gray-400">{paymentSettings.provider} ile güvenli ödeme. 7 gün içinde farkı hisset.</p>
                            <Button
                                onClick={handleCardPayment}
                                disabled={loading || !premiumEnabled}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                            >
                                {loading ? 'Yönlendiriliyor...' : 'Kart ile Öde'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <h2 className="font-semibold text-white">Havale ile Premium</h2>
                            <p className="text-xs text-gray-400">
                                Ödemeyi yaptıktan sonra aşağıdan ödeme bildirimini gönder. Makbuz opsiyoneldir.
                            </p>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-gray-300 space-y-1">
                                <div><span className="text-gray-400">Banka:</span> {(paymentSettings as { bank_name?: string }).bank_name || 'Banka Adı'}</div>
                                <div><span className="text-gray-400">Hesap Adı:</span> {(paymentSettings as { account_name?: string }).account_name || 'Şirket Adı'}</div>
                                <div><span className="text-gray-400">IBAN:</span> {(paymentSettings as { iban?: string }).iban || 'TR00 0000 0000 0000 0000 0000 00'}</div>
                                <div><span className="text-gray-400">Hesap No:</span> {(paymentSettings as { account_no?: string }).account_no || '00000000'}</div>
                            </div>
                            <Input
                                value={paymentRef}
                                readOnly
                                disabled
                                placeholder="Ödeme Bildirim ID"
                            />
                            <Input
                                value={payerName}
                                onChange={(e) => setPayerName(e.target.value)}
                                placeholder="Ad Soyad"
                                disabled={!premiumEnabled}
                            />
                            <Input
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                placeholder="Ödeme Tarihi (örn: 2026-02-20)"
                                disabled={!premiumEnabled}
                            />
                            <Input
                                value={receiptUrl}
                                onChange={(e) => setReceiptUrl(e.target.value)}
                                placeholder="Makbuz linki (opsiyonel)"
                                disabled={!premiumEnabled}
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
                                disabled={loading || !premiumEnabled}
                                className="w-full"
                            >
                                {loading ? 'Gönderiliyor...' : 'Ödeme Bildirimini Gönder'}
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            <section className="glass-panel p-5 rounded-3xl flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="text-sm font-semibold text-white">Premium ayrıcalıklar seni öne çıkarır</div>
                    <div className="text-xs text-gray-400">İptal ettiğinde kaybetmezsin • Anında kapanmaz</div>
                </div>
                <div className="flex gap-2">
                    <Button className="rounded-full px-5" onClick={() => setSelected(plans[0])}>
                        Premium’a Yükselt
                    </Button>
                </div>
            </section>
        </div>
    )
}
