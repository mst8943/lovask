import { create } from 'zustand'

interface OnboardingState {
    step: number
    data: {
        display_name: string
        birth_date: string
        age: number | null
        gender: string
        bio: string
        city: string
        looking_for_genders: string[]
        photos: string[]
        interests: string[]
    }
    setStep: (step: number) => void
    updateData: (data: Partial<OnboardingState['data']>) => void
    reset: () => void
}

const initialState = {
    step: 1,
    data: {
        display_name: '',
        birth_date: '',
        age: null,
        gender: '',
        bio: '',
        city: '',
        looking_for_genders: [],
        photos: [],
        interests: [],
    },
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
    ...initialState,
    setStep: (step) => set({ step }),
    updateData: (data) => set((state) => ({ data: { ...state.data, ...data } })),
    reset: () => set(initialState),
}))
