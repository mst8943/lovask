import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUserData, spendCoins } from '@/services/userService'
import { useAuthStore } from '@/store/useAuthStore'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { DEFAULT_FEATURES } from '@/lib/featureFlags'
import { useSpendConfirm } from '@/providers/SpendConfirmProvider'

type FeatureFlags = typeof DEFAULT_FEATURES

export function useEconomy() {
    const { user } = useAuthStore()
    const queryClient = useQueryClient()
    const { data: featureFlags } = useFeatureFlags()
    const confirmSpend = useSpendConfirm()

    const { data: userData, isLoading, refetch } = useQuery({
        queryKey: ['user_economy', user?.id],
        queryFn: () => {
            if (!user) return null
            return fetchUserData(user.id)
        },
        enabled: !!user,
        refetchInterval: 30000
    })

    const spendMutation = useMutation({
        mutationFn: async ({ amount, reason, metadata, skipConfirm }: { amount: number, reason: string, metadata?: Record<string, unknown>, skipConfirm?: boolean }) => {
            if (!user) throw new Error('No user')
            if (!userData) throw new Error('No user data')

            if (!skipConfirm && amount > 0) {
                const ok = await confirmSpend({
                    title: 'Jeton Harcaması',
                    description: `${amount} jeton harcanacak. Devam edilsin mi?`,
                    confirmText: 'Onayla',
                    cancelText: 'Vazgeç',
                })
                if (!ok) return false
            }

            try {
                await spendCoins(user.id, amount, reason, metadata || {})
                queryClient.setQueryData<{ coin_balance?: number } | null>(['user_economy', user.id], (old) => {
                    const current = old || {}
                    return {
                        ...current,
                        coin_balance: (current.coin_balance || 0) - amount
                    }
                })
                return true
            } catch (error) {
                throw error
            }
        },
        onSuccess: () => {
            refetch()
        }
    })

    const isPremium = userData?.is_premium || false
    const flags: FeatureFlags = featureFlags || DEFAULT_FEATURES
    const tier = isPremium ? 'premium' : 'standard'
    const hasFeature = (key: keyof FeatureFlags['premium']) => !!flags[tier]?.[key]
    const hasFeatureForTier = (tierKey: 'premium' | 'standard', key: keyof FeatureFlags['premium']) => !!flags[tierKey]?.[key]

    return {
        balance: userData?.coin_balance || 0,
        isPremium,
        hasFeature,
        hasFeatureForTier,
        featureFlags: flags,
        spendCoins: spendMutation.mutateAsync,
        isSpending: spendMutation.isPending,
        isLoading,
        refetch
    }
}
