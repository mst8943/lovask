'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
export default function AccountSettingsPage() {
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const router = useRouter()
    const supabase = createClient()
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error
            setSuccess('Şifre başarıyla güncellendi.')
            setPassword('')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Şifre güncellenemedi.')
        } finally {
            setLoading(false)
        }
    }
    const handleDeleteAccount = async () => {
        setConfirmOpen(true)
    }
    const confirmDelete = async () => {
        setDeleting(true)
        setError(null)
        setSuccess(null)
        try {
            const res = await fetch('/api/account/delete', { method: 'POST' })
            if (!res.ok) {
                const msg = await res.text()
                throw new Error(msg || 'Hesap silme başarısız.')
            }
            await supabase.auth.signOut()
            router.push('/register')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Hesap silme başarısız.')
        } finally {
            setDeleting(false)
        }
    }
    return (
        <div className="space-y-6 pb-8">
            <form onSubmit={handleChangePassword} className="glass-panel p-6 rounded-2xl space-y-4">
                <h2 className="font-semibold">Şifre Değiştir</h2>
                <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Yeni şifre"
                    className="text-white placeholder-gray-500"
                    required
                />
                {error && (
                    <div className="p-3 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 text-sm text-green-200 bg-green-500/10 border border-green-500/20 rounded-lg">
                        {success}
                    </div>
                )}
                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                >
                    {loading ? <Spinner className="w-5 h-5 animate-spin mx-auto" /> : 'Şifreyi Güncelle'}
                </Button>
            </form>
            <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h2 className="font-semibold text-red-400">Hesabı Sil</h2>
                <p className="text-sm text-gray-400">
                    Bu işlem geri alınamaz. Profilin, eşleşmelerin ve mesajların silinir.
                </p>
                <Button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    variant="destructive"
                    className="w-full"
                >
                    {deleting ? 'Siliniyor...' : 'Hesabımı Sil'}
                </Button>
            </div>
            <ConfirmDialog
                open={confirmOpen}
                title="Hesabı Sil"
                description="Bu işlem hesabını ve verilerini kalıcı olarak siler. Devam edilsin mi?"
                confirmText="Sil"
                cancelText="Vazgeç"
                variant="danger"
                onClose={() => setConfirmOpen(false)}
                onConfirm={async () => {
                    setConfirmOpen(false)
                    await confirmDelete()
                }}
            />
        </div>
    )
}
