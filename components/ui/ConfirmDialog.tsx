import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'

export type ConfirmDialogProps = {
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
    cancelText = 'Vazgeç',
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
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full max-w-sm rounded-[var(--radius-xl)] border border-surface-2 bg-surface-1 p-6 space-y-6 shadow-[var(--shadow-md)]"
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="space-y-2 text-center">
                            {variant === 'danger' && (
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-destructive/20 mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-status-destructive">
                                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                        <path d="M12 9v4" />
                                        <path d="M12 17h.01" />
                                    </svg>
                                </div>
                            )}
                            <h2 className="text-xl font-bold tracking-tight text-text-primary">{title}</h2>
                            {description ? (
                                <p className="text-sm text-text-secondary whitespace-pre-line">{description}</p>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                            {cancelText && (
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => {
                                        onCancel?.()
                                        onClose()
                                    }}
                                >
                                    {cancelText}
                                </Button>
                            )}
                            <Button
                                variant={variant === 'danger' ? 'destructive' : 'primary'}
                                className="flex-1"
                                onClick={() => {
                                    onConfirm()
                                    if (!cancelText) onClose()
                                }}
                            >
                                {confirmText}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
