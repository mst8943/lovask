'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
        if (typeof window === 'undefined') return
        const stored = localStorage.getItem('theme')
        if (stored === 'light' || stored === 'dark') {
            setTheme(stored)
        } else {
            const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
            setTheme(prefersLight ? 'light' : 'dark')
        }
    }, [])

    useEffect(() => {
        if (!mounted || typeof document === 'undefined') return
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme, mounted])

    const toggle = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    }

    if (!mounted) {
        return <div className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center"></div>
    }

    return (
        <button
            onClick={toggle}
            className={`
                relative flex items-center justify-center w-10 h-10 rounded-full overflow-hidden
                transition-all duration-300
                bg-transparent hover:bg-white/5 text-white
                active:scale-95 group
            `}
            aria-label="Tema değiştir"
        >
            <div className="relative flex items-center justify-center">
                {theme === 'dark' ? (
                    <Moon size={20} strokeWidth={2} className="transition-all duration-500 hover:-rotate-12" />
                ) : (
                    <Sun size={20} strokeWidth={2} className="transition-all duration-500 hover:rotate-90" />
                )}
            </div>
        </button>
    )
}
