'use client'

import Link from 'next/link'
import { Gem, Crown, Zap } from 'lucide-react'

export default function StorePage() {
    return (
        <div className="space-y-6 pb-8">

            <div className="space-y-3">
                <Link href="/store/coins" className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Gem size={20} className="text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Jeton</h3>
                        <p className="text-xs text-gray-400">Havale ile jeton paketi al</p>
                    </div>
                </Link>

                <Link href="/store/premium" className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <Crown size={20} className="text-pink-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Premium</h3>
                        <p className="text-xs text-gray-400">Havale ile yükselt</p>
                    </div>
                </Link>

                <Link href="/store/boost" className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <Zap size={20} className="text-violet-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Boost</h3>
                        <p className="text-xs text-gray-400">Profil görünürlüğünü artır</p>
                    </div>
                </Link>
            </div>
        </div>
    )
}

