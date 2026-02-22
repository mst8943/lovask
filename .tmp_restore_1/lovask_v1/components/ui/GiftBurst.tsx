import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'

type GiftBurstProps = {
    open: boolean
    imageUrl?: string | null
    onDone: () => void
}

const confetti = [
    { x: -60, y: -80, color: 'bg-pink-400' },
    { x: 40, y: -90, color: 'bg-violet-400' },
    { x: -90, y: -10, color: 'bg-amber-300' },
    { x: 80, y: -20, color: 'bg-emerald-300' },
    { x: -70, y: 60, color: 'bg-sky-400' },
    { x: 60, y: 70, color: 'bg-rose-400' },
]

export default function GiftBurst({ open, imageUrl, onDone }: GiftBurstProps) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[75] flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="relative w-40 h-40"
                        initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 160, damping: 14 }}
                        onAnimationComplete={onDone}
                    >
                        {confetti.map((c, idx) => (
                            <motion.span
                                key={`${c.x}-${c.y}-${idx}`}
                                className={`absolute left-1/2 top-1/2 w-2 h-2 rounded-full ${c.color}`}
                                initial={{ x: 0, y: 0, opacity: 0, scale: 0.6 }}
                                animate={{ x: c.x, y: c.y, opacity: [0, 1, 0], scale: [0.6, 1, 0.8] }}
                                transition={{ duration: 0.9, delay: 0.05 * idx }}
                            />
                        ))}
                        <div className="absolute inset-0 rounded-full blur-2xl bg-pink-500/40" />
                        <div className="absolute inset-4 rounded-full blur-2xl bg-violet-500/40" />
                        <div className="absolute inset-6 rounded-3xl overflow-hidden border border-white/20 bg-black/40">
                            <Image
                                src={imageUrl || '/placeholder-user.jpg'}
                                alt="Hediye"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
