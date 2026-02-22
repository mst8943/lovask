'use client'

import { useLocale } from '@/store/useLocale'
import { t as translate } from '@/lib/i18n'

export function useT() {
    const locale = useLocale((s) => s.locale)
    return (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars)
}
