export type LastActiveVisibility = 'everyone' | 'matches' | 'hidden' | 'public' | null | undefined

export const canShowLastActive = (visibility: LastActiveVisibility, isMatch: boolean) => {
    if (visibility === 'hidden') return false
    if (visibility === 'matches') return isMatch
    return true
}
