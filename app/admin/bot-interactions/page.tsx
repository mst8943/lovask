'use client'

import Link from 'next/link'

export default function AdminBotInteractionsPage() {
    return (
        <div className="admin-page space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Etkileşim</h1>
                    <p className="text-sm text-slate-700">Sohbet, devralma ve geri bildirim</p>
                </div>
                <div className="text-xs px-4 py-2.5 rounded-full font-bold bg-white border border-slate-200 text-slate-700 shadow-sm hover:translate-y-[-1px] transition-all">
                    Botlar
                </div>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Bölümler</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/admin/bot-chats" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Chats</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Aktif sohbetler ve geçmiş</div>
                </Link>
                <Link href="/admin/bot-handoffs" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Handoffs</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">İnsan devralma akışı</div>
                </Link>
                <Link href="/admin/bot-feedback" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Feedback</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Kullanıcı geri bildirimleri</div>
                </Link>
                <Link href="/admin/bot-memories" className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group">
                    <div className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2">Bot Memory</div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Hafıza kayıtları ve bağlam</div>
                </Link>
            </div>
        </div>
    )
}
