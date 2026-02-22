import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

type InputDialogProps = {
    open: boolean
    title: string
    description?: string
    placeholder?: string
    confirmText?: string
    cancelText?: string
    required?: boolean
    onClose: () => void
    onConfirm: (value: string) => void
}

export default function InputDialog({
    open,
    title,
    description,
    placeholder,
    confirmText = 'Gönder',
    cancelText = 'Vazgeç',
    required = false,
    onClose,
    onConfirm,
}: InputDialogProps) {
    const [value, setValue] = useState('')

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
                                <div className="text-sm text-gray-400 mt-1">{description}</div>
                            ) : null}
                        </div>
                        <textarea
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={placeholder}
                            className="w-full min-h-[90px] px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm"
                        />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2 rounded-full bg-white/10 text-sm hover:bg-white/20 transition-colors"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    if (required && !value.trim()) return
                                    onConfirm(value.trim())
                                    setValue('')
                                }}
                                className="flex-1 py-2 rounded-full text-sm text-white bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90"
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
