'use client'

import Link from 'next/link'

export default function AdminBotManagementPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Yönetimi</h1>
                    <p className="text-sm text-gray-400">Bot yapılandırma ve düzenleme merkezi</p>
                </div>
                <Link href="/admin/bot-add" className="text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-gray-300">
                    Bot Ekle
                </Link>
            </div>

            <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Yönetim</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/admin/bots" className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                    <div className="text-sm font-semibold">Botlar</div>
                    <div className="text-xs text-gray-400">Listele, düzenle, etkinlik ayarları</div>
                </Link>
                <Link href="/admin/bot-groups" className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                    <div className="text-sm font-semibold">Bot Grupları</div>
                    <div className="text-xs text-gray-400">Segment ve grup davranışları</div>
                </Link>
                <Link href="/admin/bot-settings" className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                    <div className="text-sm font-semibold">Bot Ayarları</div>
                    <div className="text-xs text-gray-400">Global davranış ve zamanlama</div>
                </Link>
                <Link href="/admin/bot-cohorts" className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
                    <div className="text-sm font-semibold">Bot Cohorts</div>
                    <div className="text-xs text-gray-400">Kohort bazlı kontrol ve takip</div>
                </Link>
            </div>
        </div>
    )
}