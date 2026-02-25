'use client'



import { useEffect, useMemo, useState } from 'react'

import { useFeedList } from '@/hooks/useFeedList'

import { Heart, X, Star, RotateCcw } from 'lucide-react'

import { motion, AnimatePresence, PanInfo } from 'framer-motion'

import Image from 'next/image'

import Link from 'next/link'

import { useEconomy } from '@/hooks/useEconomy'

import { superLikeFree, superLikePaid } from '@/services/extraFeaturesService'

import { useAuthStore } from '@/store/useAuthStore'

import { useToast } from '@/components/ui/Toast'

import AnimatedLoader from '@/components/ui/AnimatedLoader'

import MatchCelebration from '@/components/ui/MatchCelebration'

import ConfirmDialog from '@/components/ui/ConfirmDialog'

import { Button } from '@/components/ui/Button'

import LoadingSplash from '@/components/ui/LoadingSplash'
import { getProfileAvatar } from '@/utils/avatar'

import { sendMessage } from '@/services/chatService'

import { useQueryClient } from '@tanstack/react-query'

import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'



const SWIPE_THRESHOLD = 100

const SWIPE_POWER_THRESHOLD = 50000



export default function SwipePage() {

    const {

        profiles,

        isLoading,

        hasNextPage,

        fetchNext,

        isFetchingNext,

        refetch,

        likeProfile,

        passProfile,

        favorites,

    } = useFeedList()



    const { spendCoins, isPremium, hasFeature } = useEconomy()

    const { user } = useAuthStore()

    const toast = useToast()

    const queryClient = useQueryClient()

    const router = useRouter()

    const supabase = useMemo(() => createClient(), [])



    const [currentIndex, setCurrentIndex] = useState(0)

    const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)

    const [matchOpen, setMatchOpen] = useState(false)

    const [matchProfile, setMatchProfile] = useState<{ name?: string | null; photo?: string | null; matchId?: string | null } | null>(null)

    const [sendingHi, setSendingHi] = useState(false)

    const [confirmOpen, setConfirmOpen] = useState(false)

    const [confirmText, setConfirmText] = useState('Devam')

    const [confirmMessage, setConfirmMessage] = useState('')

    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)

    const [confirmCancelAction, setConfirmCancelAction] = useState<(() => void) | null>(null)

    const [confirmCancelText, setConfirmCancelText] = useState('Vazgeç')

    const [lastAction, setLastAction] = useState<{

        type: 'like' | 'pass'

        profile: typeof current

        wasMatch: boolean

    } | null>(null)

    const [rewinding, setRewinding] = useState(false)




    const canDailySuperLike = hasFeature('super_like_daily')



    useEffect(() => {

        if (profiles.length > 0 && profiles.length - currentIndex <= 3 && hasNextPage && !isFetchingNext) {

            fetchNext()

        }

    }, [currentIndex, profiles.length, hasNextPage, fetchNext, isFetchingNext])



    const current = profiles[currentIndex]

    const nextCard = profiles[currentIndex + 1]



    const handleSwipe = async (direction: 'left' | 'right') => {

        if (!current) return



        setExitDirection(direction)



        setTimeout(async () => {

            if (direction === 'right') {

                try {

                    const res = await likeProfile(current.id)

                    if (res?.isMatch) {

                        setMatchProfile({

                            name: current.display_name,

                            photo: getProfileAvatar(current),

                            matchId: res.matchId || null,

                        })

                        setMatchOpen(true)

                    }

                    setLastAction({

                        type: 'like',

                        profile: current,

                        wasMatch: !!res?.isMatch,

                    })

                } catch (err) {

                    console.error('Like failed:', err)

                    toast.push('Be\u011feni ba\u015far\u0131s\u0131z.', 'error', { label: 'Tekrar dene', onClick: () => handleSwipe('right') })

                }

            } else {

                try {

                    await passProfile(current.id)

                    setLastAction({

                        type: 'pass',

                        profile: current,

                        wasMatch: false,

                    })

                } catch (err) {

                    console.error('Pass failed:', err)

                    toast.push('Ge\u00e7 i\u015flemi ba\u015far\u0131s\u0131z.', 'error', { label: 'Tekrar dene', onClick: () => handleSwipe('left') })

                }

            }



            setCurrentIndex(prev => prev + 1)

            setExitDirection(null)

        }, 300)

    }



    const handleSayHi = async () => {

        if (!user?.id) {

            toast.push('Mesaj göndermek için giriş gerekli.', 'error')

            return

        }

        if (!matchProfile?.matchId) {

            toast.push('Eşleşme bilgisi bulunamadı.', 'error')

            return

        }



        try {

            setSendingHi(true)

            await sendMessage(matchProfile.matchId, user.id, 'Selam nasıl gidiyor')

            toast.push('Mesaj gönderildi.', 'success')

            setMatchOpen(false)

        } catch (err: unknown) {

            const message = err instanceof Error ? err.message : 'Mesaj gönderilemedi.'

            toast.push(message, 'error')

        } finally {

            setSendingHi(false)

        }

    }



    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {

        const swipePower = Math.abs(info.offset.x) * info.velocity.x



        if (swipePower > SWIPE_POWER_THRESHOLD || Math.abs(info.offset.x) > SWIPE_THRESHOLD) {

            handleSwipe(info.offset.x > 0 ? 'right' : 'left')

        }

    }



    const handleSuperLike = async () => {

        if (!current) return

        try {

            if (isPremium) {

                if (user) {

                    await superLikePaid(user.id, current.id)

                    toast.push('Süper Beğeni gönderildi!', 'success')

                    handleSwipe('right')

                }

            } else if (canDailySuperLike) {

                const freeOk = await superLikeFree(current.id)

                if (!freeOk) {

                    setConfirmMessage('S\u00fcper Be\u011feni \u00fccretli: 10 jeton. Devam edilsin mi?')

                    setConfirmText('Süper Beğeni')

                    setConfirmAction(() => async () => {

                        const ok = await spendCoins({ amount: 10, reason: 'super_like', skipConfirm: true })
                        if (!ok) return

                        if (!user) throw new Error('Kullanıcı yok')

                        await superLikePaid(user.id, current.id)

                        toast.push('Süper Beğeni gönderildi!', 'success')

                        handleSwipe('right')

                    })

                    setConfirmOpen(true)

                    return

                }

                toast.push('Süper Beğeni gönderildi!', 'success')

                handleSwipe('right')

            } else {

                setConfirmMessage('S\u00fcper Be\u011feni \u00fccretli: 10 jeton. Devam edilsin mi?')

                setConfirmText('Süper Beğeni')

                setConfirmAction(() => async () => {

                    const ok = await spendCoins({ amount: 10, reason: 'super_like', skipConfirm: true })
                    if (!ok) return

                    if (!user) throw new Error('Kullanıcı yok')

                    await superLikePaid(user.id, current.id)

                    toast.push('Süper Beğeni gönderildi!', 'success')

                    handleSwipe('right')

                })

                setConfirmOpen(true)

                return

            }

        } catch (err: unknown) {

            const message = err instanceof Error ? err.message : 'S\u00fcper Be\u011feni ba\u015far\u0131s\u0131z.'

            toast.push(message, 'error', { label: 'Tekrar dene', onClick: handleSuperLike })

        }

    }



    const handleRewind = async () => {

        if (!user) return

        if (!lastAction?.profile) {

            setConfirmMessage('Geri al\u0131nacak i\u015flem yok.')

            setConfirmText('Tamam')

            setConfirmAction(null)

            setConfirmCancelAction(null)

            setConfirmCancelText('Vazge\u00e7')

            setConfirmOpen(true)

            return

        }

        if (lastAction.wasMatch) {

            setConfirmMessage('Eşleşme oluştuğu için geri alınamıyor.')

            setConfirmText('Tamam')

            setConfirmAction(null)

            setConfirmCancelAction(null)

            setConfirmCancelText('Vazge\u00e7')

            setConfirmOpen(true)

            return

        }

        try {

            const doRewind = async () => {

                setRewinding(true)

                if (lastAction.type === 'pass') {

                    const { error } = await supabase

                        .from('passes')

                        .delete()

                        .eq('from_user', user.id)

                        .eq('to_user', lastAction.profile!.id)

                    if (error) throw error

                } else {

                    const { error: likeError } = await supabase

                        .from('likes')

                        .delete()

                        .eq('from_user', user.id)

                        .eq('to_user', lastAction.profile!.id)

                    if (likeError) throw likeError



                    const { error: matchError } = await supabase

                        .from('matches')

                        .delete()

                        .or(`and(user_a.eq.${user.id},user_b.eq.${lastAction.profile!.id}),and(user_a.eq.${lastAction.profile!.id},user_b.eq.${user.id})`)

                    if (matchError) throw matchError

                }



                queryClient.setQueriesData({ queryKey: ['feed-list', user.id] }, (old: { pages: Array<{ profiles: typeof profiles }>; pageParams: unknown[] } | undefined) => {

                    if (!old) return old

                    const first = old.pages[0]

                    if (!first) return old

                    const without = first.profiles.filter((p) => p.id !== lastAction.profile!.id)

                    const restored = [lastAction.profile!, ...without]

                    const nextPages = [{ ...first, profiles: restored }, ...old.pages.slice(1)]

                    return { ...old, pages: nextPages }

                })



                setCurrentIndex(0)

                await refetch()

                setLastAction(null)

                toast.push('Geri Alma uyguland\u0131.', 'success')

                setRewinding(false)

            }

            if (!isPremium) {

                setConfirmMessage('Premium ol.\nYa da 5 jeton kar\u015f\u0131l\u0131\u011f\u0131nda geri al.')

                setConfirmText('Premium Ol')

                setConfirmCancelText('5 Jetonla Geri Al')

                setConfirmAction(() => async () => {

                    router.push('/store/premium')

                })

                setConfirmCancelAction(() => async () => {

                    const ok = await spendCoins({ amount: 5, reason: 'rewind', skipConfirm: true })
                    if (!ok) return

                    await doRewind()

                })

                setConfirmOpen(true)

                return

            }

            await doRewind()

        } catch (err: unknown) {

            const message = err instanceof Error ? err.message : 'Geri Alma ba\u015far\u0131s\u0131z.'

            toast.push(message, 'error')

            setRewinding(false)

        }

    }



    const handleRewindClick = () => {

        if (rewinding) return

        if (!lastAction?.profile) {

            setConfirmMessage('Geri al\u0131nacak i\u015flem yok.')

            setConfirmText('Tamam')

            setConfirmAction(null)

            setConfirmCancelAction(null)

            setConfirmCancelText('Vazge\u00e7')

            setConfirmOpen(true)

            return

        }

        void handleRewind()

    }



    if (isLoading) {
        return <LoadingSplash text="Profiller yükleniyor..." />
    }



    if (!current) {

        return (

            <div className="flex flex-col items-center justify-center text-center space-y-4 p-8 bg-surface-1 border border-surface-2 rounded-[var(--radius-xl)] min-h-[50vh] shadow-[var(--shadow-md)]">

                <div className="text-6xl">😴</div>

                <h3 className="text-xl font-bold text-text-primary">Yeni profil yok</h3>

                <p className="text-text-secondary mt-1">Biraz sonra tekrar dene.</p>

                <Button

                    onClick={() => {

                        setCurrentIndex(0)

                        refetch()

                    }}

                    variant="primary"

                    className="mt-4"

                >

                    Yenile

                </Button>

            </div>

        )

    }



    const photoUrl = getProfileAvatar(current)

    const nextPhotoUrl = nextCard ? getProfileAvatar(nextCard) : null





    return (

        <div className="flex flex-col h-[calc(100dvh-60px-64px)] md:h-auto md:space-y-6 md:pb-4 pb-8">



            <div className="relative w-full max-w-[350px] sm:max-w-md mx-auto flex-1 min-h-0 md:flex-none md:aspect-[3/4] md:max-h-[70vh]">

                {nextCard && (

                    <div className="absolute inset-0 scale-95 opacity-50 rounded-3xl overflow-hidden">

                        <Image

                            src={nextPhotoUrl || '/placeholder-user.jpg'}

                            alt={nextCard.display_name || 'Kullanıcı'}

                            fill

                            sizes="(max-width: 768px) 100vw, 400px"

                            className="object-cover"

                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    </div>

                )}



                <AnimatePresence mode="wait">

                    {current && (

                        <motion.div

                            key={current.id}

                            drag="x"

                            dragConstraints={{ left: 0, right: 0 }}

                            dragElastic={0.7}

                            onDragEnd={handleDragEnd}

                            initial={{ scale: 1, opacity: 1, x: 0 }}

                            animate={{ scale: 1, opacity: 1, x: 0, rotate: 0 }}

                            exit={{

                                x: exitDirection === 'right' ? 500 : exitDirection === 'left' ? -500 : 0,

                                opacity: 0,

                                rotate: exitDirection === 'right' ? 20 : exitDirection === 'left' ? -20 : 0,

                                transition: { duration: 0.3 },

                            }}

                            className="absolute inset-0 rounded-[var(--radius-xl)] bg-surface-1 border border-surface-2 overflow-hidden shadow-[var(--shadow-md)] cursor-grab active:cursor-grabbing"

                        >

                            <Link href={`/profiles/${current.id}`} className="absolute inset-0 z-10">

                                <span className="sr-only">Profili Görüntüle</span>

                            </Link>



                            <Image

                                src={photoUrl}

                                alt={current.display_name || 'Kullanıcı'}

                                fill

                                sizes="(max-width: 768px) 100vw, 400px"

                                className="object-cover pointer-events-none"

                                priority

                            />



                            <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />



                            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2 z-20 pointer-events-none">

                                <h2 className="text-3xl font-bold force-white flex items-end gap-2 drop-shadow-md">

                                    {current.display_name}

                                    <span className="text-xl font-normal opacity-90 force-white leading-none mb-0.5">{current.age}</span>

                                </h2>

                                <div className="force-white-80 font-medium text-sm drop-shadow-sm">{current.city}</div>

                                {current.bio && (

                                    <p className="force-white-80 text-sm line-clamp-2 drop-shadow-sm mt-1">

                                        {current.bio}

                                    </p>

                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>



            <div className="flex items-center justify-center gap-3 sm:gap-4 py-2 sm:py-4 shrink-0 bg-transparent mb-8 sm:mb-0">

                <Button

                    onClick={handleRewindClick}

                    disabled={rewinding}

                    variant="outline"

                    size="icon"

                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-surface-2 bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-surface-2"

                    title="Geri Al"

                >

                    <RotateCcw size={18} />

                </Button>



                <Button

                    onClick={() => handleSwipe('left')}

                    variant="outline"

                    size="icon"

                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-surface-2 bg-surface-1 text-status-destructive hover:bg-status-destructive/10 hover:border-status-destructive"

                    title="Geç"

                >

                    <X size={24} />

                </Button>



                <Button

                    onClick={handleSuperLike}

                    variant="outline"

                    size="icon"

                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-surface-2 bg-surface-1 text-brand-accent hover:bg-brand-accent/10 hover:border-brand-accent"

                    title="Süper Beğeni"

                >

                    <Star size={20} />

                </Button>



                <Button

                    onClick={() => handleSwipe('right')}

                    variant="primary"

                    size="icon"

                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-lg shadow-brand-primary/30 hover:shadow-brand-primary/50"

                    title="Beğen"

                >

                    <Heart size={24} className="fill-current" />

                </Button>

            </div>



            <MatchCelebration

                open={matchOpen}

                onClose={() => setMatchOpen(false)}

                name={matchProfile?.name}

                photoUrl={matchProfile?.photo}

                onSayHi={handleSayHi}

                sayHiText="Ona merhaba de"

                continueText="Kaydırmaya devam et"

                sendingHi={sendingHi}

            />



            <ConfirmDialog

                open={confirmOpen}

                title="Onay"

                description={confirmMessage}

                confirmText={confirmText}

                cancelText={confirmCancelText}

                onClose={() => {

                    setConfirmOpen(false)

                    setConfirmAction(null)

                    setConfirmCancelAction(null)

                    setConfirmCancelText('Vazge\u00e7')

                }}

                onConfirm={async () => {

                    setConfirmOpen(false)

                    const action = confirmAction

                    setConfirmAction(null)

                    if (action) await action()

                }}

                onCancel={async () => {

                    const action = confirmCancelAction

                    setConfirmCancelAction(null)

                    setConfirmCancelText('Vazge\u00e7')

                    if (action) await action()

                }}

            />

        </div>

    )

}

