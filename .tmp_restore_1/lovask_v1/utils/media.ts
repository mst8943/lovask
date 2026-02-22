type ImageVariantOptions = {
    width: number
    height?: number
    quality?: number
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const PUBLIC_OBJECT_PREFIX = '/storage/v1/object/public/'

export const getPublicImageVariant = (publicUrl: string, options: ImageVariantOptions) => {
    if (!publicUrl || !SUPABASE_URL) return publicUrl
    const idx = publicUrl.indexOf(PUBLIC_OBJECT_PREFIX)
    if (idx === -1) return publicUrl

    const path = publicUrl.slice(idx + PUBLIC_OBJECT_PREFIX.length)
    const width = Math.max(1, Math.floor(options.width))
    const height = options.height ? Math.max(1, Math.floor(options.height)) : undefined
    const quality = options.quality ? Math.min(100, Math.max(30, Math.floor(options.quality))) : 70

    const params = new URLSearchParams({
        width: String(width),
        quality: String(quality),
        resize: 'cover',
        ...(height ? { height: String(height) } : {}),
    })

    return `${SUPABASE_URL}/storage/v1/render/image/public/${path}?${params.toString()}`
}

export const isPublicStorageUrl = (url: string) => {
    if (!url) return false
    return url.includes(PUBLIC_OBJECT_PREFIX)
}

export const getStoragePathFromUrl = (url: string) => {
    if (!url) return null
    const idx = url.indexOf(PUBLIC_OBJECT_PREFIX)
    if (idx === -1) return null
    return url.slice(idx + PUBLIC_OBJECT_PREFIX.length)
}
