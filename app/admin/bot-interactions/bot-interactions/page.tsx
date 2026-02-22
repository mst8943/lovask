'use client'

import Link from 'next/link'

export default function AdminBotInteractionsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Etkileşim</h1>
                    <p className="text-sm text-slate-500">Sohbet, devralma ve geri bildirim</p>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                    Botlar
                </div>
            </div>

            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Bölümler</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/admin/bot-chats" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">Bot Chats</div>
                    <div className="text-xs text-slate-500">Aktif sohbetler ve geçmiş</div>
                </Link>
                <Link href="/admin/bot-handoffs" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">Bot Handoffs</div>
                    <div className="text-xs text-slate-500">İnsan devralma akışı</div>
                </Link>
                <Link href="/admin/bot-feedback" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">Bot Feedback</div>
                    <div className="text-xs text-slate-500">Kullanıcı geri bildirimleri</div>
                </Link>
                <Link href="/admin/bot-memories" className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="text-sm font-semibold">Bot Memory</div>
                    <div className="text-xs text-slate-500">Hafıza kayıtları ve bağlam</div>
                </Link>
            </div>
        </div>
    )
}
