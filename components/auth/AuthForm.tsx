'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import { ArrowRight, Mail } from 'lucide-react'

interface AuthFormProps {
    type: 'login' | 'register'
}

export default function AuthForm({ type }: AuthFormProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()
    const { setSession } = useAuthStore()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            if (type === 'register') {
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback`,
                    },
                })
                if (error) throw error
                // If email confirmation is disabled, user is logged in immediately
                if (data.session) {
                    setSession(data.session)
                    router.push('/onboarding')
                } else {
                    // Email confirmation required
                    setSuccess('Kayıt başarılı! Lütfen e-postanı doğrula.')
                }
            } else {
                const { error, data } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                setSession(data.session)
                // Check if user has completed onboarding
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('display_name')
                    .eq('id', data.user.id)
                    .maybeSingle()
                if (profileError || !profile || !profile.display_name) {
                    router.push('/onboarding')
                } else {
                    router.push('/feed')
                }
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'E-posta veya şifre hatalı.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        })
    }

    const handleMagicLink = async () => {
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            if (!email) {
                setError('Lütfen önce e-posta adresini gir.')
                return
            }
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            })
            if (error) throw error
            setSuccess('Sihirli link gönderildi. Gelen kutunu kontrol et.')
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Bir hata oluştu.'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full space-y-10">
            <div className="space-y-6">
                <Link href="/" className="block -ml-1.5 transform-gpu sm:-ml-2">
                    <Image
                        src="/lovask_wordmark_logo_svg.svg"
                        alt="Lovask"
                        width={160}
                        height={54}
                        className="h-10 sm:h-11 w-auto object-contain"
                    />
                </Link>
                <div className="space-y-3">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-2">
                        {type === 'login' ? 'Tekrar Hoş Geldin' : 'Kayıt Ol'}
                        <span className="text-pink-500">.</span>
                    </h1>
                    <p className="text-base sm:text-lg text-white/50 font-medium">
                        {type === 'login'
                            ? 'Hesabına giriş yaparak keşfetmeye devam et.'
                            : 'Lovask dünyasına katılmak için bilgilerini gir.'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 ml-1">
                            E-Posta
                        </label>
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="relative w-full bg-white/5 border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-6 focus:border-pink-500/50 focus:ring-0 transition-all shadow-inner"
                                placeholder="hello@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 ml-1">
                            Şifre
                        </label>
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="relative w-full bg-white/5 border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-6 focus:border-pink-500/50 focus:ring-0 transition-all shadow-inner"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-4 text-sm text-green-200 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        {success}
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    className={clsx(
                        "w-full py-6 rounded-xl font-bold text-base transition-all duration-300",
                        "bg-white text-black hover:bg-gray-100 hover:scale-[1.02] shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]",
                        loading && "opacity-70 cursor-not-allowed hover:scale-100"
                    )}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-3">
                            <Spinner className="w-5 h-5 animate-spin border-black" />
                            İşleniyor...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            {type === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
                            <ArrowRight className="w-5 h-5" />
                        </span>
                    )}
                </Button>
            </form>

            <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10" />
                <span className="flex-shrink-0 mx-4 text-xs font-semibold uppercase tracking-wider text-white/30">
                    Veya
                </span>
                <div className="flex-grow border-t border-white/10" />
            </div>

            <div className="space-y-3">
                <Button
                    onClick={handleGoogleLogin}
                    variant="outline"
                    className="w-full py-6 rounded-xl bg-transparent border-white/10 text-white hover:bg-white/5 hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-3 group"
                >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="font-semibold text-white/90">Google ile Devam Et</span>
                </Button>

                {type === 'login' && (
                    <Button
                        onClick={handleMagicLink}
                        disabled={loading}
                        variant="outline"
                        className="w-full py-6 rounded-xl bg-transparent border-white/10 text-white hover:bg-white/5 hover:border-white/20 transition-all duration-300 flex items-center justify-center gap-3 group"
                    >
                        <Mail className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-white/90">Sihirli Link Gönder</span>
                    </Button>
                )}
            </div>

            <p className="text-center text-sm font-medium text-white/50 pt-4">
                {type === 'login' ? (
                    <>
                        Hesabın yok mu?{' '}
                        <Link href="/register" className="text-white hover:text-pink-400 font-bold transition-colors underline decoration-white/30 underline-offset-4">
                            Kayıt Ol
                        </Link>
                    </>
                ) : (
                    <>
                        Zaten hesabın var mı?{' '}
                        <Link href="/login" className="text-white hover:text-pink-400 font-bold transition-colors underline decoration-white/30 underline-offset-4">
                            Giriş Yap
                        </Link>
                    </>
                )}
            </p>
        </div>
    )
}

