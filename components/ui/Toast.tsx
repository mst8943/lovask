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
                        'px-4 py-3 rounded-xl text-sm glass-panel border flex items-center gap-3',
                        t.type === 'success' && 'border-green-500/40 text-green-200',
                        t.type === 'error' && 'border-red-500/40 text-red-200',
                        t.type === 'info' && 'border-white/10 text-gray-200'
                    )}
                >
                    <span className="flex-1">{t.message}</span>
                    {t.action && (
                        <button
                            type="button"
                            onClick={() => {
                                t.action?.onClick()
                                remove(t.id)
                            }}
                            className="text-xs px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20"
                        >
                            {t.action.label}
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}
