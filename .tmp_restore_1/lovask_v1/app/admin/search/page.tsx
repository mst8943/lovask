'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getProfileAvatar } from '@/utils/avatar'
import Spinner from '@/components/ui/Spinner'
type ProfileRow = {
    id: string
    display_name: string | null
    photos: string[] | string | null
    is_verified: boolean | null
    users?: { email?: string | null; role?: string | null; is_premium?: boolean | null } | null
}
type UserRow = {
    id: string
    email: string | null
    role: string | null
    coin_balance: number | null
    is_premium: boolean | null
    premium_expires_at: string | null
}
type VerificationRow = {
    id: string
    user_id: string
    type: string
    status: string
    device_info?: Record<string, unknown> | null
    created_at: string
}
type TransferRow = {
    id: string
    user_id: string
    reference: string | null
    amount: number | null
    status: string | null
    created_at: string
}
type PaymentRow = {
    id: string
    kind: string
    provider: string | null
    amount: number
    currency: string
    status: string | null
    metadata?: Record<string, unknown> | null
    created_at: string
}
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export default function AdminSearchPage() {
    const supabase = useMemo(() => createClient(), [])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [profiles, setProfiles] = useState<ProfileRow[]>([])
    const [users, setUsers] = useState<UserRow[]>([])
    const [verifications, setVerifications] = useState<VerificationRow[]>([])
    const [transfers, setTransfers] = useState<TransferRow[]>([])
    const [payments, setPayments] = useState<PaymentRow[]>([])
    const [error, setError] = useState<string | null>(null)
    const [recentOnly, setRecentOnly] = useState(false)
    useEffect(() => {
        const q = query.trim()
        if (q.length < 2) {
            setProfiles([])
            setUsers([])
            setError(null)
            return
        }
        setLoading(true)
        const id = setTimeout(async () => {
            try {
                const isId = isUuid(q)
                const lowerQ = q.toLowerCase()
                const [profilesRes, usersRes, verRes, transferRes, paymentsRes] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('id, display_name, photos, is_verified, users:users(email,role,is_premium)')
                        .or(isId ? `id.eq.${q}` : `display_name.ilike.%${q}%`)
                        .gte('updated_at', recentOnly ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() : '1970-01-01')
                        .limit(20),
                    supabase
                        .from('users')
                        .select('id,email,role,coin_balance,is_premium,premium_expires_at')
                        .or(isId ? `id.eq.${q}` : `email.ilike.%${q}%`)
                        .gte('created_at', recentOnly ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : '1970-01-01')
                        .limit(20),
                    supabase
                        .from('user_verifications')
                        .select('id,user_id,type,status,device_info,created_at')
                        .or(
                            isId
                                ? `id.eq.${q},user_id.eq.${q}`
                                : [
                                    `device_info->>device_id.ilike.%${q}%`,
                                    `device_info->>deviceId.ilike.%${q}%`,
                                    `device_info->>fingerprint.ilike.%${q}%`,
                                    `device_info->>device_fingerprint.ilike.%${q}%`,
                                    `device_info->>user_agent.ilike.%${q}%`,
                                ].join(',')
                        )
                        .limit(50),
                    supabase
                        .from('bank_transfers')
                        .select('id,user_id,reference,amount,status,created_at')
                        .or(isId ? `id.eq.${q}` : `reference.ilike.%${q}%`)
                        .limit(20),
                    supabase
                        .from('payments')
                        .select('id,kind,provider,amount,currency,status,metadata,created_at')
                        .or(
                            isId
                                ? `id.eq.${q}`
                                : [
                                    `provider.ilike.%${q}%`,
                                    `kind.ilike.%${q}%`,
                                    `metadata->>reference.ilike.%${q}%`,
                                    `metadata->>ref.ilike.%${q}%`,
                                    `metadata->>transaction_id.ilike.%${q}%`,
                                    `metadata->>payment_id.ilike.%${q}%`,
                                    `metadata->>order_id.ilike.%${q}%`,
                                ].join(',')
                        )
                        .limit(20),
                ])
                if (profilesRes.error) throw profilesRes.error
                if (usersRes.error) throw usersRes.error
                if (verRes.error) throw verRes.error
                if (transferRes.error) throw transferRes.error
                if (paymentsRes.error) throw paymentsRes.error
                setProfiles((profilesRes.data || []) as ProfileRow[])
                setUsers((usersRes.data || []) as UserRow[])
                const verificationData = (verRes.data || []) as VerificationRow[]
                const filtered = verificationData.filter((v) => {
                    const blob = JSON.stringify(v.device_info || {}).toLowerCase()
                    return q.length >= 2 && (blob.includes(lowerQ) || v.user_id === q || v.id === q)
                })
                setVerifications(filtered.slice(0, 20))
                setTransfers((transferRes.data || []) as TransferRow[])
                setPayments((paymentsRes.data || []) as PaymentRow[])
                setError(null)
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Arama başarısız.')
            } finally {
                setLoading(false)
            }
        }, 250)
        return () => clearTimeout(id)
    }, [query, recentOnly, supabase])
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Global Arama</h1>
                    <p className="text-sm text-gray-400">E-posta, ID, isim ile hızlı arama</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300 flex items-center gap-2">
                    <Search size={12} />
                    Canlı
                </div>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
                <Search size={16} className="text-gray-400" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ID, e-posta, cihaz ID veya ödeme referansı yaz..."
                    className="w-full bg-transparent outline-none text-sm"
                />
                {query.trim().length > 0 && (
                    <button
                        onClick={() => navigator.clipboard.writeText(query)}
                        className="px-3 py-1.5 rounded-full border border-white/10 bg-white/10 text-xs text-gray-300"
                    >
                        Kopyala
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
                <button onClick={() => setQuery('')} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                    Temizle
                </button>
                <button onClick={() => setQuery('premium')} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                    Premium
                </button>
                <button onClick={() => setQuery('bot')} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                    Bot
                </button>
                <button
                    onClick={() => setRecentOnly((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-full border ${recentOnly ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white/10 border-white/10'}`}
                >
                    Son kayıtlar
                </button>
            </div>
            {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Spinner className="w-4 h-4 animate-spin" /> Aranıyor...
                </div>
            )}
            {error && (
                <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg">
                    {error}
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-panel rounded-2xl p-4 space-y-3">
                    <div className="text-sm font-semibold">Profiller</div>
                    {profiles.length === 0 ? (
                        <div className="text-xs text-gray-500">Sonuç yok</div>
                    ) : (
                        <div className="space-y-2">
                            {profiles.map((p) => (
                                <Link key={p.id} href={`/profiles/${p.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                        <Image src={getProfileAvatar(p)} alt={p.display_name || 'User'} width={40} height={40} className="w-10 h-10 object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold truncate">{p.display_name || 'Kullanıcı'}</div>
                                        <div className="text-[10px] text-gray-500 truncate">{p.id}</div>
                                    </div>
                                    <div className="ml-auto text-[10px] text-gray-400">
                                        {p.users?.email || '—'}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
                <div className="glass-panel rounded-2xl p-4 space-y-3">
                    <div className="text-sm font-semibold">Kullanıcılar</div>
                    {users.length === 0 ? (
                        <div className="text-xs text-gray-500">Sonuç yok</div>
                    ) : (
                        <div className="space-y-2">
                            {users.map((u) => (
                                <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold truncate">{u.email || '—'}</div>
                                        <div className="text-[10px] text-gray-500 truncate">{u.id}</div>
                                    </div>
                                    <div className="ml-auto text-[10px] text-gray-400">
                                        {u.role || 'user'} • {u.is_premium ? 'Premium' : 'Standart'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-panel rounded-2xl p-4 space-y-3">
                    <div className="text-sm font-semibold">Cihaz Doğrulama</div>
                    {verifications.length === 0 ? (
                        <div className="text-xs text-gray-500">Sonuç yok</div>
                    ) : (
                        <div className="space-y-2 text-xs">
                            {verifications.map((v) => (
                                <div key={v.id} className="p-2 rounded-xl border border-white/10 bg-white/5">
                                    <div className="flex items-center justify-between">
                                        <span>{v.type} • {v.status}</span>
                                        <span className="text-gray-400">{new Date(v.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 truncate">User: {v.user_id}</div>
                                    {v.device_info && (
                                        <div className="text-[10px] text-gray-500 truncate">
                                            {String((v.device_info as { device_id?: string; deviceId?: string; fingerprint?: string; user_agent?: string }).device_id
                                            || (v.device_info as { deviceId?: string }).deviceId
                                            || (v.device_info as { fingerprint?: string }).fingerprint
                                            || (v.device_info as { user_agent?: string }).user_agent
                                            || '')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="glass-panel rounded-2xl p-4 space-y-3">
                    <div className="text-sm font-semibold">Havale Referansı</div>
                    {transfers.length === 0 ? (
                        <div className="text-xs text-gray-500">Sonuç yok</div>
                    ) : (
                        <div className="space-y-2 text-xs">
                            {transfers.map((t) => (
                                <div key={t.id} className="p-2 rounded-xl border border-white/10 bg-white/5">
                                    <div className="flex items-center justify-between">
                                        <span>{t.reference || '—'}</span>
                                        <span className="text-gray-400">{new Date(t.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="text-[10px] text-gray-500">User: {t.user_id}</div>
                                    <div className="text-[10px] text-gray-500">Tutar: {t.amount ?? 0} • {t.status || 'pending'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="glass-panel rounded-2xl p-4 space-y-3">
                <div className="text-sm font-semibold">Kart Ödemeleri</div>
                {payments.length === 0 ? (
                    <div className="text-xs text-gray-500">Sonuç yok</div>
                ) : (
                    <div className="space-y-2 text-xs">
                        {payments.map((p) => (
                            <div key={p.id} className="p-2 rounded-xl border border-white/10 bg-white/5">
                                <div className="flex items-center justify-between">
                                    <span>{p.kind}</span>
                                    <span className="text-gray-400">{new Date(p.created_at).toLocaleString()}</span>
                                </div>
                                <div className="text-[10px] text-gray-500">Provider: {p.provider || '—'}</div>
                                {p.metadata && (
                                    <div className="text-[10px] text-gray-500 truncate">
                                        Ref: {String(
                                            (p.metadata as { reference?: string; ref?: string; transaction_id?: string; payment_id?: string; order_id?: string }).reference
                                            || (p.metadata as { ref?: string }).ref
                                            || (p.metadata as { transaction_id?: string }).transaction_id
                                            || (p.metadata as { payment_id?: string }).payment_id
                                            || (p.metadata as { order_id?: string }).order_id
                                            || ''
                                        )}
                                    </div>
                                )}
                                <div className="text-[10px] text-gray-500">
                                    {p.amount} {p.currency} • {p.status || 'pending'}
                                </div>
                                <div className="text-[10px] text-gray-500">ID: {p.id}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}