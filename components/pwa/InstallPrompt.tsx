"use client"

import { useEffect, useMemo, useState } from "react"

type DeferredPrompt = {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

const INSTALL_PROMPT_COOLDOWN_MS = 10 * 60 * 1000
const INSTALL_PROMPT_STORAGE_KEY = "lovask.install_prompt_last_shown"
const INSTALL_PROMPT_SESSION_KEY = "lovask.install_prompt_last_shown_session"

const isIos = () => {
  if (typeof window === "undefined") return false
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

const isStandalone = () => {
  if (typeof window === "undefined") return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia("(display-mode: standalone)").matches || !!nav.standalone
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<DeferredPrompt | null>(null)
  const [open, setOpen] = useState(false)
  const [ios] = useState(() => isIos())
  const canShow = useMemo(() => !isStandalone(), [])

  const canShowWithCooldown = () => {
    if (typeof window === "undefined") return false
    const lastLocal = Number(window.localStorage.getItem(INSTALL_PROMPT_STORAGE_KEY) || 0)
    const lastSession = Number(window.sessionStorage.getItem(INSTALL_PROMPT_SESSION_KEY) || 0)
    const last = Math.max(lastLocal, lastSession)
    return Date.now() - last >= INSTALL_PROMPT_COOLDOWN_MS
  }

  const markShown = () => {
    if (typeof window === "undefined") return
    const now = String(Date.now())
    window.localStorage.setItem(INSTALL_PROMPT_STORAGE_KEY, now)
    window.sessionStorage.setItem(INSTALL_PROMPT_SESSION_KEY, now)
  }

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      if (!canShowWithCooldown()) return
      setDeferred(e as unknown as DeferredPrompt)
      setOpen(true)
      markShown()
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  useEffect(() => {
    if (!ios || !canShow) return
    if (!canShowWithCooldown()) return
    const timer = setTimeout(() => {
      setOpen(true)
      markShown()
    }, 1200)
    return () => clearTimeout(timer)
  }, [ios, canShow])

  if (!canShow || !open) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-6 md:max-w-sm">
      <div className="rounded-2xl border border-white/10 bg-black/80 text-white p-4 shadow-2xl backdrop-blur">
        <div className="text-xs uppercase tracking-wider text-white/60">Uygulama</div>
        <div className="text-base font-semibold mt-1">Lovask’i cihazına yükle</div>
        <p className="text-xs text-white/70 mt-2">
          Daha hızlı açılır ve uygulama gibi kullanırsın.
        </p>
        {ios ? (
          <div className="mt-3 text-xs text-white/80">
            iOS: Paylaş → <span className="font-semibold">Ana Ekrana Ekle</span>
          </div>
        ) : (
          <button
            onClick={async () => {
              if (!deferred) return
              await deferred.prompt()
              const choice = await deferred.userChoice
              setOpen(false)
              if (choice.outcome === "dismissed") {
                setDeferred(null)
              }
            }}
            className="mt-3 w-full py-2 rounded-lg bg-white text-black font-semibold"
          >
            Yükle
          </button>
        )}
        <button
          onClick={() => setOpen(false)}
          className="mt-2 w-full py-2 rounded-lg border border-white/20 text-white/80"
        >
          Şimdi değil
        </button>
      </div>
    </div>
  )
}
