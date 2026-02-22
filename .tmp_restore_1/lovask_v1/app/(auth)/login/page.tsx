import AuthForm from '@/components/auth/AuthForm'
import { Sparkles, Star, Heart } from 'lucide-react'

export default function LoginPage() {
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-[#09090b]">
            {/* Left Column - Visuals */}
            <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-24 overflow-hidden bg-black">
                {/* Background animations */}
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70vh] rounded-full bg-pink-600/20 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[10%] right-[0%] w-[60%] h-[60vh] rounded-full bg-violet-600/20 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />

                {/* Floating Elements */}
                <div className="absolute top-[20%] right-[20%] p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 rotate-12 animate-float delay-100">
                    <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
                </div>
                <div className="absolute bottom-[25%] left-[20%] p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 -rotate-12 animate-float delay-300">
                    <Sparkles className="w-8 h-8 text-violet-400" />
                </div>

                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pink-500 to-violet-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-white tracking-tight">Lovask</span>
                </div>

                <div className="relative z-10 space-y-8 max-w-lg mt-20">
                    <h1 className="text-5xl xl:text-6xl font-extrabold tracking-tight text-white/90 leading-tight">
                        Aşkını<br />
                        <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent drop-shadow-sm">
                            Keşfetme Zamanı
                        </span>
                    </h1>
                    <p className="text-xl text-white/60 font-medium leading-relaxed">
                        Milyonlarca kişi arasında ruh eşini bulmak hiç bu kadar kolay ve çarpıcı olmamıştı. Lovask'in premium dünyasına adım at.
                    </p>

                    <div className="flex items-center gap-6 pt-6">
                        <div className="flex -space-x-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="w-14 h-14 rounded-full border-4 border-[#09090b] bg-gradient-to-tr from-pink-500/20 to-violet-500/20 backdrop-blur-md flex items-center justify-center overflow-hidden">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 15}`} alt="User" className="w-full h-full object-cover" />
                                </div>
                            ))}
                            <div className="w-14 h-14 rounded-full border-4 border-[#09090b] bg-white/10 backdrop-blur-md flex items-center justify-center">
                                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                            </div>
                        </div>
                        <div className="text-white/70">
                            <div className="font-bold text-white text-lg">100K+</div>
                            <div className="text-sm">Mutlu Eşleşme</div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-white/40 text-sm font-medium">
                    © {new Date().getFullYear()} Lovask. Tüm hakları gizlidir.
                </div>
            </div>

            {/* Right Column - Form */}
            <div className="relative flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-[#09090b]/80 backdrop-blur-2xl">
                {/* Mobile only decorative blobs */}
                <div className="absolute top-0 right-0 w-full h-[50vh] bg-gradient-to-b from-pink-500/10 to-transparent lg:hidden" />
                <div className="absolute top-[10%] left-[10%] w-[50vw] h-[50vw] rounded-full bg-violet-600/20 blur-[100px] lg:hidden" />

                {/* Mobile Header */}
                <div className="absolute top-8 left-8 lg:hidden flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-violet-500 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                </div>

                <div className="w-full max-w-[440px] relative z-10">
                    <AuthForm type="login" />
                </div>
            </div>
        </div>
    )
}
