'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { requestBankTransfer } from '@/services/economyService'
import { createPaymentRequest } from '@/services/paymentService'
import { fetchPaymentSettings } from '@/services/appSettingsService'
import { fetchPremiumPlans, fetchCoinPackages, type PremiumPlan, type CoinPackage } from '@/services/packageService'
import { Crown, Gem, Star, Check, Zap, Copy, Upload, X, FileText } from 'lucide-react'
import { FEATURE_ITEMS } from '@/lib/featureFlags'
import { useEconomy } from '@/hooks/useEconomy'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'

const fallbackPlans: Array<{ label: string; price: number; months: number }> = [
    { label: 'Aylık', price: 199, months: 1 },
    { label: '3 Aylık', price: 499, months: 3 },
]

function PremiumStoreContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const toast = useToast()

    const [receiptUrl, setReceiptUrl] = useState('')
    const [receiptFile, setReceiptFile] = useState<File | null>(null)
    const [plans, setPlans] = useState<PremiumPlan[]>([])
    const [packages, setPackages] = useState<CoinPackage[]>([])
    const [selectedPlan, setSelectedPlan] = useState<PremiumPlan | null>(null)
    const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null)
    const [viewMode, setViewMode] = useState<'premium' | 'coins'>('premium')

    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const { featureFlags } = useEconomy()
    const { user } = useAuthStore()
    const [paymentSettings, setPaymentSettings] = useState({ provider: 'bank_transfer', card_enabled: false })
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('bank')
    const [payerName, setPayerName] = useState('')
    const [paymentDate, setPaymentDate] = useState('')
    const [showBankInfo, setShowBankInfo] = useState(false)

    useEffect(() => {
        fetchPaymentSettings().then(setPaymentSettings)

        const typeParam = searchParams.get('type')
        const idParam = searchParams.get('id')

        Promise.all([fetchPremiumPlans(), fetchCoinPackages()])
            .then(([pLans, pAckages]) => {
                setPlans(pLans)
                setPackages(pAckages)

                // Handle URL params
                if (typeParam === 'coins') {
                    setViewMode('coins')
                    if (idParam) {
                        const pkg = pAckages.find(p => p.id === idParam)
                        if (pkg) setSelectedPackage(pkg)
                    } else if (pAckages.length > 0) {
                        setSelectedPackage(pAckages[0])
                    }
                } else {
                    setViewMode('premium')
                    if (idParam) {
                        const plan = pLans.find(p => p.id === idParam)
                        if (plan) setSelectedPlan(plan)
                    } else if (pLans.length > 0) {
                        setSelectedPlan(pLans[0])
                    }
                }

                // Fallbacks if empty
                if (pLans.length === 0) {
                    const mapped = fallbackPlans.map((p, idx) => ({
                        id: `fallback-${idx}`,
                        title: p.label,
                        months: p.months,
                        price: p.price,
                        currency: 'TRY',
                        is_active: true,
                        sort_order: idx,
                    }))
                    setPlans(mapped)
                    if (viewMode === 'premium' && !idParam) setSelectedPlan(mapped[0])
                }
            })
            .catch(console.error)
    }, [searchParams])

    useEffect(() => {
        if (paymentSettings.card_enabled && paymentSettings.provider !== 'bank_transfer') {
            setPaymentMethod('card')
        } else {
            setPaymentMethod('bank')
        }
    }, [paymentSettings])

    const paymentRef = useMemo(() => {
        const base = user?.id ? user.id.slice(0, 8) : 'anon'
        if (viewMode === 'premium') {
            const months = selectedPlan?.months || 1
            return `PRM-${base}-${months}M`
        } else {
            const coins = selectedPackage?.coins || 0
            return `COIN-${base}-${coins}`
        }
    }, [selectedPlan, selectedPackage, user?.id, viewMode])

    const premiumList = useMemo(() => {
        const flags = featureFlags?.premium || {}
        return FEATURE_ITEMS.filter((f) => flags[f.key]).map((f) => f.label)
    }, [featureFlags])

    const premiumEnabled = premiumList.length > 0

    const uploadReceipt = async (file: File) => {
        const supabase = createClient()
        const ext = file.name.split('.').pop()
        const path = `receipts/${user?.id || 'anon'}/${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
            .from('chat-media') // Use chat-media as fallback if receipts doesn't exist, but receipts is better. Let's try to use stories bucket or chat-media as they exist.
            .upload(path, file)

        if (uploadError) throw uploadError

        return path
    }

    const handleRequest = async () => {
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            const selected = viewMode === 'premium' ? selectedPlan : selectedPackage
            if (!selected) throw new Error('Seçim yapılmadı.')

            if (!payerName.trim() || !paymentDate.trim()) {
                throw new Error('Lütfen ad soyad ve ödeme tarihini gir.')
            }

            const cleanName = payerName.trim()
            const cleanDate = paymentDate.trim()

            let finalReceiptUrl = receiptUrl.trim() || undefined

            if (receiptFile) {
                setLoading(true)
                const path = await uploadReceipt(receiptFile)
                finalReceiptUrl = path
            }

            if (viewMode === 'premium') {
                const plan = selected as PremiumPlan
                await requestBankTransfer({
                    kind: 'premium',
                    amount: plan.price,
                    premiumMonths: plan.months,
                    premiumPlanId: plan.id.startsWith('fallback-') ? undefined : plan.id,
                    reference: `${paymentRef} | ${cleanName} | ${cleanDate}`,
                    receiptUrl: finalReceiptUrl,
                })
            } else {
                const pkg = selected as CoinPackage
                await requestBankTransfer({
                    kind: 'coins',
                    amount: pkg.price,
                    coinsAmount: pkg.coins,
                    coinPackageId: pkg.id,
                    reference: `${paymentRef} | ${cleanName} | ${cleanDate}`,
                    receiptUrl: finalReceiptUrl,
                })
            }

            setSuccess('Ödeme bildirimi gönderildi. Onaylayıp kısa sürede aktif edeceğiz.')
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
            const selected = viewMode === 'premium' ? selectedPlan : selectedPackage
            if (!selected) throw new Error('Seçim yapılmadı.')

            if (viewMode === 'premium') {
                const plan = selected as PremiumPlan
                await createPaymentRequest({
                    provider: paymentSettings.provider,
                    kind: 'premium',
                    amount: plan.price,
                    metadata: {
                        months: plan.months,
                        plan_id: plan.id.startsWith('fallback-') ? null : plan.id,
                    },
                })
            } else {
                const pkg = selected as CoinPackage
                await createPaymentRequest({
                    provider: paymentSettings.provider,
                    kind: 'coins',
                    amount: pkg.price,
                    metadata: {
                        coins: pkg.coins,
                        package_id: pkg.id,
                    },
                })
            }
            setSuccess('Kart ödeme talebi oluşturuldu. Ödeme bağlantısı hazırlanınca yönlendirileceksin.')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Kart ödeme talebi oluşturulamadı.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative space-y-6 pb-10 max-w-4xl mx-auto w-full px-4 sm:px-0">
            {/* Glowing background blobs */}
            <div className="absolute -top-8 right-[-10%] h-48 w-48 rounded-full bg-pink-500/10 blur-[60px] pointer-events-none" />
            <div className="absolute top-20 left-[-10%] h-56 w-56 rounded-full bg-violet-500/10 blur-[70px] pointer-events-none" />

            {/* View Mode Switcher */}
            <div className="flex bg-white/5 p-1.5 rounded-2xl w-full sm:w-fit mx-auto border border-white/10 backdrop-blur-md">
                <button
                    onClick={() => setViewMode('premium')}
                    className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${viewMode === 'premium'
                        ? 'bg-gradient-to-tr from-pink-500 to-violet-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Crown size={18} />
                    Premium
                </button>
                <button
                    onClick={() => setViewMode('coins')}
                    className={`flex-1 sm:flex-none px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${viewMode === 'coins'
                        ? 'bg-gradient-to-tr from-yellow-500 to-amber-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Gem size={18} />
                    Jeton
                </button>
            </div>

            {/* Hero Section */}
            <section className="glass-panel p-6 sm:p-8 rounded-[2rem] relative overflow-hidden shadow-xl border border-white/5">
                <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 ${viewMode === 'premium' ? 'from-pink-500/10 to-violet-500/15' : 'from-yellow-500/10 to-orange-500/15'}`} />
                <div className="relative space-y-4">
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] ${viewMode === 'premium' ? 'bg-pink-500/20 text-pink-200' : 'bg-yellow-500/20 text-yellow-200'}`}>
                        {viewMode === 'premium' ? <Crown size={14} /> : <Gem size={14} />}
                        {viewMode === 'premium' ? 'PREMİUM ÜYELİK' : 'JETON PAKETLERİ'}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                        {viewMode === 'premium' ? <>Daha hızlı eşleş, <br className="hidden sm:block" /> daha akıllı filtrele</> : <>Profilini öne çıkar, <br className="hidden sm:block" /> mesaj jetonu kazan</>}
                    </h1>
                    <p className="text-sm sm:text-base text-gray-300 max-w-xl leading-relaxed">
                        {viewMode === 'premium'
                            ? "Premium ile keşif alanını büyüt, gizli modu aç, sınırsız sohbet başlat ve günlük boost’larla uygulamanın en gözdelerinden biri ol."
                            : "Jetonlarınla beğendiğin kişilere etkileyici hediyeler gönderebilir, mesaj sınırını aşabilir veya profilini saatlerce öne çıkarabilirsin."
                        }
                    </p>
                    {viewMode === 'premium' && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {(premiumEnabled ? premiumList : ['Premium geliştirme aşamasında.']).map((item) => (
                                <span key={item} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-pink-100 flex items-center gap-1.5">
                                    <Check size={10} className="text-pink-400" />
                                    {item}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Plans/Packages Selection */}
            <section className="grid gap-4 md:grid-cols-2">
                {viewMode === 'premium' ? (
                    plans.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPlan(p)}
                            className={`relative p-6 rounded-[2rem] text-left transition-all duration-300 overflow-hidden group border-2 ${selectedPlan?.id === p.id
                                ? 'bg-white/10 border-pink-500/60 shadow-[0_8px_30px_rgba(236,72,153,0.15)] scale-[1.02]'
                                : 'glass-panel border-transparent hover:border-pink-500/30 hover:scale-[1.01]'
                                }`}
                            disabled={!premiumEnabled}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="text-xs font-bold text-pink-400/80 uppercase tracking-widest">{p.months} AY</div>
                                    <div className="text-2xl font-bold text-white">{p.title || `Premium Paket`}</div>
                                    <div className="text-[11px] text-gray-400 font-medium">Günlük boost + sınırsız mesaj</div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-3xl font-black text-white">{p.price} <span className="text-lg font-bold">{p.currency || 'TRY'}</span></div>
                                    {selectedPlan?.id === p.id && <div className="text-[10px] font-bold text-pink-300 mt-1 uppercase">Seçili</div>}
                                </div>
                            </div>
                        </button>
                    ))
                ) : (
                    packages.map((pkg) => (
                        <button
                            key={pkg.id}
                            onClick={() => setSelectedPackage(pkg)}
                            className={`relative p-6 rounded-[2rem] text-left transition-all duration-300 overflow-hidden group border-2 ${selectedPackage?.id === pkg.id
                                ? 'bg-white/10 border-yellow-500/60 shadow-[0_8px_30px_rgba(234,179,8,0.15)] scale-[1.02]'
                                : 'glass-panel border-transparent hover:border-yellow-500/30 hover:scale-[1.01]'
                                }`}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="text-xs font-bold text-yellow-500 uppercase tracking-widest">JETON</div>
                                    <div className="text-2xl font-bold text-white flex items-center gap-2">
                                        {pkg.coins}
                                        <Gem size={20} className="text-yellow-400" />
                                    </div>
                                    <div className="text-[11px] text-gray-400 font-medium">≈ {Math.floor(pkg.coins / 20)} Sohbet Başlatma</div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-3xl font-black text-white">{pkg.price} <span className="text-lg font-bold">{pkg.currency || 'TRY'}</span></div>
                                    {selectedPackage?.id === pkg.id && <div className="text-[10px] font-bold text-yellow-400 mt-1 uppercase">Seçili</div>}
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </section>

            {/* Payment Form */}
            <section className="glass-panel p-6 sm:p-8 rounded-[2rem] relative border border-white/5">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => setPaymentMethod('card')}
                        disabled={!paymentSettings.card_enabled}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${paymentMethod === 'card' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Kredi Kartı
                    </button>
                    <button
                        onClick={() => setPaymentMethod('bank')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${paymentMethod === 'bank' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Banka Havalesi
                    </button>
                </div>

                <div className="space-y-6">
                    {paymentMethod === 'card' ? (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                <h3 className="text-emerald-400 font-bold text-sm">Online Aktivasyon</h3>
                                <p className="text-[11px] text-emerald-400/70 mt-0.5">Ödeme sonrası anında hesabına yansır.</p>
                            </div>
                            <Button
                                onClick={handleCardPayment}
                                disabled={loading || (viewMode === 'premium' && !premiumEnabled)}
                                className={`w-full h-14 text-base font-bold text-white rounded-xl shadow-lg transition-all active:scale-[0.98] ${viewMode === 'premium' ? 'bg-gradient-to-r from-pink-500 to-violet-600' : 'bg-gradient-to-r from-yellow-500 to-amber-600'}`}
                            >
                                {loading ? 'Hazırlanıyor...' : 'Güvenli Ödeme Sayfasına Git'}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                                <h3 className="text-blue-400 font-bold text-sm">Havale / EFT</h3>
                                <p className="text-[11px] text-blue-400/70 mt-0.5">İşlem sonrası bildirim yapmanız gerekmektedir.</p>
                            </div>

                            {!showBankInfo ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowBankInfo(true)}
                                    className="w-full h-12 rounded-xl border-white/10 bg-white/5 text-gray-200"
                                >
                                    Banka Hesap Bilgilerini Göster
                                </Button>
                            ) : (
                                <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-5 animate-in slide-in-from-top-4 duration-300 backdrop-blur-md">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Banka</div>
                                        <div className="flex items-center justify-between group">
                                            <span className="text-sm text-gray-200 font-semibold">{(paymentSettings as any).bank_name || 'Ziraat Bankası'}</span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText((paymentSettings as any).bank_name || '')
                                                    toast.push('Banka adı kopyalandı', 'success')
                                                }}
                                                className="opacity-40 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/5 rounded-lg text-white"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Alıcı</div>
                                        <div className="flex items-center justify-between group">
                                            <span className="text-sm text-gray-200 font-semibold">{(paymentSettings as any).account_name || 'Lovask Teknoloji'}</span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText((paymentSettings as any).account_name || '')
                                                    toast.push('Alıcı adı kopyalandı', 'success')
                                                }}
                                                className="opacity-40 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/5 rounded-lg text-white"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">IBAN</div>
                                        <div className="flex items-center justify-between group">
                                            <span className="text-sm text-indigo-400 font-mono font-bold tracking-tight">{(paymentSettings as any).iban || 'TR00 ...'}</span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(((paymentSettings as any).iban || '').replace(/\s/g, ''))
                                                    toast.push('IBAN kopyalandı', 'success')
                                                }}
                                                className="opacity-40 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/5 rounded-lg text-white"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setShowBankInfo(false)}
                                        className="text-[10px] text-center w-full text-gray-500 hover:text-white transition-colors pt-2 font-bold uppercase tracking-widest"
                                    >
                                        Bilgileri Gizle
                                    </button>
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="col-span-2">
                                    <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase">Referans No</label>
                                    <Input value={paymentRef} readOnly disabled className="bg-white/5 border-white/10 text-white font-mono opacity-60 h-12" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase">Ad Soyad</label>
                                    <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Gönderici Adı" className="bg-white/5 border-white/10 text-white h-12" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase">Tarih</label>
                                    <Input value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} placeholder="00/00/2026" className="bg-white/5 border-white/10 text-white h-12" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[11px] font-bold text-gray-400 ml-1 uppercase mb-2 block">Ödeme Makbuzu</label>
                                    {!receiptFile ? (
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*,application/pdf"
                                                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="h-24 sm:h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 transition-colors">
                                                <Upload size={24} className="text-gray-500" />
                                                <div className="text-xs text-gray-400">Dosya seç veya sürükle</div>
                                                <div className="text-[10px] text-gray-500">PNG, JPG veya PDF (Max 5MB)</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between animate-in zoom-in-95 duration-200">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-200 truncate max-w-[150px] sm:max-w-[250px]">{receiptFile.name}</span>
                                                    <span className="text-[10px] text-gray-500">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setReceiptFile(null)}
                                                className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm font-medium">{error}</div>}
                            {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm font-medium">{success}</div>}

                            <Button
                                onClick={handleRequest}
                                disabled={loading || (viewMode === 'premium' && !premiumEnabled)}
                                className={`w-full h-14 text-base font-bold text-white rounded-xl shadow-lg transition-all active:scale-[0.98] ${viewMode === 'premium' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                            >
                                {loading ? 'Gönderiliyor...' : 'Ödeme Bildirimi Gönder'}
                            </Button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}

export default function PremiumStorePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Zap size={40} className="animate-pulse text-pink-500" /></div>}>
            <PremiumStoreContent />
        </Suspense>
    )
}
