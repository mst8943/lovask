import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'

type MatchCelebrationProps = {
    open: boolean
    onClose: () => void
    name?: string | null
    photoUrl?: string | null
    onSayHi?: () => void
    sayHiText?: string
    continueText?: string
    sendingHi?: boolean
}

export default function MatchCelebration({
    open,
    onClose,
    name,
    photoUrl,
    onSayHi,
    sayHiText = 'Ona merhaba de',
    continueText = 'Kaydırmaya devam et',
    sendingHi = false,
}: MatchCelebrationProps) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="relative w-full max-w-sm mx-auto rounded-3xl border border-white/10 bg-gradient-to-b from-[#120c16] to-[#0b0f14] p-6 text-center space-y-4"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.div
                            className="absolute -top-6 left-1/2 -translate-x-1/2 text-5xl"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 1.8, repeat: Infinity }}
                        >
                            âœ¨
                        </motion.div>
                        <div className="flex justify-center">
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-pink-500/60 shadow-xl shadow-pink-500/30">
                                <Image
                                    src={photoUrl || '/placeholder-user.jpg'}
                                    alt={name || 'Kullanıcı'}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-pink-200">Eşleşme!</div>
                        <p className="text-sm text-gray-300">
                            {name ? `${name} ile eşleştin.` : 'Yeni bir eşleşme oldu.'}
                        </p>
                        {onSayHi ? (
                            <div className="space-y-2">
                                <button
                                    onClick={onSayHi}
                                    disabled={sendingHi}
                                    className="w-full py-2 rounded-full bg-pink-500/25 text-sm text-pink-100 hover:bg-pink-500/35 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {sendingHi ? 'Mesaj gönderiliyor...' : sayHiText}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-2 rounded-full bg-white/10 text-sm hover:bg-white/20"
                                >
                                    {continueText}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full py-2 rounded-full bg-white/10 text-sm hover:bg-white/20"
                            >
                                Devam et
                            </button>
                        )}
                        <motion.div
                            className="absolute inset-0 pointer-events-none"
                            initial={false}
                            animate={{ opacity: [0.2, 0.6, 0.2] }}
                            transition={{ duration: 2.2, repeat: Infinity }}
                        >
                            <div className="absolute -top-10 -left-6 w-32 h-32 bg-pink-500/20 blur-3xl rounded-full" />
                            <div className="absolute -bottom-10 -right-6 w-32 h-32 bg-violet-500/20 blur-3xl rounded-full" />
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

