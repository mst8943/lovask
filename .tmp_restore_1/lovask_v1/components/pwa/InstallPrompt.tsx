'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function InstallPrompt() {
    const [deferred, setDeferred] = useState<InstallEvent | null>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const dismissed = typeof window !== 'undefined' && sessionStorage.getItem('install_prompt_dismissed')
        if (dismissed) return
        const handler = (e: Event) => {
            e.preventDefault()
            setDeferred(e as InstallEvent)
            setVisible(true)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    if (!visible || !deferred) return null

    const handleInstall = async () => {
        await deferred.prompt()
        const choice = await deferred.userChoice
        if (choice.outcome === 'accepted') {
            setVisible(false)
            setDeferred(null)
        }
    }

    const handleClose = () => {
        setVisible(false)
        sessionStorage.setItem('install_prompt_dismissed', '1')
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 z-[70] glass-panel p-4 rounded-2xl flex items-center justify-between gap-3">
            <div className="text-sm">
                Install the app for a better experience.
            </div>
            <div className="flex items-center gap-2">
                <Button
                    onClick={handleInstall}
                    size="sm"
                    className="text-xs font-semibold"
                >
                    Install
                </Button>
                <Button
                    onClick={handleClose}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                    aria-label="Close"
                >
                    x
                </Button>
            </div>
        </div>
    )
}
