'use client'

import Link from 'next/link'

export default function AdminBotMonitoringPage() {
    return (
        <div className="admin-page space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot İzleme</h1>
                    <p className="text-sm text-slate-700">Sağlık, güvenlik ve anomali takibi</p>
                </div>
                <div className="text-xs px-4 py-2.5 rounded-full font-bold bg-white border border-slate-200 text-slate-700 shadow-sm hover:translate-y-[-1px] transition-all">
                    Botlar
                </div>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Bölümler</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/admin/bot-health" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Sağlık</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Genel performans ve durum</div>
                </Link>
                <Link href="/admin/bot-analytics" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Analitik</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kullanım ve trend analizi</div>
                </Link>
                <Link href="/admin/bot-safety" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Safety</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Güvenlik kontrolleri ve olaylar</div>
                </Link>
                <Link href="/admin/bot-quarantine" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Quarantine</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Karantina ve kısıtlama yönetimi</div>
                </Link>
            </div>
        </div>
    )
}
