export type PhotoInput = string[] | string | null | undefined

const BOT_AVATARS = {
    male: '/bot-avatar-male.svg',
    female: '/bot-avatar-female.svg',
} as const

const PLACEHOLDER_USER = '/placeholder-user.jpg'

const normalizeGender = (gender?: string | null) => {
    if (!gender) return ''
    return String(gender)
        .toLowerCase()
        .replace(/\u0131/g, 'i')
        .replace(/\u00f6/g, 'o')
        .replace(/\u00fc/g, 'u')
        .replace(/\u015f/g, 's')
        .replace(/\u011f/g, 'g')
}

export const getBotAvatar = (gender?: string | null) => {
    const g = normalizeGender(gender)
    if (g.startsWith('f') || g.includes('female') || g.includes('woman') || g.includes('kadin')) {
        return BOT_AVATARS.female
    }
    if (g.startsWith('m') || g.includes('male') || g.includes('man') || g.includes('erkek')) {
        return BOT_AVATARS.male
    }
    return BOT_AVATARS.male
}

export const normalizePhotos = (photos: PhotoInput): string[] => {
    if (!photos) return []
    if (Array.isArray(photos)) return photos.filter(Boolean)
    if (typeof photos === 'string') {
        try {
            const parsed = JSON.parse(photos)
            if (Array.isArray(parsed)) return parsed.filter(Boolean)
        } catch {
            return []
        }
    }
    return []
}

export const getProfileAvatar = (
    profile?: { photos?: PhotoInput; is_bot?: boolean | null; gender?: string | null } | null,
    fallback: string = PLACEHOLDER_USER
) => {
    if (!profile) return fallback
    const photos = normalizePhotos(profile.photos)
    if (photos[0]) return photos[0]
    if (profile.is_bot) return getBotAvatar(profile.gender)
    return fallback
}

export const getAvatarFromParts = (
    photos: PhotoInput,
    isBot?: boolean | null,
    gender?: string | null,
    fallback: string = PLACEHOLDER_USER
) => {
    const list = normalizePhotos(photos)
    if (list[0]) return list[0]
    if (isBot) return getBotAvatar(gender)
    return fallback
}
