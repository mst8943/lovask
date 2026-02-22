import { useQuery } from '@tanstack/react-query'
import { fetchMatches } from '@/services/chatService'
import { useAuthStore } from '@/store/useAuthStore'

export function useMatches() {
    const { user } = useAuthStore()

    const { data: matches, isLoading, error } = useQuery({
        queryKey: ['matches', user?.id],
        queryFn: () => {
            if (!user) return []
            return fetchMatches(user.id)
        },
        enabled: !!user,
    })

    return {
        matches: matches || [],
        isLoading,
        error
    }
}
