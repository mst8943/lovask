const normalize = (value: string) =>
    value
        .toLowerCase()
        .replace(/[ı]/g, 'i')
        .replace(/[ş]/g, 's')
        .replace(/[ğ]/g, 'g')
        .replace(/[ü]/g, 'u')
        .replace(/[ö]/g, 'o')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()

export const getGiftStickerUrl = (name?: string | null) => {
    if (!name) return null
    const n = normalize(name)

    if (n.includes('gul') || n.includes('rose')) return '/stickers/rose.svg'
    if (n.includes('kalp') || n.includes('heart') || n.includes('ask')) return '/stickers/heart.svg'
    if (n.includes('yildiz') || n.includes('star')) return '/stickers/star.svg'
    if (n.includes('cicek') || n.includes('flower')) return '/stickers/flower.svg'
    if (n.includes('hediye') || n.includes('gift') || n.includes('kutu')) return '/stickers/gift.svg'
    if (n.includes('opucuk') || n.includes('kiss')) return '/stickers/kiss.svg'
    if (n.includes('yuzuk') || n.includes('ring')) return '/stickers/ring.svg'
    if (n.includes('parfum') || n.includes('perfume')) return '/stickers/perfume.svg'
    if (n.includes('cikolata') || n.includes('chocolate')) return '/stickers/chocolate.svg'
    if (n.includes('ayi') || n.includes('teddy') || n.includes('bear')) return '/stickers/teddy.svg'

    return '/stickers/sparkle.svg'
}

