'use client'

import Link from 'next/link'

export default function AdminBotMonitoringPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot İzleme</h1>
                    <p className="text-sm text-slate-500">Sağlık, güvenlik ve anomali takibi</p>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                    Botlar
                </div>
            </div>

            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Bölümler</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/admin/bot-health" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">Bot Sağlık</div>
                    <div className="text-xs text-slate-500">Genel performans ve durum</div>
                </Link>
                <Link href="/admin/bot-analytics" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">Bot Analitik</div>
                    <div className="text-xs text-slate-500">Kullanım ve trend analizi</div>
                </Link>
                <Link href="/admin/bot-safety" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">Bot Safety</div>
                    <div className="text-xs text-slate-500">Güvenlik kontrolleri ve olaylar</div>
                </Link>
                <Link href="/admin/bot-quarantine" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">Bot Quarantine</div>
                    <div className="text-xs text-slate-500">Karantina ve kısıtlama yönetimi</div>
                </Link>
            </div>
        </div>
    )
}
