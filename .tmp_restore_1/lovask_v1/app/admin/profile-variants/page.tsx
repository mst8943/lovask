'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveProfileVariantApprovals, fetchProfileVariantsEnabled, saveProfileVariantsEnabled } from '@/services/appSettingsService'
import { useToast } from '@/components/ui/Toast'

type VariantRow = {
    id: string
    user_id: string
    name: string | null
    bio: string | null
    photos: string[] | null
    is_active: boolean | null
    created_at: string
    profiles?: { display_name: string | null } | null
}

export default function AdminProfileVariantsPage() {
    const supabase = useMemo(() => createClient(), [])
    const toast = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [variants, setVariants] = useState<VariantRow[]>([])
    const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
    const [hasConfig, setHasConfig] = useState(false)
    const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('pending')
    const [variantsEnabled, setVariantsEnabled] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const [{ data: approval }, { data: rows }, enabled] = await Promise.all([
                supabase.from('app_settings').select('value').eq('key', 'profile_variant_approvals').maybeSingle(),
                supabase
                    .from('profile_variants')
                    .select('id,user_id,name,bio,photos,is_active,created_at, profiles:profiles(display_name)')
                    .order('created_at', { ascending: false })
                    .limit(300),
                fetchProfileVariantsEnabled(),
            ])

            const approved = Array.isArray(approval?.value?.approved_ids) ? approval.value.approved_ids : []
            setApprovedIds(new Set(approved))
            setHasConfig(!!approval?.value)
            setVariantsEnabled(enabled)
            setVariants((rows || []) as VariantRow[])
            setLoading(false)
        }
        load()
    }, [supabase])

    const toggleApproval = (id: string) => {
        setApprovedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const save = async () => {
        setSaving(true)
        try {
            await saveProfileVariantApprovals(Array.from(approvedIds))
            setHasConfig(true)
            toast.push('Onay listesi kaydedildi.', 'success')
        } catch (err: unknown) {
            toast.push(err instanceof Error ? err.message : 'Kayit basarisiz.', 'error')
        } finally {
            setSaving(false)
        }
    }

    const filtered = useMemo(() => {
        if (filter === 'all') return variants
        if (filter === 'approved') return variants.filter((v) => approvedIds.has(v.id))
        return variants.filter((v) => !approvedIds.has(v.id))
    }, [filter, variants, approvedIds])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Profil Varyantlari</h1>
                    <p className="text-sm text-gray-400">Kullanicilarin profil varyantlarini onayla veya gizle.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={save}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-white/10 text-sm"
                    >
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
                <div>
                    <div className="text-sm font-semibold">Varyantlar Aktif</div>
                    <div className="text-xs text-gray-400">Pasif ise kullanici profillerinde gorunmez.</div>
                </div>
                <button
                    type="button"
                    onClick={async () => {
                        const next = !variantsEnabled
                        setVariantsEnabled(next)
                        try {
                            await saveProfileVariantsEnabled(next)
                            toast.push(next ? 'Varyantlar aktif edildi.' : 'Varyantlar pasif edildi.', 'success')
                        } catch (err: unknown) {
                            toast.push(err instanceof Error ? err.message : 'Guncelleme basarisiz.', 'error')
                            setVariantsEnabled(!next)
                        }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs border ${variantsEnabled ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' : 'bg-white/5 border-white/10 text-gray-300'}`}
                >
                    {variantsEnabled ? 'Aktif' : 'Pasif'}
                </button>
            </div>

            {!hasConfig && (
                <div className="glass-panel p-4 rounded-xl text-xs text-amber-300 border border-amber-500/20 bg-amber-500/10">
                    Onay sistemi aktif degil. Kaydet tusuna bastiginda aktif olur.
                </div>
            )}

            <div className="flex items-center gap-2 text-xs">
                {(['pending', 'approved', 'all'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-3 py-1.5 rounded-full border ${filter === key ? 'bg-pink-500/20 text-pink-200 border-pink-500/40' : 'bg-white/5 text-gray-300 border-white/10'}`}
                    >
                        {key === 'pending' ? 'Onay Bekleyen' : key === 'approved' ? 'Onayli' : 'Hepsi'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-sm text-gray-400">Yukleniyor...</div>
            ) : (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr] gap-0 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10 bg-white/5">
                        <div className="px-4 py-3">Kullanici</div>
                        <div className="px-4 py-3">Varyant</div>
                        <div className="px-4 py-3">Durum</div>
                        <div className="px-4 py-3 text-right">Onay</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {filtered.map((row) => {
                            const approved = approvedIds.has(row.id)
                            return (
                                <div key={row.id} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr] gap-0 text-sm">
                                    <div className="px-4 py-3">
                                        <div className="font-semibold">{row.profiles?.display_name || row.user_id}</div>
                                        <div className="text-[10px] text-gray-500">{new Date(row.created_at).toLocaleString()}</div>
                                    </div>
                                    <div className="px-4 py-3">
                                        <div className="font-semibold">{row.name || 'Varyant'}</div>
                                        <div className="text-[10px] text-gray-500 line-clamp-1">{row.bio || '—'}</div>
                                    </div>
                                    <div className="px-4 py-3">
                                        <span className={`text-[10px] px-2 py-1 rounded-full border ${approved ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' : 'bg-amber-500/10 text-amber-200 border-amber-500/30'}`}>
                                            {approved ? 'Onayli' : 'Beklemede'}
                                        </span>
                                    </div>
                                    <div className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => toggleApproval(row.id)}
                                            className={`px-3 py-1.5 rounded-full border text-xs ${approved ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' : 'bg-white/5 border-white/10 text-gray-300'}`}
                                        >
                                            {approved ? 'Kaldir' : 'Onayla'}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
