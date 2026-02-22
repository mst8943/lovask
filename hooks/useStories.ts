import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStories, uploadStory, recordStoryView, fetchStoryViews } from '@/services/storiesService'
import { useAuthStore } from '@/store/useAuthStore'
import { useEconomy } from '@/hooks/useEconomy'

export function useStories() {
    const { user } = useAuthStore()
    const { isPremium } = useEconomy()
    const queryClient = useQueryClient()

    const storiesQuery = useQuery({
        queryKey: ['stories'],
        queryFn: fetchStories,
    })

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!user) throw new Error('No user')
            return uploadStory(file, user.id, isPremium)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories'] })
        },
    })

    const viewMutation = useMutation({
        mutationFn: async (storyId: string) => {
            if (!user) throw new Error('No user')
            return recordStoryView(storyId, user.id)
        },
    })

    return {
        stories: storiesQuery.data || [],
        isLoading: storiesQuery.isLoading,
        uploadStory: uploadMutation.mutateAsync,
        isUploading: uploadMutation.isPending,
        recordView: viewMutation.mutateAsync,
    }
}

export function useStoryViews(storyId: string) {
    return useQuery({
        queryKey: ['story-views', storyId],
        queryFn: () => fetchStoryViews(storyId),
        enabled: !!storyId,
    })
}
