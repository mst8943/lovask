import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchFeed, likeUser, passUser, ProfileWithMeta } from '@/services/feedService'
import { useAuthStore } from '@/store/useAuthStore'

export function useFeed() {
    const { user } = useAuthStore()
    const queryClient = useQueryClient()

    const { data: profiles, isLoading, refetch } = useQuery({
        queryKey: ['feed', user?.id],
        queryFn: () => {
            if (!user) return []
            return fetchFeed(user.id)
        },
        enabled: !!user,
    })

    // Like Mutation
    const likeMutation = useMutation({
        mutationFn: async (targetUserId: string) => {
            if (!user) return
            return likeUser(user.id, targetUserId)
        },
        onSuccess: (data, targetUserId) => {
            // Optimistic update: Remove user from list
            queryClient.setQueryData<ProfileWithMeta[]>(['feed', user?.id], (old) =>
                old?.filter((p) => p.id !== targetUserId) || []
            )
        }
    })

    // Pass Mutation
    const passMutation = useMutation({
        mutationFn: async (targetUserId: string) => {
            if (!user) return
            return passUser(user.id, targetUserId)
        },
        onSuccess: (data, targetUserId) => {
            // Optimistic update
            queryClient.setQueryData<ProfileWithMeta[]>(['feed', user?.id], (old) =>
                old?.filter((p) => p.id !== targetUserId) || []
            )
        }
    })

    return {
        profiles: profiles || [],
        isLoading,
        likeProfile: likeMutation.mutateAsync,
        passProfile: passMutation.mutateAsync,
        isLiking: likeMutation.isPending,
        isPassing: passMutation.isPending,
        refreshFeed: refetch
    }
}
