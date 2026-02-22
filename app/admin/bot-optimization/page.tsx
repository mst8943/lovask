'use client'

import Link from 'next/link'

export default function AdminBotOptimizationPage() {
    return (
        <div className="admin-page space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Optimizasyon</h1>
                    <p className="text-sm text-slate-700">Deney, hız ve kalite iyileştirme</p>
                </div>
                <div className="text-xs px-4 py-2.5 rounded-full font-bold bg-white border border-slate-200 text-slate-700 shadow-sm hover:translate-y-[-1px] transition-all">
                    Botlar
                </div>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Bölümler</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/admin/bot-experiments" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot A/B</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Varyant ve deney yönetimi</div>
                </Link>
                <Link href="/admin/bot-cooldowns" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Cooldowns</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Bekleme ve hız ayarları</div>
                </Link>
                <Link href="/admin/bot-image-reviews" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Image</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Görsel onay ve kalite</div>
                </Link>
                <Link href="/admin/ai" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">AI Usage</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Model kullanımı ve maliyet</div>
                </Link>
            </div>
        </div>
    )
}
