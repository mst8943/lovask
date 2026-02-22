import { useQuery } from '@tanstack/react-query'
import { fetchFeatureFlags } from '@/services/appSettingsService'

export function useFeatureFlags() {
    const query = useQuery({
        queryKey: ['feature_flags'],
        queryFn: fetchFeatureFlags,
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    })

    return query
}
