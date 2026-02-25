type LocationSource = {
    city?: string | null
    location_visibility?: 'public' | 'approx' | 'hidden' | null
}

export const getLocationLabel = (profile?: LocationSource | null) => {
    if (!profile) return 'Konum yok'
    if (profile.location_visibility === 'hidden') return 'Konum gizli'
    const city = (profile.city || '').trim()
    return city || 'Konum yok'
}
