import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FeedFilterState = {
    ageMin: number
    ageMax: number
    city: string
    genders: string[]
    interests: string[]
    onlineOnly: boolean
    premiumOnly: boolean
    distanceKm: number
    eventOnly: boolean
    eventId: string
    serendipity: boolean
    diversity: boolean
    relationshipType: string
    education: string
    smoking: string
    alcohol: string
    kidsStatus: string
    heightMin: number
    heightMax: number
    religion: string
    lifestyle: string
    preferredGenders: string[]
    hasCustomFilters: boolean
}

type FeedFilterActions = {
    setFilter: <K extends keyof FeedFilterState>(key: K, value: FeedFilterState[K]) => void
    setPreferredGenders: (genders: string[]) => void
    reset: () => void
}

const initialState: FeedFilterState = {
    ageMin: 18,
    ageMax: 99,
    city: '',
    genders: [],
    interests: [],
    onlineOnly: false,
    premiumOnly: false,
    distanceKm: 50,
    eventOnly: false,
    eventId: '',
    serendipity: false,
    diversity: true,
    relationshipType: '',
    education: '',
    smoking: '',
    alcohol: '',
    kidsStatus: '',
    heightMin: 140,
    heightMax: 210,
    religion: '',
    lifestyle: '',
    preferredGenders: [],
    hasCustomFilters: false,
}

export const useFeedFilters = create<FeedFilterState & FeedFilterActions>()(
    persist(
        (set) => ({
            ...initialState,
            setFilter: (key, value) => set({
                [key]: value,
                hasCustomFilters: true,
            } as Partial<FeedFilterState>),
            setPreferredGenders: (genders) => set({
                preferredGenders: genders,
                genders,
            }),
            reset: () => set((state) => ({
                ...initialState,
                preferredGenders: state.preferredGenders,
                genders: state.preferredGenders,
                hasCustomFilters: false,
            })),
        }),
        {
            name: 'feed-filters',
        }
    )
)
