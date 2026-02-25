'use client'

import { create } from 'zustand'
import { useEffect } from 'react'
import { clsx } from 'clsx'

type ToastType = 'success' | 'error' | 'info'
type ToastAction = { label: string; onClick: () => void }
type ToastItem = { id: string; message: string; type: ToastType; action?: ToastAction }

type ToastStore = {
    items: ToastItem[]
    push: (message: string, type?: ToastType, action?: ToastAction) => void
    remove: (id: string) => void
}

export const useToast = create<ToastStore>((set) => ({
    items: [],
    push: (message, type = 'info', action) =>
        set((state) => ({
            items: [...state.items, { id: `${Date.now()}-${Math.random()}`, message, type, action }],
        })),
    remove: (id) => set((state) => ({ items: state.items.filter((t) => t.id !== id) })),
}))

export default function ToastHost() {
    const { items, remove } = useToast()

    useEffect(() => {
        if (items.length === 0) return
        const timers = items.map((t) => setTimeout(() => remove(t.id), 2500))
        return () => {
            timers.forEach(clearTimeout)
        }
    }, [items, remove])

    if (items.length === 0) return null

    return (
        <div className="fixed top-4 right-4 z-[200] space-y-2">
            {items.map((t) => (
                <div
                    key={t.id}
                    className={clsx(
                        'px-4 py-3 rounded-[var(--radius-md)] text-sm shadow-[var(--shadow-lg)] border flex items-center gap-3 bg-surface-1 text-text-primary',
                        t.type === 'success' && 'border-status-success/40 text-status-success',
                        t.type === 'error' && 'border-status-destructive/40 text-status-destructive',
                        t.type === 'info' && 'border-brand-primary/20 text-text-primary'
                    )}
                >
                    <span className="flex-1 font-medium">{t.message}</span>
                    {t.action && (
                        <button
                            type="button"
                            onClick={() => {
                                t.action?.onClick()
                                remove(t.id)
                            }}
                            className="text-xs px-3 py-1.5 rounded-[var(--radius-full)] bg-surface-2 hover:bg-surface-3 transition-colors border border-surface-2"
                        >
                            {t.action.label}
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}
