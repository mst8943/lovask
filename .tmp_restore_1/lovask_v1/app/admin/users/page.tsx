'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Coins, Crown, Save, X, User, Copy, Mail, ShieldAlert, Ban, CheckCircle2, Eye, Edit2, FileText, History } from 'lucide-react'
import Image from 'next/image'
import { getPublicImageVariant, isPublicStorageUrl } from '@/utils/media'
import Spinner from '@/components/ui/Spinner'
import { usePresenceStore } from '@/store/usePresenceStore'
type UserRow = {
    id: string
    display_name: string | null
    is_verified: boolean | null
    photos: string[] | string | null
    users: {
        email: string | null
        role: 'user' | 'admin' | 'bot' | string
        coin_balance: number | null
        is_premium: boolean | null
        premium_expires_at: string | null
        is_banned?: boolean | null
        ban_reason?: string | null
        ban_expires_at?: string | null
        last_active_at?: string | null
    } | null
}
type EditForm = {
    id: string
    display_name: string
    is_verified: boolean
    role: string
    coin_balance: number
    is_premium: boolean
    premium_expires_at: string
    email: string
}
type ActionModal = {
    type: 'coins' | 'premium' | 'ban' | 'role'
    targets: string[]
    title: string
}
export default function AdminUsersPage() {
    const searchParams = useSearchParams()
    const [rows, setRows] = useState<UserRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState('')
    const [rowLimit, setRowLimit] = useState<number>(25)
    const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'bot'>('all')
    const [statusFilter, setStatusFilter] = useState<'all' | 'banned' | 'premium' | 'verified' | 'bot'>('all')
    const [selected, setSelected] = useState<UserRow | null>(null)
    const [edit, setEdit] = useState<EditForm | null>(null)
    const [saving, setSaving] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [actionModal, setActionModal] = useState<ActionModal | null>(null)
    const [actionValue, setActionValue] = useState<number>(0)
    const [roleValue, setRoleValue] = useState<'user' | 'admin' | 'bot'>('user')
    const [banReason, setBanReason] = useState('Kural ihlali')
    const [banDays, setBanDays] = useState<number>(7)
    const [auditTarget, setAuditTarget] = useState<UserRow | null>(null)
    const [auditRows, setAuditRows] = useState<Array<{ id: string; action: string; created_at: string; metadata: Record<string, unknown> }>>([])
    const [auditLoading, setAuditLoading] = useState(false)
    const [profileTarget, setProfileTarget] = useState<UserRow | null>(null)
    const [profileLoading, setProfileLoading] = useState(false)
    const [profileData, setProfileData] = useState<{
        support: Array<{ id: string; subject: string; status: string; created_at: string }>
        reports: Array<{ id: string; reason: string | null; status: string; created_at: string }>
        verifications: Array<{ id: string; type: string; status: string; created_at: string }>
        transactions: Array<{ id: string; type: string; amount: number; created_at: string }>
    }>({ support: [], reports: [], verifications: [], transactions: [] })
    const supabase = useMemo(() => createClient(), [])
    const [riskMap, setRiskMap] = useState<Record<string, number>>({})
    const [diffTarget, setDiffTarget] = useState<UserRow | null>(null)
    const [diffRows, setDiffRows] = useState<Array<{ id: string; snapshot: Record<string, unknown>; created_at: string }>>([])
    const [diffLoading, setDiffLoading] = useState(false)
    const [now, setNow] = useState(() => Date.now())
    const onlineUsers = usePresenceStore((s) => s.onlineUsers)
    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, is_verified, photos, users:users(email,role,coin_balance,is_premium,premium_expires_at,is_banned,ban_reason,ban_expires_at,last_active_at)')
            .order('updated_at', { ascending: false })
            .limit(rowLimit)
        if (error) setError(error.message)
        if (data) {
            const nextRows = data as unknown as UserRow[]
            setRows(nextRows)
            const ids = nextRows.map((r) => r.id)
            if (ids.length > 0) {
                const { data: risks } = await supabase.from('admin_risk_scores').select('user_id,score').in('user_id', ids)
                const map: Record<string, number> = {}
                for (const r of (risks || []) as Array<{ user_id: string; score: number }>) {
                    map[r.user_id] = r.score
                }
                setRiskMap(map)
            }
        }
        setLoading(false)
    }, [supabase, rowLimit])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    useEffect(() => {
        const q = searchParams.get('q')
        if (q) setQuery(q)
    }, [searchParams])
    useEffect(() => {
        if (query) {
            const url = new URL(window.location.href)
            url.searchParams.set('q', query)
            window.history.replaceState({}, '', url)
        }
    }, [query])
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60000)
        return () => clearInterval(id)
    }, [])
    const toggleVerify = async (id: string, value: boolean) => {
        await supabase.from('profiles').update({ is_verified: value }).eq('id', id)
        await logAdminAction('verify_toggle', id, { value })
        await load()
    }
    const logAdminAction = async (action: string, targetId: string, metadata?: Record<string, unknown>) => {
        const { data: auth } = await supabase.auth.getUser()
        await supabase.from('admin_audit_logs').insert({
            admin_id: auth.user?.id || null,
            action,
            target_table: 'users',
            target_id: targetId,
            metadata: metadata || {},
        })
    }
    const applyCoins = async (targets: string[], amount: number) => {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user?.id) return
        const { data: allowed } = await supabase.rpc('check_admin_rate_limit', {
            p_admin_id: auth.user.id,
            p_action: 'coins_adjust',
            p_window_seconds: 60,
            p_max_count: 20,
        })
        if (!allowed) return
        for (const id of targets) {
            const { data } = await supabase.from('users').select('coin_balance').eq('id', id).maybeSingle()
            const current = Number((data as { coin_balance?: number } | null)?.coin_balance || 0)
            await supabase.from('users').update({ coin_balance: current + amount }).eq('id', id)
            await logAdminAction('coins_adjust', id, { amount })
        }
        await load()
    }
    const applyPremiumDays = async (targets: string[], days: number) => {
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user?.id) return
        const { data: allowed } = await supabase.rpc('check_admin_rate_limit', {
            p_admin_id: auth.user.id,
            p_action: 'premium_extend',
            p_window_seconds: 60,
            p_max_count: 20,
        })
        if (!allowed) return
        const now = Date.now()
        for (const id of targets) {
            const { data } = await supabase.from('users').select('premium_expires_at').eq('id', id).maybeSingle()
            const existing = (data as { premium_expires_at?: string | null } | null)?.premium_expires_at
            const base = existing ? new Date(existing).getTime() : now
            const next = new Date(base + days * 24 * 60 * 60 * 1000).toISOString()
            await supabase.from('users').update({ is_premium: true, premium_expires_at: next }).eq('id', id)
            await logAdminAction('premium_extend', id, { days })
        }
        await load()
    }
    const applyBan = async (targets: string[], days: number, reason: string) => {
        const ok = window.confirm('Ban/suspend islemi uygulansin mi?')
        if (!ok) return
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user?.id) return
        const { data: allowed } = await supabase.rpc('check_admin_rate_limit', {
            p_admin_id: auth.user.id,
            p_action: 'ban_user',
            p_window_seconds: 60,
            p_max_count: 10,
        })
        if (!allowed) return
        const now = Date.now()
        const expiresAt = days > 0 ? new Date(now + days * 24 * 60 * 60 * 1000).toISOString() : null
        for (const id of targets) {
            await supabase.from('users').update({
                is_banned: true,
                ban_reason: reason,
                ban_expires_at: expiresAt,
            }).eq('id', id)
            await logAdminAction('ban_user', id, { reason, days })
            await supabase.from('notifications').insert({
                user_id: id,
                type: 'ban',
                payload: {
                    title: 'Hesap kısıtlandı',
                    body: days > 0 ? `${days} gün boyunca erişim kısıtlandı.` : 'Hesabın süresiz olarak kısıtlandı.',
                },
            })
        }
        await load()
    }
    const liftBan = async (targets: string[]) => {
        for (const id of targets) {
            await supabase.from('users').update({
                is_banned: false,
                ban_reason: null,
                ban_expires_at: null,
            }).eq('id', id)
            await logAdminAction('unban_user', id, {})
        }
        await load()
    }
    const loadAuditLogs = async (userId: string) => {
        setAuditLoading(true)
        const { data } = await supabase
            .from('admin_audit_logs')
            .select('id, action, created_at, metadata')
            .eq('target_id', userId)
            .order('created_at', { ascending: false })
            .limit(50)
        setAuditRows((data || []) as Array<{ id: string; action: string; created_at: string; metadata: Record<string, unknown> }>)
        setAuditLoading(false)
    }
    const applyRole = async (targets: string[], role: 'user' | 'admin' | 'bot') => {
        const ok = window.confirm('Rol degisikligi uygulansin mi?')
        if (!ok) return
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user?.id) return
        const { data: allowed } = await supabase.rpc('check_admin_rate_limit', {
            p_admin_id: auth.user.id,
            p_action: 'role_update',
            p_window_seconds: 60,
            p_max_count: 10,
        })
        if (!allowed) return
        for (const id of targets) {
            await supabase.from('users').update({ role }).eq('id', id)
            await logAdminAction('role_update', id, { role })
        }
        await load()
    }
    const loadUser360 = async (user: UserRow) => {
        setProfileTarget(user)
        setProfileLoading(true)
        const [supportRes, reportsRes, verRes, txRes] = await Promise.all([
            supabase.from('support_tickets').select('id,subject,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('reports').select('id,reason,status,created_at').eq('reported_id', user.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('user_verifications').select('id,type,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('transactions').select('id,type,amount,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        ])
        setProfileData({
            support: (supportRes.data || []) as Array<{ id: string; subject: string; status: string; created_at: string }>,
            reports: (reportsRes.data || []) as Array<{ id: string; reason: string | null; status: string; created_at: string }>,
            verifications: (verRes.data || []) as Array<{ id: string; type: string; status: string; created_at: string }>,
            transactions: (txRes.data || []) as Array<{ id: string; type: string; amount: number; created_at: string }>,
        })
        setProfileLoading(false)
    }
    const selectedForm = useMemo(() => {
        if (!selected) return null
        return {
            id: selected.id,
            display_name: selected.display_name || '',
            is_verified: !!selected.is_verified,
            role: selected.users?.role || 'user',
            coin_balance: Number(selected.users?.coin_balance || 0),
            is_premium: !!selected.users?.is_premium,
            premium_expires_at: selected.users?.premium_expires_at || '',
            email: selected.users?.email || '',
        }
    }, [selected])
    const filteredRows = useMemo(() => {
        const term = query.trim().toLowerCase()
        return rows.filter((row) => {
            if (roleFilter !== 'all' && row.users?.role !== roleFilter) return false
            if (statusFilter === 'banned' && !row.users?.is_banned) return false
            if (statusFilter === 'premium' && !row.users?.is_premium) return false
            if (statusFilter === 'verified' && !row.is_verified) return false
            if (statusFilter === 'bot' && row.users?.role !== 'bot') return false
            if (!term) return true
            const haystack = `${row.id} ${row.display_name ?? ''} ${row.users?.email ?? ''}`.toLowerCase()
            return haystack.includes(term)
        })
    }, [query, roleFilter, rows, statusFilter])
    const exportCsv = () => {
        const header = ['id', 'display_name', 'email', 'role', 'is_verified', 'is_premium', 'coin_balance', 'is_banned', 'ban_reason']
        const lines = filteredRows.map((row) => {
            const cells = [
                row.id,
                row.display_name ?? '',
                row.users?.email ?? '',
                row.users?.role ?? '',
                row.is_verified ? 'true' : 'false',
                row.users?.is_premium ? 'true' : 'false',
                row.users?.coin_balance ?? 0,
                row.users?.is_banned ? 'true' : 'false',
                row.users?.ban_reason ?? '',
            ]
            return cells.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
        })
        const csv = [header.join(','), ...lines].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }
    const toLocalInput = (value?: string | null) => {
        if (!value) return ''
        if (value.includes('T') && value.length >= 16 && !value.endsWith('Z')) {
            return value.slice(0, 16)
        }
        const d = new Date(value)
        if (Number.isNaN(d.getTime())) return ''
        const pad = (n: number) => n.toString().padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    const fromLocalInput = (value: string) => {
        if (!value) return null
        const d = new Date(value)
        if (Number.isNaN(d.getTime())) return null
        return d.toISOString()
    }
    const handleSave = async (form: EditForm) => {
        if (!form) return
        setSaving(true)
        try {
            await supabase.from('profiles').update({
                display_name: form.display_name,
                is_verified: form.is_verified,
            }).eq('id', form.id)
            await supabase.from('users').update({
                role: form.role,
                coin_balance: Number(form.coin_balance || 0),
                is_premium: form.is_premium,
                premium_expires_at: form.is_premium ? (fromLocalInput(form.premium_expires_at) || null) : null,
            }).eq('id', form.id)
            await supabase.from('admin_profile_snapshots').insert({
                user_id: form.id,
                snapshot: {
                    profile: { display_name: form.display_name, is_verified: form.is_verified },
                    user: {
                        role: form.role,
                        coin_balance: Number(form.coin_balance || 0),
                        is_premium: form.is_premium,
                        premium_expires_at: form.premium_expires_at || null,
                    },
                },
            })
            await load()
            setSelected(null)
            setEdit(null)
        } finally {
            setSaving(false)
        }
    }
    const loadDiff = async (userId: string) => {
        setDiffLoading(true)
        const { data } = await supabase
            .from('admin_profile_snapshots')
            .select('id,snapshot,created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(2)
        setDiffRows((data || []) as Array<{ id: string; snapshot: Record<string, unknown>; created_at: string }>)
        setDiffLoading(false)
    }
    const getPhotoUrl = (photos: unknown): string | null => {
        if (!photos) return null
        if (Array.isArray(photos)) return photos[0] || null
        if (typeof photos === 'string') {
            const trimmed = photos.trim()
            if (!trimmed) return null
            if (trimmed.startsWith('[')) {
                try {
                    const arr = JSON.parse(trimmed)
                    if (Array.isArray(arr)) return arr[0] || null
                } catch {
                    return trimmed
                }
            }
            return trimmed
        }
        return null
    }
    const getSafeImageSrc = (url: string | null): string | null => {
        if (!url) return null
        if (isPublicStorageUrl(url)) {
            return getPublicImageVariant(url, { width: 80, height: 80, quality: 70 })
        }
        if (url.startsWith('http') || url.startsWith('/')) return url
        return `/${url}`
    }
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Kullanıcılar</h1>
                    <p className="text-sm text-slate-400">Profil doğrulama ve rol kontrolü</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                    Kullanıcı
                </div>
            </div>
            {error && (
                <div className="p-3 text-sm text-red-700 bg-red-500/10 border border-red-500/20 rounded-lg">
                    {error}
                </div>
            )}
            <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
                <button
                    onClick={() => void load()}
                    className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                >
                    Yenile
                </button>
                <button
                    onClick={exportCsv}
                    className="px-3 py-1.5 rounded-full border bg-slate-900 text-white border-slate-900"
                >
                    CSV
                </button>
                <button
                    onClick={() => navigator.clipboard.writeText(filteredRows.map((r) => r.id).join('\n'))}
                    className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                >
                    ID kopyala
                </button>
                <button
                    onClick={() => navigator.clipboard.writeText(filteredRows.map((r) => r.users?.email || '').filter(Boolean).join('\n'))}
                    className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                >
                    Email kopyala
                </button>
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ara: id / ad / email"
                    className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as 'all' | 'user' | 'admin' | 'bot')}
                    className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                >
                    <option value="all">Tüm Roller</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="bot">Bot</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'banned' | 'premium' | 'verified' | 'bot')}
                    className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200"
                >
                    <option value="all">Tüm Durumlar</option>
                    <option value="banned">Banlı</option>
                    <option value="premium">Premium</option>
                    <option value="verified">Doğrulandı</option>
                    <option value="bot">Botlar Sadece</option>
                </select>
                <select
                    value={rowLimit}
                    onChange={(e) => setRowLimit(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-full border bg-white text-slate-600 border-slate-200 min-w-[90px]"
                >
                    <option value={25}>25 Kayıt</option>
                    <option value={50}>50 Kayıt</option>
                    <option value={100}>100 Kayıt</option>
                    <option value={200}>200 Kayıt</option>
                    <option value={500}>500 Kayıt</option>
                </select>
                <div className="ml-auto text-[10px] text-slate-400">
                    {filteredRows.length}/{rows.length}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-xs text-slate-400">Toplam</div>
                    <div className="text-xl font-semibold">{filteredRows.length}</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-xs text-slate-400">Premium</div>
                    <div className="text-xl font-semibold text-amber-300">{filteredRows.filter((r) => r.users?.is_premium).length}</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-xs text-slate-400">Banlı</div>
                    <div className="text-xl font-semibold text-rose-300">{filteredRows.filter((r) => r.users?.is_banned).length}</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-xs text-slate-400">Doğrulandi</div>
                    <div className="text-xl font-semibold text-emerald-300">{filteredRows.filter((r) => r.is_verified).length}</div>
                </div>
            </div>
            {selectedIds.length > 0 && (
                <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-slate-600">{selectedIds.length} Seçili</span>
                    <button
                        onClick={() => navigator.clipboard.writeText(selectedIds.join('\n'))}
                        className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-gray-200"
                    >
                        Seçili ID kopyala
                    </button>
                    <button
                        onClick={() => Promise.all(selectedIds.map((id) => toggleVerify(id, true))).then(() => setSelectedIds([]))}
                        className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 flex items-center gap-1"
                    >
                        <Check size={12} /> Toplu doğrula
                    </button>
                    <button
                        onClick={() => Promise.all(selectedIds.map((id) => toggleVerify(id, false))).then(() => setSelectedIds([]))}
                        className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-gray-200"
                    >
                        doğrulamayı kaldır
                    </button>
                    <button
                        onClick={() => {
                            setActionValue(50)
                            setActionModal({ type: 'coins', targets: selectedIds, title: 'Toplu jeton ekle' })
                        }}
                        className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-gray-200 flex items-center gap-1"
                    >
                        <Coins size={12} /> Jeton ekle
                    </button>
                    <button
                        onClick={() => {
                            setActionValue(30)
                            setActionModal({ type: 'premium', targets: selectedIds, title: 'Toplu premium gün ekle' })
                        }}
                        className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-gray-200 flex items-center gap-1"
                    >
                        <Crown size={12} /> Premium ekle
                    </button>
                    <button
                        onClick={() => {
                            setBanReason('Kural ihlali')
                            setBanDays(7)
                            setActionModal({ type: 'ban', targets: selectedIds, title: 'Toplu ban/suspend' })
                        }}
                        className="px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700"
                    >
                        Toplu ban
                    </button>
                    <button
                        onClick={() => {
                            setRoleValue('user')
                            setActionModal({ type: 'role', targets: selectedIds, title: 'Toplu rol ata' })
                        }}
                        className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-gray-200"
                    >
                        Toplu rol
                    </button>
                    <button
                        onClick={() => liftBan(selectedIds).then(() => setSelectedIds([]))}
                        className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700"
                    >
                        Ban kaldır
                    </button>
                    <button
                        onClick={() => setSelectedIds([])}
                        className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-gray-200"
                    >
                        Seçimi temizle
                    </button>
                </div>
            )}
            <div className="w-full glass-panel rounded-2xl overflow-x-auto shadow-sm border border-slate-200">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                            <th className="px-4 py-3 text-center w-12">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-pink-500 focus:ring-pink-500"
                                    checked={filteredRows.length > 0 && selectedIds.length === filteredRows.length}
                                    onChange={(e) => {
                                        setSelectedIds(e.target.checked ? filteredRows.map((r) => r.id) : [])
                                    }}
                                />
                            </th>
                            <th className="px-4 py-3">Kullanıcı</th>
                            <th className="px-4 py-3 text-center">Rol</th>
                            <th className="px-4 py-3 text-center">Bakiye</th>
                            <th className="px-4 py-3">Durum</th>
                            <th className="px-4 py-3 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredRows.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-4 py-3 text-center align-middle">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-pink-500 focus:ring-pink-500"
                                        checked={selectedIds.includes(r.id)}
                                        onChange={(e) => {
                                            setSelectedIds((prev) => e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id))
                                        }}
                                    />
                                </td>
                                <td className="px-4 py-3 align-middle">
                                    <div className="flex items-center gap-3">
                                        <div className="shrink-0 relative">
                                            {getSafeImageSrc(getPhotoUrl(r.photos)) ? (
                                                <button type="button" onClick={() => setPreviewUrl(getSafeImageSrc(getPhotoUrl(r.photos)))} className="block focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-full">
                                                    <Image src={getSafeImageSrc(getPhotoUrl(r.photos)) as string} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                                                </button>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                                    <User size={18} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-slate-900 truncate">{r.display_name || 'İsimsiz'}</span>
                                            <span className="text-xs text-slate-500 truncate">{r.users?.email || '-'}</span>
                                            <span className={`inline-flex items-center gap-1 w-max mt-1 px-2 py-0.5 rounded-full text-[10px] border ${onlineUsers.has(r.id) || (r.users?.last_active_at && now - new Date(r.users.last_active_at).getTime() < 10 * 60 * 1000) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${onlineUsers.has(r.id) || (r.users?.last_active_at && now - new Date(r.users.last_active_at).getTime() < 10 * 60 * 1000) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                {onlineUsers.has(r.id) || (r.users?.last_active_at && now - new Date(r.users.last_active_at).getTime() < 10 * 60 * 1000) ? 'Çevrim içi' : 'Çevrimdışı'}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title={r.id}>
                                                    {r.id.split('-')[0]}...
                                                </span>
                                                <button onClick={() => navigator.clipboard.writeText(r.id)} className="text-slate-400 hover:text-slate-700 focus:outline-none p-0.5 rounded hover:bg-slate-200" title="ID Kopyala">
                                                    <Copy size={12} />
                                                </button>
                                                {r.users?.email && (
                                                    <button onClick={() => navigator.clipboard.writeText(r.users?.email || '')} className="text-slate-400 hover:text-slate-700 focus:outline-none p-0.5 rounded hover:bg-slate-200" title="Email Kopyala">
                                                        <Mail size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 align-middle text-center">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${r.users?.role === 'admin' ? "bg-purple-50 text-purple-700 border border-purple-200" :
                                        r.users?.role === 'bot' ? "bg-slate-100 text-slate-600 border border-slate-200" :
                                            "bg-blue-50 text-blue-700 border border-blue-200"
                                        }`}>
                                        {r.users?.role || 'user'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 align-middle text-center">
                                    <div className="inline-flex items-center justify-center gap-1.5 font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs w-20">
                                        <Coins size={14} className="text-yellow-500 shrink-0" />
                                        <span className="truncate">{Number(r.users?.coin_balance || 0).toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 align-middle">
                                    <div className="flex flex-col gap-1.5 items-start">
                                        {r.is_verified ? (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={12} /> Doğrulandı</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200">Onaysız Profil</span>
                                        )}
                                        {r.users?.is_premium && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"><Crown size={12} /> Premium</span>
                                        )}
                                        {r.users?.is_banned && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200"><Ban size={12} /> Banlı <span className="opacity-70">{r.users?.ban_expires_at ? `(${new Date(r.users.ban_expires_at).toLocaleDateString()})` : '(Süresiz)'}</span></span>
                                        )}
                                        {riskMap[r.id] !== undefined && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200"><ShieldAlert size={12} /> Risk: {riskMap[r.id]}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 align-middle text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button title="Düzenle" onClick={() => {
                                            setSelected(r); setEdit({ id: r.id, display_name: r.display_name || '', is_verified: !!r.is_verified, role: r.users?.role || 'user', coin_balance: Number(r.users?.coin_balance || 0), is_premium: !!r.users?.is_premium, premium_expires_at: r.users?.premium_expires_at || '', email: r.users?.email || '' })
                                        }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button title="360° Görüntüle" onClick={() => void loadUser360(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                            <Eye size={16} />
                                        </button>
                                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                        <button title="Jeton Ekle/Çıkar" onClick={() => { setActionValue(50); setActionModal({ type: 'coins', targets: [r.id], title: 'Jeton ekle' }) }} className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors">
                                            <Coins size={16} />
                                        </button>
                                        <button title="Premium Gün Ekle" onClick={() => { setActionValue(30); setActionModal({ type: 'premium', targets: [r.id], title: 'Premium gün ekle' }) }} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                                            <Crown size={16} />
                                        </button>
                                        {r.is_verified ? (
                                            <button title="Doğrulamayı Kaldır" onClick={() => toggleVerify(r.id, false)} className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors">
                                                <CheckCircle2 size={16} />
                                            </button>
                                        ) : (
                                            <button title="Profili Doğrula" onClick={() => toggleVerify(r.id, true)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                                                <CheckCircle2 size={16} />
                                            </button>
                                        )}
                                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                        {r.users?.is_banned ? (
                                            <button title="Banı Kaldır" onClick={() => liftBan([r.id])} className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors">
                                                <Ban size={16} />
                                            </button>
                                        ) : (
                                            <button title="Ban/Suspend" onClick={() => { setBanReason('Kural ihlali'); setBanDays(7); setActionModal({ type: 'ban', targets: [r.id], title: 'Ban / Suspend' }) }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                                <Ban size={16} />
                                            </button>
                                        )}
                                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                        <button title="İşlem Geçmişi (Audit Logs)" onClick={() => { setAuditTarget(r); void loadAuditLogs(r.id) }} className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors">
                                            <FileText size={16} />
                                        </button>
                                        <button title="Veri Geçmişi (Diffs)" onClick={() => { setDiffTarget(r); void loadDiff(r.id) }} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                                            <History size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {selectedForm && edit && (
                <div onClick={() => { setSelected(null); setEdit(null) }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div onClick={(e) => e.stopPropagation()} className="glass-panel w-full max-w-xl p-5 rounded-2xl space-y-4 border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Kullanıcı Düzenle</h2>
                                <div className="text-xs text-slate-400">{selectedForm.email || selectedForm.id}</div>
                            </div>
                            <button onClick={() => { setSelected(null); setEdit(null) }} className="p-2 rounded-full bg-slate-50">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                                value={edit.display_name}
                                onChange={(e) =>
                                    setEdit((prev) => (prev ? { ...prev, display_name: e.target.value } : prev))
                                }
                                placeholder="Ad Soyad"
                                className="px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            />
                            <input
                                value={edit.coin_balance}
                                type="number"
                                onChange={(e) =>
                                    setEdit((prev) => (prev ? { ...prev, coin_balance: Number(e.target.value) } : prev))
                                }
                                placeholder="Jeton"
                                className="px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            />
                            <select
                                value={edit.role}
                                onChange={(e) =>
                                    setEdit((prev) => (prev ? { ...prev, role: e.target.value } : prev))
                                }
                                className="px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="bot">Bot</option>
                            </select>
                            <label className="text-xs flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={edit.is_premium}
                                    onChange={(e) =>
                                        setEdit((prev) => (prev ? { ...prev, is_premium: e.target.checked } : prev))
                                    }
                                />
                                Premium
                            </label>
                            <label className="text-xs flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={edit.is_verified}
                                    onChange={(e) =>
                                        setEdit((prev) => (prev ? { ...prev, is_verified: e.target.checked } : prev))
                                    }
                                />
                                doğrulandı
                            </label>
                            <input
                                type="datetime-local"
                                value={toLocalInput(edit.premium_expires_at)}
                                onChange={(e) =>
                                    setEdit((prev) => (prev ? { ...prev, premium_expires_at: e.target.value } : prev))
                                }
                                className="px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            />
                        </div>
                        <button
                            disabled={saving}
                            onClick={() => handleSave(edit)}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-white flex items-center justify-center gap-2"
                        >
                            <Save size={16} />
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            )}
            {actionModal && (
                <div onClick={() => setActionModal(null)} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div onClick={(e) => e.stopPropagation()} className="glass-panel w-full max-w-md p-5 rounded-2xl space-y-4 border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">{actionModal.title}</h2>
                                <div className="text-xs text-slate-400">{actionModal.targets.length} Kullanıcı</div>
                            </div>
                            <button onClick={() => setActionModal(null)} className="p-2 rounded-full bg-slate-50">
                                <X size={16} />
                            </button>
                        </div>
                        {actionModal.type === 'ban' ? (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    placeholder="Ban nedeni"
                                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                                />
                                <input
                                    type="number"
                                    value={banDays}
                                    onChange={(e) => setBanDays(Number(e.target.value))}
                                    placeholder="gün (0 = süresiz)"
                                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                                />
                                <div className="text-[10px] text-slate-400">
                                    0 girersen süresiz ban uygulanır.
                                </div>
                            </div>
                        ) : actionModal.type === 'role' ? (
                            <select
                                value={roleValue}
                                onChange={(e) => setRoleValue(e.target.value as 'user' | 'admin' | 'bot')}
                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="bot">Bot</option>
                            </select>
                        ) : (
                            <input
                                type="number"
                                value={actionValue}
                                onChange={(e) => setActionValue(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-slate-200"
                            />
                        )}
                        <button
                            onClick={async () => {
                                if (actionModal.type === 'coins') {
                                    await applyCoins(actionModal.targets, actionValue)
                                } else if (actionModal.type === 'premium') {
                                    await applyPremiumDays(actionModal.targets, actionValue)
                                } else if (actionModal.type === 'role') {
                                    await applyRole(actionModal.targets, roleValue)
                                } else {
                                    await applyBan(actionModal.targets, banDays, banReason)
                                }
                                setActionModal(null)
                                setSelectedIds([])
                            }}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-white flex items-center justify-center gap-2"
                        >
                            <Save size={16} /> Uygula
                        </button>
                    </div>
                </div>
            )}

            {auditTarget && (
                <div onClick={() => setAuditTarget(null)} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div onClick={(e) => e.stopPropagation()} className="glass-panel w-full max-w-2xl p-5 rounded-2xl space-y-4 border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Audit Timeline</h2>
                                <div className="text-xs text-slate-400">{auditTarget.display_name || auditTarget.id}</div>
                            </div>
                            <button onClick={() => setAuditTarget(null)} className="p-2 rounded-full bg-slate-50">
                                <X size={16} />
                            </button>
                        </div>
                        {auditLoading ? (
                            <div className="text-sm text-slate-400">Yükleniyor...</div>
                        ) : auditRows.length === 0 ? (
                            <div className="text-sm text-slate-400">Kayıt yok.</div>
                        ) : (
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                                {auditRows.map((row) => (
                                    <div key={row.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold">{row.action}</div>
                                            <div className="text-slate-500">{new Date(row.created_at).toLocaleString()}</div>
                                        </div>
                                        {row.metadata && (
                                            <pre className="text-[10px] text-slate-400 mt-2 whitespace-pre-wrap">
                                                {JSON.stringify(row.metadata, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {profileTarget && (
                <div onClick={() => setProfileTarget(null)} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div onClick={(e) => e.stopPropagation()} className="glass-panel w-full max-w-3xl p-5 rounded-2xl space-y-4 border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Kullanıcı 360</h2>
                                <div className="text-xs text-slate-400">{profileTarget.display_name || profileTarget.users?.email || profileTarget.id}</div>
                            </div>
                            <button onClick={() => setProfileTarget(null)} className="p-2 rounded-full bg-slate-50">
                                <X size={16} />
                            </button>
                        </div>
                        {profileLoading ? (
                            <div className="text-sm text-slate-400">Yükleniyor...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="glass-panel p-4 rounded-2xl">
                                    <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Destek</div>
                                    {profileData.support.length === 0 ? (
                                        <div className="text-xs text-slate-400">Kayıt yok.</div>
                                    ) : (
                                        <div className="space-y-2 text-xs">
                                            {profileData.support.map((row) => (
                                                <div key={row.id} className="flex items-center justify-between">
                                                    <div className="truncate">{row.subject}</div>
                                                    <div className="text-slate-500">{row.status}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="glass-panel p-4 rounded-2xl">
                                    <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Raporlar</div>
                                    {profileData.reports.length === 0 ? (
                                        <div className="text-xs text-slate-400">Kayıt yok.</div>
                                    ) : (
                                        <div className="space-y-2 text-xs">
                                            {profileData.reports.map((row) => (
                                                <div key={row.id} className="flex items-center justify-between">
                                                    <div className="truncate">{row.reason || 'Rapor'}</div>
                                                    <div className="text-slate-500">{row.status}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="glass-panel p-4 rounded-2xl">
                                    <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">doğrulamalar</div>
                                    {profileData.verifications.length === 0 ? (
                                        <div className="text-xs text-slate-400">Kayıt yok.</div>
                                    ) : (
                                        <div className="space-y-2 text-xs">
                                            {profileData.verifications.map((row) => (
                                                <div key={row.id} className="flex items-center justify-between">
                                                    <div className="truncate">{row.type}</div>
                                                    <div className="text-slate-500">{row.status}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="glass-panel p-4 rounded-2xl">
                                    <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Ödemeler</div>
                                    {profileData.transactions.length === 0 ? (
                                        <div className="text-xs text-slate-400">Kayıt yok.</div>
                                    ) : (
                                        <div className="space-y-2 text-xs">
                                            {profileData.transactions.map((row) => (
                                                <div key={row.id} className="flex items-center justify-between">
                                                    <div className="truncate">{row.type}</div>
                                                    <div className="text-slate-500">{row.amount}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {diffTarget && (
                <div onClick={() => setDiffTarget(null)} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div onClick={(e) => e.stopPropagation()} className="glass-panel w-full max-w-2xl p-5 rounded-2xl space-y-4 border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">Profil Diff</h2>
                                <div className="text-xs text-slate-400">{diffTarget.display_name || diffTarget.id}</div>
                            </div>
                            <button onClick={() => setDiffTarget(null)} className="p-2 rounded-full bg-slate-50">
                                <X size={16} />
                            </button>
                        </div>
                        {diffLoading ? (
                            <div className="text-sm text-slate-400">Yükleniyor...</div>
                        ) : (
                            <div className="space-y-2 text-[10px] text-slate-600">
                                {diffRows.map((row) => (
                                    <div key={row.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                        <div className="text-slate-500">{new Date(row.created_at).toLocaleString()}</div>
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(row.snapshot, null, 2)}</pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {previewUrl && (
                <div onClick={() => setPreviewUrl(null)} className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div onClick={(e) => e.stopPropagation()} className="relative">
                        <Image
                            src={previewUrl}
                            alt="Preview"
                            width={900}
                            height={900}
                            className="max-w-[90vw] max-h-[80vh] rounded-2xl object-contain border border-slate-200"
                        />
                        <button
                            type="button"
                            onClick={() => setPreviewUrl(null)}
                            className="absolute -top-3 -right-3 px-3 py-1 rounded-full bg-slate-50 text-xs"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
