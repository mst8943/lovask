import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query'
import { fetchMessagesPage, sendMessage, Message, markMessagesRead, setTypingStatus, sendImageMessage, uploadChatImage, refundChatInitiation, MessagesPage } from '@/services/chatService'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useChat(matchId: string) {
    const { user } = useAuthStore()
    const queryClient = useQueryClient()
    const supabase = useMemo(() => createClient(), [])
    const [isOtherTyping, setIsOtherTyping] = useState(false)
    const [realtimeActive, setRealtimeActive] = useState(false)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const typingStateRef = useRef(false)
    const typingLastSentAtRef = useRef(0)
    const messagesChannelRef = useRef<RealtimeChannel | null>(null)
    const typingChannelRef = useRef<RealtimeChannel | null>(null)

    const PAGE_SIZE = 30
    const messagesQuery = useInfiniteQuery<MessagesPage, Error, InfiniteData<MessagesPage>, string[], string | null>({
        queryKey: ['messages', matchId],
        queryFn: ({ pageParam }: { pageParam: string | null }) => fetchMessagesPage(matchId, pageParam, PAGE_SIZE),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
        enabled: !!matchId,
        // We don't want to refetch on focus automatically, realtime handles it
        refetchOnWindowFocus: false,
        // Fallback polling if realtime is not active
        refetchInterval: realtimeActive ? false : 30000,
        refetchIntervalInBackground: !realtimeActive,
    })
    const messages = useMemo(
        () => messagesQuery.data?.pages.flatMap((p) => p.messages) || [],
        [messagesQuery.data]
    )

    // Send Message Mutation
    const sendMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!user) throw new Error('No user')
            return sendMessage(matchId, user.id, content)
        },
        onMutate: async (content) => {
            if (!user) return

            const previousMessages = queryClient.getQueryData<InfiniteData<MessagesPage>>(['messages', matchId])

            const optimisticMessage: Message = {
                id: Math.random().toString(), // Temp ID
                match_id: matchId,
                sender_id: user.id,
                content,
                created_at: new Date().toISOString(),
                media_url: null,
                read_at: null,
                type: 'text'
            }

            if (previousMessages) {
                const pages = [...previousMessages.pages]
                const lastIndex = pages.length - 1
                const lastPage = pages[lastIndex] || { messages: [], nextCursor: null }
                pages[lastIndex] = {
                    ...lastPage,
                    messages: [...lastPage.messages, optimisticMessage],
                }
                queryClient.setQueryData(['messages', matchId], { ...previousMessages, pages })
            }

            return { previousMessages }
        },
        onError: (err, newInfo, context) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(['messages', matchId], context.previousMessages)
            }
        },
        onSuccess: (data) => {
            if (!data) return

            queryClient.setQueryData(['messages', matchId], (old: InfiniteData<MessagesPage> | undefined) => {
                if (!old) return old
                const pages = old.pages.map((page, index) => {
                    const nextMessages = page.messages.filter((m) => !m.id.includes('.'))
                    if (index === old.pages.length - 1) {
                        return { ...page, messages: [...nextMessages, data] }
                    }
                    return { ...page, messages: nextMessages }
                })
                return { ...old, pages }
            })
        }
    })

    const sendImageMutation = useMutation({
        mutationFn: async (payload: { file: File; viewOnce?: boolean; expiresAt?: string | null }) => {
            if (!user) throw new Error('No user')
            const url = await uploadChatImage(payload.file, user.id, matchId)
            return sendImageMessage(matchId, user.id, url, '', {
                viewOnce: payload.viewOnce,
                expiresAt: payload.expiresAt,
            })
        },
    })

    // Realtime Subscription
    useEffect(() => {
        if (!matchId || !user) return

        if (messagesChannelRef.current) {
            supabase.removeChannel(messagesChannelRef.current)
        }

        const channel = supabase.channel(`chat:${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `match_id=eq.${matchId}`
                },
                (payload) => {
                    const newMessage = payload.new as Message

                    // Only process messages from OTHER users via realtime
                    // (Because own messages are handled by mutation success)
                    if (newMessage.sender_id === user.id) return

                    queryClient.setQueryData(['messages', matchId], (old: InfiniteData<MessagesPage> | undefined) => {
                        if (!old) return old
                        const pages = [...old.pages]
                        const lastIndex = pages.length - 1
                        const lastPage = pages[lastIndex] || { messages: [], nextCursor: null }
                        if (lastPage.messages.some((m) => m.id === newMessage.id)) return old
                        pages[lastIndex] = { ...lastPage, messages: [...lastPage.messages, newMessage] }
                        return { ...old, pages }
                    })
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `match_id=eq.${matchId}`
                },
                (payload) => {
                    const updated = payload.new as Message
                    queryClient.setQueryData(['messages', matchId], (old: InfiniteData<MessagesPage> | undefined) => {
                        if (!old) return old
                        const pages = old.pages.map((page) => {
                            const idx = page.messages.findIndex((m) => m.id === updated.id)
                            if (idx === -1) return page
                            const nextMessages = [...page.messages]
                            nextMessages[idx] = { ...nextMessages[idx], ...updated }
                            return { ...page, messages: nextMessages }
                        })
                        return { ...old, pages }
                    })
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setRealtimeActive(true)
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    setRealtimeActive(false)
                }
            })

        messagesChannelRef.current = channel
        return () => {
            if (messagesChannelRef.current) {
                supabase.removeChannel(messagesChannelRef.current)
                messagesChannelRef.current = null
            }
            setRealtimeActive(false)
        }
    }, [matchId, queryClient, supabase, user])

    // Typing status subscription
    useEffect(() => {
        if (!matchId || !user) return

        if (typingChannelRef.current) {
            supabase.removeChannel(typingChannelRef.current)
        }

        const channel = supabase.channel(`typing:${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'typing_status',
                    filter: `match_id=eq.${matchId}`,
                },
                (payload) => {
                    const row = payload.new as { user_id: string; is_typing: boolean }
                    if (!row || row.user_id === user.id) return
                    setIsOtherTyping(row.is_typing)
                }
            )
            .subscribe()

        typingChannelRef.current = channel
        return () => {
            if (typingChannelRef.current) {
                supabase.removeChannel(typingChannelRef.current)
                typingChannelRef.current = null
            }
        }
    }, [matchId, supabase, user])

    // Read receipts
    useEffect(() => {
        if (!matchId || !user) return
        if (!messages || messages.length === 0) return
        markMessagesRead(matchId, user.id).catch(() => null)
    }, [matchId, user, messages])

    const setTyping = async (value: boolean) => {
        if (!user) return
        const now = Date.now()
        const last = typingLastSentAtRef.current
        const lastState = typingStateRef.current
        if (lastState === value && now - last < 1200) return
        typingStateRef.current = value
        typingLastSentAtRef.current = now
        await setTypingStatus(matchId, user.id, value)
    }

    const handleTyping = () => {
        if (!user) return
        if (!typingStateRef.current) {
            setTyping(true).catch(() => null)
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
            setTyping(false).catch(() => null)
        }, 1500)
    }

    const sendImage = async (file: File, options?: { viewOnce?: boolean; expiresAt?: string | null }) => {
        return sendImageMutation.mutateAsync({ file, ...options })
    }

    const tryRefund = async () => {
        try {
            return await refundChatInitiation(matchId)
        } catch {
            return false
        }
    }

    return {
        messages: messages || [],
        isLoading: messagesQuery.isLoading,
        fetchNextPage: messagesQuery.fetchNextPage,
        hasNextPage: messagesQuery.hasNextPage,
        isFetchingNextPage: messagesQuery.isFetchingNextPage,
        sendMessage: sendMutation.mutateAsync,
        sendImage,
        isSending: sendMutation.isPending || sendImageMutation.isPending,
        isOtherTyping,
        handleTyping,
        setTyping,
        tryRefund,
    }
}
