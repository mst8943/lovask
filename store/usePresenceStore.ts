import { create } from 'zustand'

interface PresenceState {
    onlineUsers: Set<string>
    setOnlineUsers: (ids: Set<string>) => void
    addOnlineUser: (id: string) => void
    removeOnlineUser: (id: string) => void
    isUserOnline: (id?: string | null) => boolean
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
    onlineUsers: new Set(),
    setOnlineUsers: (ids) => set({ onlineUsers: ids }),
    addOnlineUser: (id) => {
        const setRef = new Set(get().onlineUsers)
        setRef.add(id)
        set({ onlineUsers: setRef })
    },
    removeOnlineUser: (id) => {
        const setRef = new Set(get().onlineUsers)
        setRef.delete(id)
        set({ onlineUsers: setRef })
    },
    isUserOnline: (id) => {
        if (!id) return false
        return get().onlineUsers.has(id)
    },
}))
