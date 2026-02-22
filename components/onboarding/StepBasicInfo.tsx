'use client'

import { useOnboardingStore } from '@/store/useOnboardingStore'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/Input'
import { ArrowRight } from 'lucide-react'
import { clsx } from 'clsx'

export default function StepBasicInfo() {
    const { data, updateData, setStep } = useOnboardingStore()

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault()
        if (data.display_name && data.age && data.gender && data.city && data.looking_for_genders.length > 0) {
            setStep(2)
        }
    }

    const genderOptions = [
        { value: 'Male', label: 'Erkek' },
        { value: 'Female', label: 'Kadın' },
        { value: 'Non-binary', label: 'Non-binary' },
    ]

    const setGender = (gender: string) => {
        const defaultLookingFor =
            gender === 'Male'
                ? ['Female']
                : gender === 'Female'
                    ? ['Male']
                    : ['Male', 'Female']
        updateData({ gender, looking_for_genders: data.looking_for_genders.length > 0 ? data.looking_for_genders : defaultLookingFor })
    }

    const toggleLookingFor = (gender: string) => {
        const current = data.looking_for_genders || []
        const exists = current.includes(gender)
        const next = exists ? current.filter((g) => g !== gender) : [...current, gender]
        updateData({ looking_for_genders: next })
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8"
        >
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                    Kendini Tanıt<span className="text-pink-500">.</span>
                </h2>
                <p className="text-white/50 font-medium">Bize biraz kendinden bahset.</p>
            </div>

            <form onSubmit={handleNext} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/60 ml-1">
                        Görünen Ad
                    </label>
                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                        <Input
                            type="text"
                            value={data.display_name}
                            onChange={(e) => updateData({ display_name: e.target.value })}
                            placeholder="ör. Alex"
                            className="relative w-full bg-white/5 border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-6 focus:border-pink-500/50 focus:ring-0 transition-all shadow-inner"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 ml-1">
                            Yaş
                        </label>
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                            <Input
                                type="number"
                                value={data.age || ''}
                                onChange={(e) => updateData({ age: Number(e.target.value) })}
                                placeholder="24"
                                min={18}
                                max={99}
                                className="relative w-full bg-white/5 border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-6 focus:border-pink-500/50 focus:ring-0 transition-all shadow-inner"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-white/60 ml-1">
                            Şehir
                        </label>
                        <div className="relative group">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-violet-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500"></div>
                            <Input
                                type="text"
                                value={data.city}
                                onChange={(e) => updateData({ city: e.target.value })}
                                placeholder="İstanbul"
                                className="relative w-full bg-white/5 border-white/10 text-white placeholder-white/30 rounded-xl px-4 py-6 focus:border-pink-500/50 focus:ring-0 transition-all shadow-inner"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/60 ml-1">
                        Cinsiyet
                    </label>
                    <div className="flex gap-3">
                        {genderOptions.map((g) => (
                            <button
                                key={g.value}
                                type="button"
                                onClick={() => setGender(g.value)}
                                className={clsx(
                                    "flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 border",
                                    data.gender === g.value
                                        ? "bg-pink-500/20 border-pink-500/50 text-pink-300 shadow-[0_0_15px_-3px_rgba(236,72,153,0.3)]"
                                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-white/60 ml-1">
                        Kimi Arıyorsun?
                    </label>
                    <div className="flex gap-3">
                        {genderOptions.map((g) => (
                            <button
                                key={`looking-${g.value}`}
                                type="button"
                                onClick={() => toggleLookingFor(g.value)}
                                className={clsx(
                                    "flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 border",
                                    data.looking_for_genders.includes(g.value)
                                        ? "bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-[0_0_15px_-3px_rgba(139,92,246,0.3)]"
                                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className="w-full py-6 rounded-xl font-bold text-base transition-all duration-300 bg-white text-black hover:bg-gray-100 hover:scale-[1.02] shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2"
                    >
                        Devam Et
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </motion.div>
    )
}
