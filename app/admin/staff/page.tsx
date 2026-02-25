'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ShieldAlert, Trash2, ShieldCheck, Mail, Key } from 'lucide-react'

type AdminUser = {
    id: string
    email: string | null
    created_at: string
    last_active_at: string | null
}

export default function AdminStaffPage() {
    const supabase = createClient()
    const [admins, setAdmins] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [newEmail, setNewEmail] = useState('')
    const [newPwd, setNewPwd] = useState('')
    const [adding, setAdding] = useState(false)
    const [myId, setMyId] = useState<string | null>(null)

    const loadAdmins = useCallback(async () => {
        setRefreshing(true)
        setError(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            setMyId(user?.id || null)

            const res = await fetch(`/api/admin/staff?v=${Date.now()}`, { method: 'GET' })
            if (!res.ok) throw new Error(await res.text())
            const json = await res.json()
            setAdmins(json.admins || [])
        } catch (err: any) {
            setError(err.message || 'Yöneticiler yüklenemedi.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [supabase])

    useEffect(() => {
        void loadAdmins()
    }, [loadAdmins])

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault()

        // Kendi kendini düzenlemeyi engelle (Kendi e-postasını yazıp hata ile kendi çıkışını yapmasın diye)
        if (admins.find(a => a.id === myId)?.email === newEmail) {
            alert('Zaten yöneticisiniz! Eğer sadece şifre değiştirmek istiyorsanız bunu hesap ayarlarından yapmalısınız. Lütfen test için kendi e-postanızı girmeyin, aksi halde mevcut oturumunuz düşer.')
            return
        }

        setAdding(true)
        setError(null)
        try {
            const res = await fetch('/api/admin/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, password: newPwd })
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) throw new Error(data?.error || `Sunucu hatası (${res.status})`)
            setNewEmail('')
            setNewPwd('')
            alert('Başkası eklenmiş veya önceden var olsa dahi hesaba yeni şifresiyle Admin yetkisi verildi!')
            void loadAdmins()
        } catch (err: any) {
            alert('Hata: ' + (err.message || 'Eklenemedi'))
        } finally {
            setAdding(false)
        }
    }

    const handleRemoveAdmin = async (id: string, email: string) => {
        if (!confirm(`DİKKAT: ${email} adlı kullanıcının sadece yetkileri alınmayacak, aynı zamanda HESABI TAMAMEN SİLİNECEKTİR. Onaylıyor musunuz?`)) return

        try {
            const res = await fetch(`/api/admin/staff?id=${encodeURIComponent(id)}`, {
                method: 'DELETE'
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) throw new Error(data?.error || `Sunucu hatası (${res.status})`)

            alert('Kullanıcı hesabı ve tüm bilgileri sistemden TAMPAMEN GÜVENLE SİLİNDİ.')
            void loadAdmins()
        } catch (err: any) {
            alert('Hata: ' + (err.message || 'Yetki alınamadı'))
        }
    }

    const handleCopy = (txt: string | null) => {
        if (!txt) return
        navigator.clipboard.writeText(txt)
        alert('Kopyalandı: ' + txt)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="admin-page space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShieldCheck className="text-emerald-600" />
                        Yönetici Ekibi
                    </h1>
                    <p className="text-sm text-slate-700">Admine panel erişimi olan tüm yetkili hesaplar.</p>
                </div>
                <Button onClick={loadAdmins} disabled={refreshing} variant="outline" className="h-9">
                    {refreshing ? 'Yenileniyor...' : 'Yenile'}
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200">
                    <div className="flex gap-3">
                        <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                        <div>
                            <div className="font-semibold text-sm">Veri okuma hatası</div>
                            <div className="text-xs opacity-90 mt-1">{error}</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                        {admins.map(admin => {
                            const isMe = admin.id === myId
                            return (
                                <div key={admin.id} className="glass-panel p-5 rounded-2xl flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 border-r border-slate-100 pr-4 shrink-0 w-1/2">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-lg uppercase shadow-inner shrink-0 border border-slate-200">
                                            {admin.email?.charAt(0) || 'A'}
                                        </div>
                                        <div>
                                            <div className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                                {admin.email || 'Bilinmiyor'}
                                                {isMe && <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold tracking-wider">SEN</span>}
                                            </div>
                                            <div
                                                className="text-xs text-slate-500 font-mono mt-0.5 cursor-pointer hover:text-indigo-600 transition-colors"
                                                onClick={() => handleCopy(admin.id)}
                                                title="ID'yi kopyalamak için tıkla"
                                            >
                                                {admin.id.slice(0, 8)}...{admin.id.slice(-6)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 text-xs text-slate-500">
                                        <div>
                                            Eklendi: <span className="text-slate-700">{new Date(admin.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {admin.last_active_at && (
                                            <div className="mt-1">
                                                Son Giriş: <span className="text-slate-700">{new Date(admin.last_active_at).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pl-4">
                                        {!isMe && (
                                            <button
                                                onClick={() => handleRemoveAdmin(admin.id, admin.email || 'Bilinmiyor')}
                                                className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-100 transition-all shadow-sm"
                                                title="Sisteden Tamamen Sil"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        {admins.length === 0 && !loading && (
                            <div className="p-8 text-center text-slate-500 text-sm glass-panel rounded-2xl">
                                Listede hiç yönetici bulunamadı.
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={handleAddAdmin} className="glass-panel p-6 rounded-2xl flex flex-col gap-5 sticky top-[100px]">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Yönetici Ekle</h2>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">Listede olmayan bir kullanıcıyı yetkilendirin veya sisteme tamamen yeni bir admin hesabı açıp yetkilendirin.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 ml-0.5">
                                <Mail size={12} /> E-Posta
                            </label>
                            <Input
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                placeholder="yeniadmin@lovask.com"
                                type="email"
                                required
                                className="w-full text-sm bg-slate-50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 ml-0.5">
                                <Key size={12} /> Geçici Şifre
                            </label>
                            <Input
                                value={newPwd}
                                onChange={e => setNewPwd(e.target.value)}
                                placeholder="Min 6 karakter"
                                type="password"
                                required
                                minLength={6}
                                className="w-full text-sm bg-slate-50"
                            />
                            <p className="text-[10px] text-slate-400">Şifre güvenli olacak şekilde en az 6 karakter girilmelidir.</p>
                        </div>
                    </div>

                    <Button type="submit" disabled={adding} className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <span className="relative z-10 font-semibold">{adding ? 'İşleniyor...' : 'Hesabı Ekle / Yetkilendir'}</span>
                    </Button>
                </form>
            </div>
        </div>
    )
}
