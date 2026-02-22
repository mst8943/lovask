'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

type ConfirmOptions = {
    title?: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'danger'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const SpendConfirmContext = createContext<ConfirmFn | null>(null)

export default function SpendConfirmProvider({ children }: { children: React.ReactNode }) {
    const resolverRef = useRef<((value: boolean) => void) | null>(null)
    const [open, setOpen] = useState(false)
    const [options, setOptions] = useState<ConfirmOptions>({
        title: 'Jeton Harcaması',
        description: 'Jeton harcaması için onay gerekiyor.',
        confirmText: 'Onayla',
        cancelText: 'Vazgeç',
        variant: 'default',
    })

    const requestConfirm = useCallback<ConfirmFn>((next) => {
        if (resolverRef.current) {
            resolverRef.current(false)
            resolverRef.current = null
        }
        setOptions((prev) => ({ ...prev, ...next }))
        setOpen(true)
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve
        })
    }, [])

    const handleClose = useCallback(() => {
        setOpen(false)
        if (resolverRef.current) {
            resolverRef.current(false)
            resolverRef.current = null
        }
    }, [])

    const handleConfirm = useCallback(() => {
        setOpen(false)
        if (resolverRef.current) {
            resolverRef.current(true)
            resolverRef.current = null
        }
    }, [])

    return (
        <SpendConfirmContext.Provider value={requestConfirm}>
            {children}
            <ConfirmDialog
                open={open}
                title={options.title}
                description={options.description}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                variant={options.variant}
                onClose={handleClose}
                onConfirm={handleConfirm}
            />
        </SpendConfirmContext.Provider>
    )
}

export function useSpendConfirm() {
    const ctx = useContext(SpendConfirmContext)
    return ctx || (async () => true)
}
