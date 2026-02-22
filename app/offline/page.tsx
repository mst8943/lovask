"use client"

import Link from "next/link"

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-[11px] uppercase tracking-[0.32em] text-white/40">Lovask</div>
        <h1 className="text-3xl font-extrabold text-white">Çevrimdışı</h1>
        <p className="text-sm text-white/60">
          İnternet bağlantısı yok. Son gezilen sayfalar açılabilir, yeni içerik yüklenmez.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Link href="/" className="px-4 py-2 rounded-lg bg-white text-black font-semibold">
            Yeniden Dene
          </Link>
          <button onClick={() => location.reload()} className="px-4 py-2 rounded-lg border border-white/20 text-white">
            Sayfayı Yenile
          </button>
        </div>
      </div>
    </div>
  )
}
