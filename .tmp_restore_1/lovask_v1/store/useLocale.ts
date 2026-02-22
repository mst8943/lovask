'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Locale } from '@/lib/i18n'

type LocaleState = {
    locale: Locale
    setLocale: (locale: Locale) => void
}

export const useLocale = create<LocaleState>()(
    persist(
        (set) => ({
            locale: 'tr',
            setLocale: (locale) => set({ locale }),
        }),
        {
            name: 'lovask-locale',
            storage: createJSONStorage(() => localStorage),
        }
    )
)
