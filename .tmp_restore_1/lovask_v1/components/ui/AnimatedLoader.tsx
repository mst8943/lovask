import { motion } from 'framer-motion'

type AnimatedLoaderProps = {
    label?: string
    size?: number
}

export default function AnimatedLoader({ label = 'Yukleniyor...', size = 72 }: AnimatedLoaderProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative" style={{ width: size, height: size }}>
                <motion.div
                    className="absolute inset-0 rounded-full blur-lg"
                    style={{ background: 'radial-gradient(circle at 30% 30%, #ec4899, transparent 60%)' }}
                    animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.6, 0.9, 0.6] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                />
                <motion.div
                    className="absolute inset-0 rounded-full blur-lg"
                    style={{ background: 'radial-gradient(circle at 70% 70%, #8b5cf6, transparent 60%)' }}
                    animate={{ scale: [1.1, 0.95, 1.1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                />
                <motion.div
                    className="absolute inset-2 rounded-full border border-white/30"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                    className="absolute inset-4 rounded-full border border-pink-400/40"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
                />
            </div>
            {label ? <span className="text-xs text-gray-400">{label}</span> : null}
        </div>
    )
}
