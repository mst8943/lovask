export type FeatureConfig = {
    premium: Record<string, boolean>
    standard: Record<string, boolean>
}

export type FeatureItem = {
    key: string
    label: string
}

export const FEATURE_ITEMS: FeatureItem[] = [
    { key: 'chat_unlimited', label: 'Sinirsiz sohbet baslatma' },
    { key: 'advanced_filters', label: 'Gelismis filtreler' },
    { key: 'profile_viewers', label: 'Profilimi gorenler' },
    { key: 'liked_you', label: 'Seni begenenler' },
    { key: 'daily_boost', label: 'Gunluk boost' },
    { key: 'mini_boost', label: 'Mini Boost' },
    { key: 'read_receipts', label: 'Okundu bilgisi' },
    { key: 'incognito', label: 'Gizli mod' },
    { key: 'super_like_daily', label: 'Gunluk 1 Super Like' },
    { key: 'rewind', label: 'Geri alma' },
    { key: 'message_refund', label: 'Mesaj jetonu iadesi' },
    { key: 'ad_free', label: 'Reklamsiz deneyim' },
    { key: 'premium_badge', label: 'Premium rozet' },
]

export const DEFAULT_FEATURES: FeatureConfig = {
    premium: {
        chat_unlimited: true,
        advanced_filters: true,
        profile_viewers: true,
        liked_you: true,
        daily_boost: true,
        mini_boost: true,
        read_receipts: true,
        incognito: true,
        super_like_daily: true,
        rewind: true,
        message_refund: true,
        ad_free: true,
        premium_badge: true,
    },
    standard: {
        chat_unlimited: false,
        advanced_filters: false,
        profile_viewers: false,
        liked_you: false,
        daily_boost: false,
        mini_boost: true,
        read_receipts: false,
        incognito: false,
        super_like_daily: false,
        rewind: false,
        message_refund: false,
        ad_free: false,
        premium_badge: false,
    },
}
