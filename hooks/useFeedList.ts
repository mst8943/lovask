import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchFeedPage, likeUser, passUser, FeedFilters, ProfileWithMeta } from '@/services/feedService'
import { fetchFavoriteIds, toggleFavorite } from '@/services/favoritesService'
import { useAuthStore } from '@/store/useAuthStore'
import { useFeedFilters } from '@/store/useFeedFilters'
import { useEconomy } from '@/hooks/useEconomy'

type FeedPage = {
    profiles: ProfileWithMeta[]
    nextCursor: string | null
}

type FeedInfiniteData = {
    pages: FeedPage[]
    pageParams: unknown[]
}

export function useFeedList() {
    const { user } = useAuthStore()
    const filters = useFeedFilters()
    const { hasFeature } = useEconomy()
    const queryClient = useQueryClient()

    const favoritesQuery = useQuery({
        queryKey: ['favorites', user?.id],
        queryFn: () => {
            if (!user) return []
            return fetchFavoriteIds(user.id)
        },
        enabled: !!user,
    })

    const canAdvancedFilters = hasFeature('advanced_filters')

    const effectiveFilters: FeedFilters = {
        ...filters,
        genders: filters.genders.length > 0 ? filters.genders : filters.preferredGenders,
        interests: canAdvancedFilters ? filters.interests : filters.interests.slice(0, 1),
        premiumOnly: canAdvancedFilters ? filters.premiumOnly : false,
        onlineOnly: canAdvancedFilters ? filters.onlineOnly : false,
        distanceKm: canAdvancedFilters ? filters.distanceKm : Math.min(filters.distanceKm, 50),
        education: canAdvancedFilters ? filters.education : '',
        smoking: canAdvancedFilters ? filters.smoking : '',
        alcohol: canAdvancedFilters ? filters.alcohol : '',
        kidsStatus: canAdvancedFilters ? filters.kidsStatus : '',
        heightMin: canAdvancedFilters ? filters.heightMin : undefined,
        heightMax: canAdvancedFilters ? filters.heightMax : undefined,
        religion: canAdvancedFilters ? filters.religion : '',
        lifestyle: canAdvancedFilters ? filters.lifestyle : '',
    }

    const feedQuery = useInfiniteQuery<FeedPage, Error, FeedInfiniteData, unknown[], string | null>({
        queryKey: ['feed-list', user?.id, filters],
        queryFn: ({ pageParam }: { pageParam: string | null }) => {
            if (!user) return Promise.resolve({ profiles: [], nextCursor: null })
            return fetchFeedPage(user.id, pageParam as string | null, 20, effectiveFilters as FeedFilters)
        },
        enabled: !!user,
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    })

    const likeMutation = useMutation({
        mutationFn: async (targetUserId: string) => {
            if (!user) return
            return likeUser(user.id, targetUserId)
        },
        onSuccess: (data, targetUserId) => {
            queryClient.setQueryData(['feed-list', user?.id, filters], (old: FeedInfiniteData | undefined) => {
                if (!old) return old
                return {
                    ...old,
                    pages: old.pages.map((page: FeedPage) => ({
                        ...page,
                        profiles: page.profiles.filter((p) => p.id !== targetUserId),
                    })),
                }
            })
        },
    })

    const passMutation = useMutation({
        mutationFn: async (targetUserId: string) => {
            if (!user) return
            return passUser(user.id, targetUserId)
        },
        onSuccess: (data, targetUserId) => {
            queryClient.setQueryData(['feed-list', user?.id, filters], (old: FeedInfiniteData | undefined) => {
                if (!old) return old
                return {
                    ...old,
                    pages: old.pages.map((page: FeedPage) => ({
                        ...page,
                        profiles: page.profiles.filter((p) => p.id !== targetUserId),
                    })),
                }
            })
        },
    })

    const favoriteMutation = useMutation({
        mutationFn: async (targetUserId: string) => {
            if (!user) return false
            const isFav = (favoritesQuery.data || []).includes(targetUserId)
            return toggleFavorite(user.id, targetUserId, isFav)
        },
        onSuccess: (isFav, targetUserId) => {
            queryClient.setQueryData(['favorites', user?.id], (old: string[] | undefined) => {
                const current = old || []
                if (isFav) return [...current, targetUserId]
                return current.filter((id) => id !== targetUserId)
            })
        },
    })

    const profiles = feedQuery.data?.pages.flatMap((p) => p.profiles) || []

    return {
        profiles,
        favorites: favoritesQuery.data || [],
        isLoading: feedQuery.isLoading,
        isFetchingNext: feedQuery.isFetchingNextPage,
        hasNextPage: !!feedQuery.hasNextPage,
        fetchNext: feedQuery.fetchNextPage,
        refetch: feedQuery.refetch,
        likeProfile: likeMutation.mutateAsync,
        passProfile: passMutation.mutateAsync,
        toggleFavorite: favoriteMutation.mutateAsync,
        isLiking: likeMutation.isPending,
        isPassing: passMutation.isPending,
        isTogglingFavorite: favoriteMutation.isPending,
    }
}
