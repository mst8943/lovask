import { motion, AnimatePresence } from 'framer-motion'

type ConfirmDialogProps = {
    open: boolean
    title?: string
    description?: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onClose: () => void
    onCancel?: () => void
    variant?: 'default' | 'danger'
}

export default function ConfirmDialog({
    open,
    title = 'Onayla',
    description,
    confirmText = 'Devam',
    cancelText = 'Vazgec',
    onConfirm,
    onClose,
    onCancel,
    variant = 'default',
}: ConfirmDialogProps) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-b from-[#120c16] to-[#0b0f14] p-5 space-y-4 shadow-2xl"
                        initial={{ scale: 0.96, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.96, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div>
                            <div className="text-lg font-semibold">{title}</div>
                            {description ? (
                                <div className="text-sm text-gray-400 mt-1 whitespace-pre-line">{description}</div>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    onCancel?.()
                                    onClose()
                                }}
                                className="flex-1 py-2 rounded-full bg-white/10 text-sm hover:bg-white/20 transition-colors"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`flex-1 py-2 rounded-full text-sm text-white transition-colors ${
                                    variant === 'danger'
                                        ? 'bg-red-500/80 hover:bg-red-500'
                                        : 'bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90'
                                }`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
