'use client'
import { useState, useEffect } from 'react'
import Spinner from '@/components/ui/Spinner'
export default function StoreHydration() {
    const [hydrated, setHydrated] = useState(false)
    useEffect(() => {
        const id = setTimeout(() => setHydrated(true), 0)
        return () => clearTimeout(id)
    }, [])
    if (!hydrated) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-[9999]">
                <Spinner className="w-10 h-10 text-pink-500 animate-spin" />
            </div>
        )
    }
    return null
}