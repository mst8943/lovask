'use client'

import Link from 'next/link'

export default function AdminBotOptimizationPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Optimizasyon</h1>
                    <p className="text-sm text-slate-500">Deney, hız ve kalite iyileştirme</p>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                    Botlar
                </div>
            </div>

            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Bölümler</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/admin/bot-experiments" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">Bot A/B</div>
                    <div className="text-xs text-slate-500">Varyant ve deney yönetimi</div>
                </Link>
                <Link href="/admin/bot-cooldowns" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">Bot Cooldowns</div>
                    <div className="text-xs text-slate-500">Bekleme ve hız ayarları</div>
                </Link>
                <Link href="/admin/bot-image-reviews" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">Bot Image</div>
                    <div className="text-xs text-slate-500">Görsel onay ve kalite</div>
                </Link>
                <Link href="/admin/ai" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">AI Usage</div>
                    <div className="text-xs text-slate-500">Model kullanımı ve maliyet</div>
                </Link>
            </div>
        </div>
    )
}
