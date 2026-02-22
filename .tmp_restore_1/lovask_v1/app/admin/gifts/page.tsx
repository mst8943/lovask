'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Plus, Save, Trash2, Upload } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
type GiftRow = {
    id: string
    name: string
    price: number
    image_url?: string | null
    is_active: boolean
}
export default function AdminGiftsPage() {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<GiftRow[]>([])
    const [creating, setCreating] = useState(false)
    const [uploadingId, setUploadingId] = useState<string | null>(null)
    const [form, setForm] = useState({ name: '', price: 0, image_url: '', is_active: true })
    const loadData = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('gifts')
            .select('*')
            .order('price', { ascending: true })
        if (!error) setRows((data || []) as GiftRow[])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void loadData()
        }, 0)
        return () => clearTimeout(id)
    }, [loadData])
    const handleCreate = async () => {
        if (!form.name.trim()) return
        setCreating(true)
        try {
            const { error } = await supabase.from('gifts').insert({
                name: form.name.trim(),
                price: Number(form.price) || 0,
                image_url: form.image_url || null,
                is_active: form.is_active,
            })
            if (error) throw error
            setForm({ name: '', price: 0, image_url: '', is_active: true })
            await loadData()
        } finally {
            setCreating(false)
        }
    }
    const handleUpdate = async (row: GiftRow) => {
        const { error } = await supabase
            .from('gifts')
            .update({
                name: row.name,
                price: row.price,
                image_url: row.image_url || null,
                is_active: row.is_active,
            })
            .eq('id', row.id)
        if (error) throw error
    }
    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('gifts').delete().eq('id', id)
        if (error) throw error
        await loadData()
    }
    const safeName = (name: string) =>
        name
            .toLowerCase()
            .replace(/[^a-z0-9._-]/g, '-')
            .replace(/-+/g, '-')
    const uploadFile = async (file: File, path: string) => {
        const cleanPath = path
            .split('/')
            .map((part, idx) => (idx === path.split('/').length - 1 ? safeName(part) : part))
            .join('/')
        const { error } = await supabase.storage
            .from('gifts')
            .upload(cleanPath, file, { cacheControl: '3600', upsert: false })
        if (error) throw error
        const { data } = supabase.storage.from('gifts').getPublicUrl(cleanPath)
        return data.publicUrl
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
            <div>
                <h1 className="text-2xl font-bold">Hediye Yönetimi</h1>
                <p className="text-sm text-gray-400">Hediye listesi ve görseller</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl space-y-3">
                <div className="text-sm font-semibold">Yeni Hediye</div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <div className="space-y-1">
                        <div className="text-sm text-gray-300">Ad</div>
                        <input
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Ad"
                            className="glass-input px-3 py-2 rounded-xl border border-white/10"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-gray-300">Fiyat (jeton)</div>
                        <input
                            type="number"
                            value={form.price}
                            onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                            placeholder="Fiyat"
                            className="glass-input px-3 py-2 rounded-xl border border-white/10"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="text-sm text-gray-300">Görsel URL</div>
                        <input
                            value={form.image_url}
                            onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                            placeholder="Görsel URL (opsiyonel)"
                            className="glass-input px-3 py-2 rounded-xl border border-white/10"
                        />
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                        />
                        Aktif
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Upload size={14} />
                        Görsel Yükle
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                const url = await uploadFile(file, `temp/${Date.now()}-${file.name}`)
                                setForm((prev) => ({ ...prev, image_url: url }))
                                e.currentTarget.value = ''
                            }}
                        />
                    </label>
                </div>
                {form.image_url && (
                    <Image src={form.image_url} alt="Preview" width={64} height={64} className="w-16 h-16 rounded-lg object-cover" />
                )}
                <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-200 text-xs flex items-center gap-2"
                >
                    <Plus size={14} />
                    Ekle
                </button>
            </div>
            <div className="space-y-3">
                {rows.map((row) => (
                    <div key={row.id} className="glass-panel p-4 rounded-2xl">
                        <div className="flex items-center gap-3 mb-3">
                            {row.image_url ? (
                                <Image src={row.image_url} alt={row.name} width={56} height={56} className="w-14 h-14 rounded-lg object-cover" />
                            ) : (
                                <div className="w-14 h-14 rounded-lg bg-white/5" />
                            )}
                            <div className="text-sm font-semibold">{row.name}</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                            <div className="space-y-1">
                                <div className="text-sm text-gray-300">Ad</div>
                                <input
                                    value={row.name}
                                    onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, name: e.target.value } : r))}
                                    className="glass-input px-3 py-2 rounded-xl border border-white/10"
                                />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm text-gray-300">Fiyat (jeton)</div>
                                <input
                                    type="number"
                                    value={row.price}
                                    onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, price: Number(e.target.value) } : r))}
                                    className="glass-input px-3 py-2 rounded-xl border border-white/10"
                                />
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm text-gray-300">Görsel URL</div>
                                <input
                                    value={row.image_url || ''}
                                    onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, image_url: e.target.value } : r))}
                                    className="glass-input px-3 py-2 rounded-xl border border-white/10"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-xs">
                                <input
                                    type="checkbox"
                                    checked={row.is_active}
                                    onChange={(e) => setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, is_active: e.target.checked } : r))}
                                />
                                Aktif
                            </label>
                            <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <Upload size={14} />
                                {uploadingId === row.id ? 'Y?kleniyor...' : 'G?rsel Y?kle'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const input = e.currentTarget
                                        const file = input.files?.[0]
                                        if (!file) return
                                        setUploadingId(row.id)
                                        try {
                                            const url = await uploadFile(file, `${row.id}/${Date.now()}-${file.name}`)
                                            setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, image_url: url } : r))
                                        } finally {
                                            setUploadingId(null)
                                        }
                                        if (input) input.value = ''
                                    }}
                                />
                            </label>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <button
                                onClick={() => handleUpdate(row)}
                                className="px-3 py-2 rounded-lg bg-white/10 text-xs flex items-center gap-2"
                            >
                                <Save size={14} />
                                Kaydet
                            </button>
                            <button
                                onClick={() => handleDelete(row.id)}
                                className="px-3 py-2 rounded-lg bg-red-500/20 text-red-200 text-xs flex items-center gap-2"
                            >
                                <Trash2 size={14} />
                                Sil
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
