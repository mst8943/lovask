const parseHourToken = (raw: string): number | null => {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const parts = trimmed.split(':')
    const hourRaw = parts[0]?.trim()
    if (!hourRaw) return null
    const hour = Number(hourRaw)
    if (Number.isNaN(hour)) return null
    if (hour < 0 || hour > 23) return null
    return hour
}

const expandRange = (start: number, end: number): number[] => {
    if (start === end) return [start]
    if (end > start) {
        return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    }
    const first = Array.from({ length: 24 - start }, (_, i) => start + i)
    const second = Array.from({ length: end + 1 }, (_, i) => i)
    return [...first, ...second]
}

export const parseActiveHoursInput = (raw: string): number[] => {
    const tokens = (raw || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)

    const hours: number[] = []
    for (const token of tokens) {
        if (token.includes('-')) {
            const [left, right] = token.split('-')
            const start = parseHourToken(left || '')
            const end = parseHourToken(right || '')
            if (start === null || end === null) continue
            hours.push(...expandRange(start, end))
            continue
        }
        const hour = parseHourToken(token)
        if (hour === null) continue
        hours.push(hour)
    }

    const unique = Array.from(new Set(hours))
    unique.sort((a, b) => a - b)
    return unique
}

export const toUtcHours = (hours: number[], offsetHours: number = TR_OFFSET_HOURS): number[] => {
    const normalized = hours.map((h) => (h - offsetHours + 24) % 24)
    const unique = Array.from(new Set(normalized))
    unique.sort((a, b) => a - b)
    return unique
}

export const formatHours = (hours: number[]): string => (
    (hours || [])
        .map((h) => String(h).padStart(2, '0') + ':00')
        .join(', ')
)

export const parseActiveHoursForSave = (raw: string, useTrTimezone: boolean): number[] => {
    const list = parseActiveHoursInput(raw)
    if (!useTrTimezone) return list
    return toUtcHours(list, TR_OFFSET_HOURS)
}
export const TR_OFFSET_HOURS = 3
