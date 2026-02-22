'use client'

import Link from 'next/link'

export default function AdminBotOptimizationPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Optimizasyon</h1>
                    <p className="text-sm text-gray-400">Deney, hız ve kalite iyileştirme</p>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-gray-300">
                    Botlar
                </div>
            </div>

            <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Bölümler</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/admin/bot-experiments" className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                    <div className="text-sm font-semibold">Bot A/B</div>
                    <div className="text-xs text-gray-400">Varyant ve deney yönetimi</div>
                </Link>
                <Link href="/admin/bot-cooldowns" className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                    <div className="text-sm font-semibold">Bot Cooldowns</div>
                    <div className="text-xs text-gray-400">Bekleme ve hız ayarları</div>
                </Link>
                <Link href="/admin/bot-image-reviews" className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                    <div className="text-sm font-semibold">Bot Image</div>
                    <div className="text-xs text-gray-400">Görsel onay ve kalite</div>
                </Link>
                <Link href="/admin/ai" className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                    <div className="text-sm font-semibold">AI Usage</div>
                    <div className="text-xs text-gray-400">Model kullanımı ve maliyet</div>
                </Link>
            </div>
        </div>
    )
}
