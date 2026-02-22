'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'

export default function AdminLoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/admin'
    const reason = searchParams.get('reason')
    const supabase = useMemo(() => createClient(), [])
    const { setSession } = useAuthStore()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: userRow } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
            if (userRow?.role === 'admin') {
                router.replace(redirectTo)
                return
            }
            await supabase.auth.signOut()
            setError('Bu hesap admin değil.')
        }
        void checkAdmin()
    }, [supabase, router, redirectTo])

    useEffect(() => {
        if (reason === 'forbidden') {
            setError('Bu hesap admin değil.')
        }
    }, [reason])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const { error: signInError, data } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (signInError) throw signInError
            const { data: userRow } = await supabase.from('users').select('role').eq('id', data.user.id).maybeSingle()
            if (userRow?.role !== 'admin') {
                await supabase.auth.signOut()
                setError('Bu hesap admin değil.')
                return
            }
            setSession(data.session)
            router.replace(redirectTo)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'E-posta veya şifre hatalı.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-16">
            <div className="w-full max-w-md space-y-8">
                <div className="space-y-3">
                    <div className="text-[11px] uppercase tracking-[0.32em] text-white/40">Lovask</div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                        Admin Girişi
                    </h1>
                    <p className="text-sm sm:text-base text-white/60">
                        Yetkili hesabınla giriş yap.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 ml-1">
                            E-Posta
                        </label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-white/5 border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-5 focus:border-white/40 focus:ring-0 transition-all"
                            placeholder="admin@lovask.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 ml-1">
                            Şifre
                        </label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-white/5 border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-5 focus:border-white/40 focus:ring-0 transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-3 text-sm text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className={clsx(
                            "w-full py-5 rounded-xl font-semibold text-base transition-all duration-300",
                            "bg-white text-black hover:bg-gray-100",
                            loading && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-3">
                                <Spinner className="w-5 h-5 animate-spin border-black" />
                                İşleniyor...
                            </span>
                        ) : (
                            'Giriş Yap'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    )
}
