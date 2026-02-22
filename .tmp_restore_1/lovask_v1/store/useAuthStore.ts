import { create } from 'zustand'
import { User, Session } from '@supabase/supabase-js'

interface AuthState {
    user: User | null
    session: Session | null
    isLoading: boolean
    setSession: (session: Session | null) => void
    setUser: (user: User | null) => void
    setLoading: (isLoading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    session: null,
    isLoading: true,
    setSession: (session) => set({ session, user: session?.user ?? null, isLoading: false }),
    setUser: (user) => set({ user }),
    setLoading: (isLoading) => set({ isLoading }),
}))
