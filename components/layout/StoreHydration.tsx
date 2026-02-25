'use client'
import { useState, useEffect } from 'react'
import LoadingSplash from '@/components/ui/LoadingSplash'
export default function StoreHydration() {
    const [hydrated, setHydrated] = useState(false)
    useEffect(() => {
        const id = setTimeout(() => setHydrated(true), 0)
        return () => clearTimeout(id)
    }, [])
    if (!hydrated) {
        return <LoadingSplash />
    }
    return null
}