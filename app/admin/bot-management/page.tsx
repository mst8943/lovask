'use client'

import Link from 'next/link'

export default function AdminBotManagementPage() {
    return (
        <div className="admin-page space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Yönetimi</h1>
                    <p className="text-sm text-slate-700">Bot yapılandırma ve düzenleme merkezi</p>
                </div>
                <Link href="/admin/bot-add" className="text-xs px-4 py-2.5 rounded-full font-bold bg-white border border-slate-200 text-slate-700 shadow-sm hover:translate-y-[-1px] transition-all">
                    Bot Ekle
                </Link>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Yönetim</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/admin/bots" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Botlar</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Listele, düzenle, etkinlik ayarları</div>
                </Link>
                <Link href="/admin/bot-groups" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Grupları</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Segment ve grup davranışları</div>
                </Link>
                <Link href="/admin/bot-settings" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Ayarları</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Global davranış ve zamanlama</div>
                </Link>
                <Link href="/admin/bot-cohorts" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Cohorts</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kohort bazlı kontrol ve takip</div>
                </Link>
            </div>
        </div>
    )
}