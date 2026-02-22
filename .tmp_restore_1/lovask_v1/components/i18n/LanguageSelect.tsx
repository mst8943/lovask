'use client'

import { useLocale } from '@/store/useLocale'

export default function LanguageSelect({ label }: { label?: string }) {
    const locale = useLocale((s) => s.locale)
    const setLocale = useLocale((s) => s.setLocale)

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">{label || 'Language'}</span>
            <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'tr' | 'en')}
                className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm"
            >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
            </select>
        </div>
    )
}

