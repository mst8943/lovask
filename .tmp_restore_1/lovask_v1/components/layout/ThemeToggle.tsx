'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function ThemeToggle() {
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        if (typeof window === 'undefined') return 'dark'
        const stored = localStorage.getItem('theme')
        if (stored === 'light' || stored === 'dark') return stored
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
        return prefersLight ? 'light' : 'dark'
    })

    useEffect(() => {
        if (typeof document === 'undefined') return
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggle = () => {
        const next = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
        document.documentElement.setAttribute('data-theme', next)
        localStorage.setItem('theme', next)
    }

    return (
        <Button
            onClick={toggle}
            variant="secondary"
            size="icon"
            className="bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Tema değiştir"
        >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
    )
}
