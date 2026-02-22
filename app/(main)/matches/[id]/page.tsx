'use client'
import { useChat } from '@/hooks/useChat'
import { useAuthStore } from '@/store/useAuthStore'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { ArrowLeft, Send, Star, Image as ImageIcon, Gift, Archive, Heart, Trash2, MoreVertical, EyeOff, Timer, Info, Phone, Video, Mic, Smile, ListPlus } from 'lucide-react'
import { Match, sendImageMessage, sendMessage as sendChatMessage, Message, sendAudioMessage, sendStickerMessage, uploadChatAudio } from '@/services/chatService'
import { useEconomy } from '@/hooks/useEconomy'
import PremiumModal from '@/components/ui/PremiumModal'
import { createChatInitiation } from '@/services/chatService'
import { hasReadReceiptUnlock, unlockReadReceipts } from '@/services/extraFeaturesService'
import { fetchGifts, sendGift, Gift as GiftItem } from '@/services/giftService'
import { upsertChatState } from '@/services/chatStateService'
import AnimatedLoader from '@/components/ui/AnimatedLoader'
import GiftBurst from '@/components/ui/GiftBurst'
import { useQueryClient } from '@tanstack/react-query'
import { getGiftStickerUrl } from '@/lib/giftStickers'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { getProfileAvatar } from '@/utils/avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getPublicImageVariant, getStoragePathFromUrl, isPublicStorageUrl } from '@/utils/media'
import { CallSession, fetchLatestCallForMatch, respondCall, startCall } from '@/services/callService'
import { createMessageRequest, fetchMessageRequest, respondMessageRequest, MessageRequest } from '@/services/messageRequestService'
import { fetchStickers, Sticker } from '@/services/stickersService'
import { addReaction, fetchReactions } from '@/services/reactionsService'
import { createPoll, fetchPollsByMessageIds, votePoll, PollWithVotes } from '@/services/pollsService'
import Spinner from '@/components/ui/Spinner'
import { usePresenceStore } from '@/store/usePresenceStore'

type PresenceProfile = {
    id: string
    display_name?: string | null
    is_bot?: boolean | null
    gender?: string | null
    photos?: string[] | string | null
    last_active_at?: string | null
    users?: { last_active_at?: string | null } | null
}

export default function ChatRoom() {
    const params = useParams()
    const matchId = params.id as string
    const router = useRouter()
    const { user } = useAuthStore()
    const {
        messages,
        isLoading: messagesLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        sendMessage,
        sendImage,
        isSending,
        isOtherTyping,
        handleTyping,
        setTyping,
        tryRefund,
    } = useChat(matchId)
    const [match, setMatch] = useState<Match | null>(null)
    const [input, setInput] = useState('')
    const [isMatchLoading, setIsMatchLoading] = useState(true)
    const [showPremiumModal, setShowPremiumModal] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [showGifts, setShowGifts] = useState(false)
    const [giftList, setGiftList] = useState<GiftItem[]>([])
    const [sendingGift, setSendingGift] = useState(false)
    const [giftBurstUrl, setGiftBurstUrl] = useState<string | null>(null)
    const [giftBurstOpen, setGiftBurstOpen] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmMessage, setConfirmMessage] = useState('')
    const [confirmTitle, setConfirmTitle] = useState('Onay')
    const [confirmText, setConfirmText] = useState('Devam')
    const [confirmCancelText, setConfirmCancelText] = useState('Vazgeç')
    const [confirmVariant, setConfirmVariant] = useState<'default' | 'danger'>('default')
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
    const [callLoading, setCallLoading] = useState<'voice' | 'video' | null>(null)
    const [incomingCall, setIncomingCall] = useState<CallSession | null>(null)
    const [outgoingCall, setOutgoingCall] = useState<CallSession | null>(null)
    const [activeCall, setActiveCall] = useState<CallSession | null>(null)
    const [callElapsed, setCallElapsed] = useState(0)
    const [viewOnceMode, setViewOnceMode] = useState(false)
    const [expiresMode, setExpiresMode] = useState(false)
    const [now, setNow] = useState(() => Date.now())
    const [showMediaHelp, setShowMediaHelp] = useState(false)
    const [introSuggestions, setIntroSuggestions] = useState<string[]>([])
    const [introLoading, setIntroLoading] = useState(false)
    const queryClient = useQueryClient()
    const [chatState, setChatState] = useState({
        is_archived: false,
        is_favorite: false,
        is_trashed: false,
        deleted_at: null as string | null,
    })
    const scrollRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const lastMessageRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const viewedMediaRef = useRef<Set<string>>(new Set())
    const supabase = createClient()
    const [isBotChat, setIsBotChat] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const loadingOlderRef = useRef(false)
    const [signedMediaUrls, setSignedMediaUrls] = useState<Record<string, string>>({})
    const [messageRequestMode, setMessageRequestMode] = useState<'open' | 'request' | 'verified_only'>('open')
    const [isSelfVerified, setIsSelfVerified] = useState(false)
    const [messageRequest, setMessageRequest] = useState<MessageRequest | null>(null)
    const [requestLoading, setRequestLoading] = useState(false)
    const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({})
    const [stickersOpen, setStickersOpen] = useState(false)
    const [stickers, setStickers] = useState<Sticker[]>([])
    const [pollOpen, setPollOpen] = useState(false)
    const [pollQuestion, setPollQuestion] = useState('')
    const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
    const [polls, setPolls] = useState<Record<string, PollWithVotes>>({})
    const [recording, setRecording] = useState(false)
    const [recorder, setRecorder] = useState<MediaRecorder | null>(null)
    const recordChunksRef = useRef<Blob[]>([])
    const { spendCoins, isPremium, hasFeature, hasFeatureForTier } = useEconomy()
    const [canSeeReadReceipts, setCanSeeReadReceipts] = useState(false)
    const onlineUsers = usePresenceStore((s) => s.onlineUsers)
    const canChatFree = hasFeature('chat_unlimited')
    const canReadReceiptsFree = hasFeature('read_receipts')
    const premiumReadReceipts = hasFeatureForTier('premium', 'read_receipts')
    const showPremiumBadge = isPremium && hasFeature('premium_badge')
    useEffect(() => {
        const tick = () => setNow(Date.now())
        const id = setInterval(tick, 30000)
        return () => clearInterval(id)
    }, [])
    useEffect(() => {
        const getMatch = async () => {
            if (!user) return
            setIsMatchLoading(true)
            const { data, error } = await supabase
                .from('matches')
                .select('id,user_a,user_b,created_at,is_active')
                .eq('id', matchId)
                .single()
            if (error || !data) {
                console.error('Error fetching match:', error)
                setIsMatchLoading(false)
                return
            }
            const otherUserId = data.user_a === user.id ? data.user_b : data.user_a
            const { data: profile } = await supabase
                .from('profiles')
                .select('id,display_name,photos,is_bot,age,city,gender,bio,is_verified')
                .eq('id', otherUserId)
                .single()
            if (profile) {
                setMatch({ ...data, other_user: profile } as Match)
                if ((profile as { is_bot?: boolean | null }).is_bot) setIsBotChat(true)
            }
            setIsMatchLoading(false)
        }
        getMatch()
    }, [matchId, user, supabase])
    useEffect(() => {
        if (!user) return
        let interval: NodeJS.Timeout | null = null
        if (activeCall?.started_at) {
            const tick = () => {
                const start = new Date(activeCall.started_at as string).getTime()
                const diff = Math.max(0, Date.now() - start)
                setCallElapsed(Math.floor(diff / 1000))
            }
            tick()
            interval = setInterval(tick, 1000)
        } else {
            setCallElapsed(0)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [activeCall, user])
    useEffect(() => {
        if (!user) return
        const loadLatestCall = async () => {
            const latest = await fetchLatestCallForMatch(matchId)
            if (!latest) return
            if (latest.status === 'ringing' && latest.created_by !== user.id) {
                setIncomingCall(latest)
                setOutgoingCall(null)
                setActiveCall(null)
                return
            }
            if (latest.status === 'ringing' && latest.created_by === user.id) {
                setOutgoingCall(latest)
                setIncomingCall(null)
                setActiveCall(null)
                return
            }
            if (latest.status === 'active') {
                setActiveCall(latest)
                setIncomingCall(null)
                setOutgoingCall(null)
                return
            }
            setIncomingCall(null)
            setOutgoingCall(null)
            setActiveCall(null)
        }
        void loadLatestCall()
        const channel = supabase
            .channel(`call-sessions:${matchId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'call_sessions', filter: `match_id=eq.${matchId}` },
                (payload) => {
                    const row = (payload.new || payload.old) as CallSession
                    if (!row) return
                    if (row.status === 'ringing' && row.created_by !== user.id) {
                        setIncomingCall(row)
                        setOutgoingCall(null)
                        setActiveCall(null)
                        return
                    }
                    if (row.status === 'ringing' && row.created_by === user.id) {
                        setOutgoingCall(row)
                        setIncomingCall(null)
                        setActiveCall(null)
                        return
                    }
                    if (row.status === 'active') {
                        setActiveCall(row)
                        setIncomingCall(null)
                        setOutgoingCall(null)
                        return
                    }
                    setIncomingCall(null)
                    setOutgoingCall(null)
                    setActiveCall(null)
                }
            )
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [matchId, supabase, user])
    useEffect(() => {
        const loadState = async () => {
            if (!user) return
            const { data } = await supabase
                .from('chat_states')
                .select('is_archived,is_favorite,is_trashed,deleted_at')
                .eq('match_id', matchId)
                .eq('user_id', user.id)
                .maybeSingle()
            if (data) {
                setChatState({
                    is_archived: !!data.is_archived,
                    is_favorite: !!data.is_favorite,
                    is_trashed: !!data.is_trashed,
                    deleted_at: data.deleted_at || null,
                })
            }
        }
        loadState()
    }, [matchId, user, supabase])
    useEffect(() => {
        const loadRequesting = async () => {
            if (!user || !match) return
            const otherId = match.user_a === user.id ? match.user_b : match.user_a
            const [{ data: settings }, { data: selfProfile }, request] = await Promise.all([
                supabase
                    .from('user_settings')
                    .select('message_request_mode')
                    .eq('user_id', otherId)
                    .maybeSingle(),
                supabase
                    .from('profiles')
                    .select('is_verified')
                    .eq('id', user.id)
                    .maybeSingle(),
                fetchMessageRequest(matchId).catch(() => null),
            ])
            if (settings?.message_request_mode) {
                setMessageRequestMode(settings.message_request_mode as typeof messageRequestMode)
            }
            setIsSelfVerified(!!selfProfile?.is_verified)
            if (request) setMessageRequest(request)
        }
        loadRequesting()
    }, [match, matchId, supabase, user])
    useEffect(() => {
        const loadGifts = async () => {
            if (!showGifts) return
            const gifts = await fetchGifts()
            setGiftList(gifts)
        }
        loadGifts()
    }, [showGifts])
    useEffect(() => {
        const loadStickers = async () => {
            if (!stickersOpen) return
            const list = await fetchStickers()
            setStickers(list)
        }
        loadStickers()
    }, [stickersOpen])
    useEffect(() => {
        const loadUnlock = async () => {
            if (!user) return
            if (canReadReceiptsFree) {
                setCanSeeReadReceipts(true)
                return
            }
            const ok = await hasReadReceiptUnlock(matchId, user.id)
            setCanSeeReadReceipts(ok)
        }
        loadUnlock()
    }, [matchId, user, canReadReceiptsFree])
    const [hasAutoScrolled, setHasAutoScrolled] = useState(false)
    const scrollToBottom = useCallback((smooth?: boolean) => {
        const el = listRef.current
        if (!el) return
        const behavior = smooth ? 'smooth' : 'auto'
        el.scrollTop = el.scrollHeight
        el.scrollTo({ top: el.scrollHeight, behavior })
        scrollRef.current?.scrollIntoView({ behavior, block: 'end' })
        lastMessageRef.current?.scrollIntoView({ behavior, block: 'end' })
        if (!hasAutoScrolled) setHasAutoScrolled(true)
    }, [hasAutoScrolled])
    const loadOlder = useCallback(async () => {
        if (!listRef.current || !hasNextPage || isFetchingNextPage) return
        const el = listRef.current
        const prevHeight = el.scrollHeight
        const prevTop = el.scrollTop
        loadingOlderRef.current = true
        await fetchNextPage()
        requestAnimationFrame(() => {
            const nextHeight = el.scrollHeight
            el.scrollTop = nextHeight - prevHeight + prevTop
            loadingOlderRef.current = false
        })
    }, [fetchNextPage, hasNextPage, isFetchingNextPage])
    useLayoutEffect(() => {
        if (loadingOlderRef.current) return
        const smooth = hasAutoScrolled
        const id1 = requestAnimationFrame(() => scrollToBottom(smooth))
        const id2 = requestAnimationFrame(() => scrollToBottom(smooth))
        const id3 = setTimeout(() => scrollToBottom(smooth), 0)
        const id4 = setTimeout(() => scrollToBottom(smooth), 120)
        return () => {
            cancelAnimationFrame(id1)
            cancelAnimationFrame(id2)
            clearTimeout(id3)
            clearTimeout(id4)
        }
    }, [messages.length, hasAutoScrolled, scrollToBottom])
    useEffect(() => {
        if (messagesLoading || isMatchLoading) return
        const id = setTimeout(() => scrollToBottom(false), 150)
        return () => clearTimeout(id)
    }, [messagesLoading, isMatchLoading, scrollToBottom])
    useEffect(() => {
        const el = listRef.current
        if (!el) return
        const onScroll = () => {
            if (el.scrollTop < 120) {
                loadOlder()
            }
        }
        el.addEventListener('scroll', onScroll)
        return () => el.removeEventListener('scroll', onScroll)
    }, [loadOlder])
    useEffect(() => {
        return () => {
            setTyping(false).catch(() => null)
        }
    }, [setTyping])
    useEffect(() => {
        const loadSignedUrls = async () => {
            const pending = messages
                .map((m) => m.media_url)
                .filter((url): url is string => !!url)
                .filter((url) => !signedMediaUrls[url])
            if (pending.length === 0) return
            const updates: Record<string, string> = {}
            await Promise.all(pending.map(async (raw) => {
                let path = raw
                if (raw.startsWith('http')) {
                    const extracted = getStoragePathFromUrl(raw)
                    if (!extracted) return
                    path = extracted
                }
                if (!path.startsWith('chat-media/') && !path.startsWith('chat-audio/')) return
                const bucket = path.startsWith('chat-audio/') ? 'chat-audio' : 'chat-media'
                const objectPath = path.replace(/^chat-audio\//, '').replace(/^chat-media\//, '')
                const { data } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 3600)
                if (data?.signedUrl) {
                    updates[raw] = data.signedUrl
                }
            }))
            if (Object.keys(updates).length > 0) {
                setSignedMediaUrls((prev) => ({ ...prev, ...updates }))
            }
        }
        loadSignedUrls()
    }, [messages, signedMediaUrls, supabase])
    useEffect(() => {
        const loadReactions = async () => {
            const ids = messages.map((m) => m.id).filter(Boolean)
            if (ids.length === 0) return
            const list = await fetchReactions(ids)
            const grouped: Record<string, Record<string, number>> = {}
            for (const r of list) {
                if (!grouped[r.message_id]) grouped[r.message_id] = {}
                grouped[r.message_id][r.reaction] = (grouped[r.message_id][r.reaction] || 0) + 1
            }
            setReactions(grouped)
            const pollsList = await fetchPollsByMessageIds(ids)
            const pollMap: Record<string, PollWithVotes> = {}
            for (const p of pollsList) pollMap[p.message_id] = p
            setPolls(pollMap)
        }
        loadReactions()
    }, [messages])
    useEffect(() => {
        if (!user) return
        const markViewed = async () => {
            const candidates = messages.filter((m) => {
                if (!m.media_url) return false
                if (m.sender_id === user.id) return false
                const viewOnce = !!(m as Message & { media_view_once?: boolean | null }).media_view_once
                const viewedAt = (m as Message & { media_viewed_at?: string | null }).media_viewed_at
                if (!viewOnce || viewedAt) return false
                const expiresAt = (m as Message & { media_expires_at?: string | null }).media_expires_at
                if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return false
                if (viewedMediaRef.current.has(m.id)) return false
                return true
            })
            if (candidates.length === 0) return
            for (const msg of candidates) {
                viewedMediaRef.current.add(msg.id)
                await supabase
                    .from('messages')
                    .update({ media_viewed_at: new Date().toISOString() })
                    .eq('id', msg.id)
            }
        }
        void markViewed()
    }, [messages, supabase, user])
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isSending) return
        const content = input.trim()
        const isFirstMessage = messages.length === 0
        const requiresRequest = messageRequestMode === 'request' || (messageRequestMode === 'verified_only' && !isSelfVerified)
        const hasAcceptedRequest = messageRequest?.status === 'accepted'
        if (isFirstMessage && requiresRequest && !hasAcceptedRequest) {
            setConfirmTitle('Mesaj istegi gerekli')
            setConfirmMessage('Ilk mesaj icin once mesaj istegi gondermelisin.')
            setConfirmText('Tamam')
            setConfirmCancelText('Kapat')
            setConfirmVariant('default')
            setConfirmAction(() => null)
            setConfirmOpen(true)
            return
        }
        const sendContent = async () => {
            try {
                await sendMessage(content)
                setTyping(false).catch(() => null)
                const lastMessage = messages[messages.length - 1]
                const isReplying = !!lastMessage && lastMessage.sender_id !== user?.id
                if (isReplying) {
                    await tryRefund()
                }
                if (isBotChat) {
                    const res = await fetch('/api/bots/respond', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            match_id: matchId,
                            bot_id: otherUser?.id,
                            user_message: content,
                        }),
                    })
                    if (!res.ok) {
                        const text = await res.text()
                        console.error('Auto respond error:', text)
                    }
                }
            } catch (error) {
                console.error('Failed to send:', error)
                setInput(content)
            }
        }
        if (isFirstMessage && !canChatFree) {
            setConfirmTitle('Sohbet Başlat')
            setConfirmMessage('Yeni sohbet başlatmak 20 jeton. Devam edilsin mi?')
            setConfirmText('Başlat')
            setConfirmCancelText('Vazgeç')
            setConfirmVariant('default')
            setConfirmAction(() => async () => {
                const ok = await spendCoins({ amount: 20, reason: 'chat_initiation', metadata: { match_id: matchId }, skipConfirm: true })
                if (!ok) return
                await createChatInitiation(matchId, user!.id, 20)
                setInput('')
                await sendContent()
            })
            setConfirmOpen(true)
            return
        }
        setInput('')
        await sendContent()
    }
    const startQuickCall = async (callType: 'voice' | 'video') => {
        if (callLoading) return
        setCallLoading(callType)
        try {
            const { call } = await startCall(matchId, callType)
            setOutgoingCall(call)
            setConfirmTitle('Arama baslatildi')
            setConfirmMessage('Karsi tarafa cagri gonderildi.')
            setConfirmText('Tamam')
            setConfirmCancelText('Kapat')
            setConfirmVariant('default')
            setConfirmAction(() => null)
            setConfirmOpen(true)
        } catch (err: unknown) {
            setConfirmTitle('Arama baslatilamadi')
            setConfirmMessage(err instanceof Error ? err.message : 'Arama baslatilirken hata olustu.')
            setConfirmText('Tamam')
            setConfirmCancelText('Kapat')
            setConfirmVariant('default')
            setConfirmAction(() => null)
            setConfirmOpen(true)
        } finally {
            setCallLoading(null)
        }
    }
    const formatCallDuration = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    const loadIntroSuggestions = async () => {
        if (introLoading) return
        setIntroLoading(true)
        try {
            const res = await fetch('/api/chat/intro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ matchId }),
            })
            if (!res.ok) {
                setIntroSuggestions([])
                return
            }
            const data = await res.json()
            const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : []
            setIntroSuggestions(suggestions.filter((s: string) => !!s))
        } catch {
            setIntroSuggestions([])
        } finally {
            setIntroLoading(false)
        }
    }
    const handleImageUpload = async (file: File) => {
        if (!file) return
        if (isSending || uploadingImage) return
        setUploadingImage(true)
        try {
            const expiresAt = expiresMode ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null
            await sendImage(file, { viewOnce: viewOnceMode, expiresAt })
            setViewOnceMode(false)
            setExpiresMode(false)
            const lastMessage = messages[messages.length - 1]
            const isReplying = !!lastMessage && lastMessage.sender_id !== user?.id
            if (isReplying) {
                await tryRefund()
            }
        } catch (error) {
            console.error('Failed to upload image:', error)
        } finally {
            setUploadingImage(false)
        }
    }
    const appendMessage = (message: Message) => {
        queryClient.setQueryData(['messages', matchId], (old: { pages: { messages: Message[] }[] } | undefined) => {
            if (!old) return old
            const pages = [...old.pages]
            const lastIndex = pages.length - 1
            const lastPage = pages[lastIndex] || { messages: [] }
            pages[lastIndex] = { ...lastPage, messages: [...lastPage.messages, message] }
            return { ...old, pages }
        })
    }
    const toggleReaction = async (messageId: string, reaction: string) => {
        await addReaction(messageId, reaction)
        setReactions((prev) => {
            const next = { ...prev }
            if (!next[messageId]) next[messageId] = {}
            next[messageId][reaction] = (next[messageId][reaction] || 0) + 1
            return next
        })
    }
    const startRecording = async () => {
        if (recording) return
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            recordChunksRef.current = []
            setRecorder(mediaRecorder)
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordChunksRef.current = [...recordChunksRef.current, e.data]
                }
            }
            mediaRecorder.onstop = async () => {
                const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' })
                if (!user) return
                const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
                const url = await uploadChatAudio(file, user.id, matchId)
                const inserted = await sendAudioMessage(matchId, user.id, url, Math.max(1, Math.round(blob.size / 1000)))
                if (inserted) appendMessage(inserted as Message)
            }
            mediaRecorder.start()
            setRecording(true)
        } catch (err) {
            console.error(err)
        }
    }
    const stopRecording = () => {
        if (!recorder) return
        recorder.stop()
        recorder.stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        setRecorder(null)
    }
    const updateChatState = async (patch: Partial<typeof chatState>) => {
        if (!user) return
        const next = { ...chatState, ...patch }
        setChatState(next)
        await upsertChatState({
            match_id: matchId,
            user_id: user.id,
            is_archived: next.is_archived,
            is_favorite: next.is_favorite,
            is_trashed: next.is_trashed,
            deleted_at: next.deleted_at,
        })
    }
    const handleSendGift = async (giftId: string) => {
        if (sendingGift) return
        setSendingGift(true)
        try {
            await sendGift(matchId, giftId)
            const gift = giftList.find((item) => item.id === giftId)
            if (gift) {
                const stickerUrl = getGiftStickerUrl(gift.name) || gift.image_url || null
                if (stickerUrl && user) {
                    const inserted = await sendImageMessage(matchId, user.id, stickerUrl, 'gift')
                    if (inserted) {
                        queryClient.setQueryData(['messages', matchId], (old: Message[] | undefined) => {
                            const current = old || []
                            if (current.some((m) => m.id === inserted.id)) return current
                            return [...current, inserted]
                        })
                    }
                    setGiftBurstUrl(stickerUrl)
                    setGiftBurstOpen(true)
                } else if (user) {
                    await sendChatMessage(matchId, user.id, `Hediye: ${gift.name}`)
                }
            }
            setShowGifts(false)
        } catch (error) {
            console.error('Gift error', error)
            setConfirmTitle('Hediye Gönderilemedi')
            setConfirmMessage('Jeton bakiyesi veya yetkiyi kontrol et.')
            setConfirmText('Tamam')
            setConfirmCancelText('Kapat')
            setConfirmVariant('default')
            setConfirmAction(() => null)
            setConfirmOpen(true)
        } finally {
            setSendingGift(false)
        }
    }
    const promptReadReceipts = () => {
        setConfirmTitle('Okundu Bilgisi')
        setConfirmMessage('Okundu bilgisini açmak istiyor musun?')
        setConfirmText('Aç')
        setConfirmCancelText('Vazgeç')
        setConfirmVariant('default')
        setConfirmAction(() => async () => {
            if (!user) return
            try {
                const ok = await spendCoins({ amount: 5, reason: 'read_receipts', metadata: { match_id: matchId }, skipConfirm: true })
                if (!ok) return
                await unlockReadReceipts(matchId, user.id)
                setCanSeeReadReceipts(true)
            } catch {
                setShowPremiumModal(true)
            }
        })
        setConfirmOpen(true)
    }
    if (messagesLoading || isMatchLoading || !match) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <AnimatedLoader label="Sohbet yukleniyor..." />
            </div>
        )
    }
    const otherUser = (match.other_user as PresenceProfile | null)
    const photoUrl = getProfileAvatar(otherUser)

    // START: REAL-TIME PRESENCE LOGIC
    const otherLastActive = otherUser?.last_active_at || otherUser?.users?.last_active_at || null
    const isOnlineFallback = otherLastActive ? now - new Date(otherLastActive).getTime() < 10 * 60 * 1000 : false
    const isOnlineRealtime = otherUser ? onlineUsers.has(otherUser.id) : false
    const otherOnline = otherUser?.is_bot ? true : (isOnlineRealtime || isOnlineFallback)
    // END: REAL-TIME PRESENCE LOGIC

    const matchDateLabel = match.created_at ? new Date(match.created_at).toLocaleDateString() : '—'
    const isRequestRecipient = messageRequest?.recipient_id === user?.id
    const showRequestBanner = messageRequest?.status === 'pending' && isRequestRecipient
    const canRequest = messages.length === 0 && (messageRequestMode === 'request' || (messageRequestMode === 'verified_only' && !isSelfVerified))
    const hasAcceptedRequest = messageRequest?.status === 'accepted'
    return (
        <div className="fixed inset-x-0 top-[60px] bottom-[64px] flex flex-col bg-[var(--background)] pb-0 md:static md:mx-auto md:max-w-5xl md:pb-8">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-16 -left-10 w-48 h-48 bg-pink-500/10 blur-3xl rounded-full" />
                <div className="absolute top-32 -right-16 w-52 h-52 bg-violet-500/10 blur-3xl rounded-full" />
            </div>
            <div className="flex items-center gap-4 px-4 py-3 border-b border-white/10 bg-[var(--background)]/70 backdrop-blur-md z-10 sticky top-0">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="p-2 -ml-2 hover:bg-white/10 rounded-full"
                >
                    <ArrowLeft size={20} />
                </Button>
                <div className="relative w-10 h-10 rounded-full overflow-hidden border border-pink-500/50">
                    <Image
                        src={photoUrl}
                        alt={otherUser?.display_name || 'User'}
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        {otherUser?.display_name}
                        {showPremiumBadge && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                    </h3>
                    {isOtherTyping ? (
                        <span className="text-xs text-pink-400">Yazıyor...</span>
                    ) : otherOnline ? (
                        <span className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] rounded-full" /> Çevrim içi
                        </span>
                    ) : (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            Çevrimdışı
                        </span>
                    )}
                </div>
                <div className="hidden md:flex items-center gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => startQuickCall('voice')}
                        disabled={!!callLoading}
                        className="rounded-full"
                        title="Sesli arama"
                    >
                        <Phone size={16} />
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => startQuickCall('video')}
                        disabled={!!callLoading}
                        className="rounded-full"
                        title="Görüntülü arama"
                    >
                        <Video size={16} />
                    </Button>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden p-2 -mr-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                    <MoreVertical size={20} />
                </Button>
            </div>
            {incomingCall && (
                <div className="mx-4 mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold text-emerald-200">Gelen {incomingCall.call_type === 'video' ? 'görüntülü' : 'sesli'} arama</div>
                        <span className="text-[10px] text-emerald-200/70">Yanıt bekliyor</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            onClick={async () => {
                                try {
                                    const { call } = await respondCall(incomingCall.id, 'accept')
                                    setActiveCall(call)
                                    setIncomingCall(null)
                                } catch (err) {
                                    console.error(err)
                                }
                            }}
                            className="flex-1"
                        >
                            Kabul et
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={async () => {
                                try {
                                    await respondCall(incomingCall.id, 'decline')
                                    setIncomingCall(null)
                                } catch (err) {
                                    console.error(err)
                                }
                            }}
                            className="flex-1"
                        >
                            Reddet
                        </Button>
                    </div>
                </div>
            )}
            {
                outgoingCall && !activeCall && (
                    <div className="mx-4 mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm flex items-center justify-between">
                        <div className="font-semibold text-amber-200">
                            {outgoingCall.call_type === 'video' ? 'Görüntülü' : 'Sesli'} arama gönderildi
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                                try {
                                    await respondCall(outgoingCall.id, 'end')
                                    setOutgoingCall(null)
                                } catch (err) {
                                    console.error(err)
                                }
                            }}
                        >
                            İptal
                        </Button>
                    </div>
                )
            }
            {
                activeCall && (
                    <div className="mx-4 mt-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                            <div className="font-semibold text-cyan-200">
                                Aktif {activeCall.call_type === 'video' ? 'görüntülü' : 'sesli'} arama
                            </div>
                            <div className="text-xs text-cyan-200/70">{formatCallDuration(callElapsed)}</div>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                                try {
                                    await respondCall(activeCall.id, 'end')
                                    setActiveCall(null)
                                } catch (err) {
                                    console.error(err)
                                }
                            }}
                        >
                            Bitir
                        </Button>
                    </div>
                )
            }
            {/* Mobile Menu Dropdown */}
            {
                isMobileMenuOpen && (
                    <div className="absolute top-[60px] right-2 z-50 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden md:hidden animate-in fade-in zoom-in-95 duration-200">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                startQuickCall('voice')
                                setIsMobileMenuOpen(false)
                            }}
                            className="w-full justify-start px-4 py-3 text-sm hover:bg-white/5 flex items-center gap-3"
                        >
                            <Phone size={16} className="text-gray-400" />
                            <span>Sesli ara</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                startQuickCall('video')
                                setIsMobileMenuOpen(false)
                            }}
                            className="w-full justify-start px-4 py-3 text-sm hover:bg-white/5 flex items-center gap-3"
                        >
                            <Video size={16} className="text-gray-400" />
                            <span>Goruntulu ara</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                updateChatState({ is_favorite: !chatState.is_favorite })
                                setIsMobileMenuOpen(false)
                            }}
                            className="w-full justify-start px-4 py-3 text-sm hover:bg-white/5 flex items-center gap-3"
                        >
                            <Heart size={16} className={chatState.is_favorite ? 'text-pink-400' : 'text-gray-400'} />
                            <span>{chatState.is_favorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                updateChatState({ is_archived: !chatState.is_archived })
                                setIsMobileMenuOpen(false)
                            }}
                            className="w-full justify-start px-4 py-3 text-sm hover:bg-white/5 flex items-center gap-3"
                        >
                            <Archive size={16} className="text-gray-400" />
                            <span>{chatState.is_archived ? 'Arşivden çıkar' : 'Arşivle'}</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                updateChatState({ is_trashed: !chatState.is_trashed })
                                setIsMobileMenuOpen(false)
                            }}
                            className="w-full justify-start px-4 py-3 text-sm hover:bg-white/5 flex items-center gap-3"
                        >
                            <Trash2 size={16} className="text-gray-400" />
                            <span>{chatState.is_trashed ? 'Çöpten çıkar' : 'Çöpe at'}</span>
                        </Button>
                        <div className="h-px bg-white/10 my-1" />
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                updateChatState({ deleted_at: new Date().toISOString() })
                                setIsMobileMenuOpen(false)
                            }}
                            className="w-full justify-start px-4 py-3 text-sm hover:bg-red-500/10 text-red-400 flex items-center gap-3"
                        >
                            <Trash2 size={16} />
                            <span>Sohbeti sil</span>
                        </Button>
                    </div>
                )
            }
            <div className="hidden md:flex px-4 py-2 border-b border-white/10 bg-[var(--background)]/60 backdrop-blur-md flex-wrap gap-2 text-xs">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => updateChatState({ is_favorite: !chatState.is_favorite })}
                    className="px-3 py-1 rounded-full bg-white/10 flex items-center gap-1"
                >
                    <Heart size={12} className={chatState.is_favorite ? 'text-pink-400' : 'text-gray-300'} />
                    Favori
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => updateChatState({ is_archived: !chatState.is_archived })}
                    className="px-3 py-1 rounded-full bg-white/10 flex items-center gap-1"
                >
                    <Archive size={12} />
                    {chatState.is_archived ? 'Arşivden çıkar' : 'Arşivle'}
                </Button>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => updateChatState({ is_trashed: !chatState.is_trashed })}
                    className="px-3 py-1 rounded-full bg-white/10 flex items-center gap-1"
                >
                    <Trash2 size={12} />
                    {chatState.is_trashed ? 'Çöpten çıkar' : 'Çöpe at'}
                </Button>
                <Button
                    type="button"
                    variant="destructive"
                    onClick={() => updateChatState({ deleted_at: new Date().toISOString() })}
                    className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 flex items-center gap-1"
                >
                    <Trash2 size={12} />
                    Sohbeti sil
                </Button>
            </div>
            <div className="px-4 py-2 border-b border-white/10 bg-[var(--background)]/60 backdrop-blur-md flex flex-wrap items-center gap-2 text-[10px] text-gray-300">
                {otherOnline && (
                    <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Çevrim içi
                    </span>
                )}
                <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                    Eşleşme: {matchDateLabel}
                </span>
                <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                    Okundu: {canSeeReadReceipts ? 'Açık' : 'Kapalı'}
                </span>
                {isBotChat && null}
            </div>
            <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 pb-0">
                {showRequestBanner && (
                    <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5">
                        <div className="text-sm font-semibold">Mesaj istegi</div>
                        <div className="text-xs text-gray-400 mt-1">
                            Karsi taraf sohbet acmak istiyor. Onaylarsaniz mesajlar gorunur.
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Button
                                type="button"
                                size="sm"
                                className="text-xs"
                                onClick={async () => {
                                    if (!messageRequest) return
                                    const updated = await respondMessageRequest(messageRequest.id, 'accept')
                                    setMessageRequest(updated)
                                }}
                            >
                                Onayla
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="text-xs"
                                onClick={async () => {
                                    if (!messageRequest) return
                                    const updated = await respondMessageRequest(messageRequest.id, 'decline')
                                    setMessageRequest(updated)
                                }}
                            >
                                Reddet
                            </Button>
                        </div>
                    </div>
                )}
                {!showRequestBanner && canRequest && !hasAcceptedRequest && (
                    <div className="glass-panel p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5">
                        <div className="text-sm font-semibold">Mesaj istegi gerekli</div>
                        <div className="text-xs text-gray-400 mt-1">
                            Karsi taraf yalnizca onaylanan mesaj isteklerini kabul ediyor.
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Button
                                type="button"
                                size="sm"
                                className="text-xs"
                                disabled={requestLoading}
                                onClick={async () => {
                                    if (!user || !match) return
                                    const preview = input.trim()
                                    if (!preview) {
                                        setConfirmTitle('Onizleme gerekli')
                                        setConfirmMessage('Kisa bir mesaj yazip istek gonderebilirsin.')
                                        setConfirmText('Tamam')
                                        setConfirmCancelText('Kapat')
                                        setConfirmVariant('default')
                                        setConfirmAction(() => null)
                                        setConfirmOpen(true)
                                        return
                                    }
                                    const otherId = match.user_a === user.id ? match.user_b : match.user_a
                                    setRequestLoading(true)
                                    try {
                                        const request = await createMessageRequest(matchId, user.id, otherId, preview)
                                        setMessageRequest(request)
                                        setInput('')
                                        setConfirmTitle('Mesaj istegi gonderildi')
                                        setConfirmMessage('Karsi taraf onaylayinca mesajlariniz acilacak.')
                                        setConfirmText('Tamam')
                                        setConfirmCancelText('Kapat')
                                        setConfirmVariant('default')
                                        setConfirmAction(() => null)
                                        setConfirmOpen(true)
                                    } catch (error) {
                                        setConfirmTitle('Mesaj istegi gonderilemedi')
                                        setConfirmMessage(error instanceof Error ? error.message : 'Istekte hata olustu.')
                                        setConfirmText('Tamam')
                                        setConfirmCancelText('Kapat')
                                        setConfirmVariant('default')
                                        setConfirmAction(() => null)
                                        setConfirmOpen(true)
                                    } finally {
                                        setRequestLoading(false)
                                    }
                                }}
                            >
                                {requestLoading ? 'Gonderiliyor...' : 'Istek gonder'}
                            </Button>
                        </div>
                    </div>
                )}
                {hasNextPage && (
                    <div className="flex justify-center">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={loadOlder}
                            disabled={isFetchingNextPage}
                            className="rounded-full text-xs px-4"
                        >
                            {isFetchingNextPage ? 'Yükleniyor...' : 'Daha eski mesajlar'}
                        </Button>
                    </div>
                )}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50 space-y-2">
                        <div className="text-4xl">🙂</div>
                        <p className="text-sm">Sohbete başla!</p>
                        {!canChatFree && <p className="text-xs text-yellow-500">Ücret: 20 jeton</p>}
                    </div>
                )}
                {messages.map((msg, index) => {
                    const isMe = msg.sender_id === user?.id
                    const isOptimistic = msg.id.includes('.')
                    const isImage = msg.type === 'image' && msg.media_url
                    const isSticker = msg.type === 'sticker' && msg.media_url
                    const isAudio = msg.type === 'audio' && msg.media_url
                    const isPoll = msg.type === 'poll'
                    const isGift = isImage && msg.content === 'gift'
                    const rawMediaUrl = msg.media_url || ''
                    const mediaExpiresAt = (msg as Message & { media_expires_at?: string | null }).media_expires_at || null
                    const mediaViewOnce = !!(msg as Message & { media_view_once?: boolean | null }).media_view_once
                    const mediaViewedAt = (msg as Message & { media_viewed_at?: string | null }).media_viewed_at || null
                    const isExpired = !!mediaExpiresAt && new Date(mediaExpiresAt).getTime() <= now
                    const shouldHideForViewer = !isMe && mediaViewOnce && !!mediaViewedAt
                    const isBlockedMedia = isExpired || shouldHideForViewer
                    const signedUrl = rawMediaUrl ? signedMediaUrls[rawMediaUrl] : ''
                    const mediaUrl = (isImage || isSticker) && rawMediaUrl
                        ? (signedUrl || (isPublicStorageUrl(rawMediaUrl)
                            ? getPublicImageVariant(rawMediaUrl, {
                                width: isGift ? 256 : 480,
                                height: isGift ? 256 : 480,
                                quality: 70,
                            })
                            : rawMediaUrl))
                        : ''
                    const canRenderImage = (isImage || isSticker) && !!mediaUrl && !isBlockedMedia
                    return (
                        <div
                            key={msg.id || index}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            ref={index === messages.length - 1 ? lastMessageRef : undefined}
                        >
                            <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                <div
                                    className={`px-4 py-3 rounded-2xl text-sm break-words ${isMe
                                        ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white rounded-br-none shadow-lg shadow-pink-500/20'
                                        : 'glass-panel text-[var(--foreground)] rounded-bl-none'
                                        } ${isOptimistic ? 'opacity-70' : ''}`}
                                >
                                    {(isImage || isSticker) ? (
                                        <div className={`relative ${isGift ? 'w-32 h-32' : 'w-48 h-48'} rounded-2xl overflow-hidden`}>
                                            <div className={isGift ? 'absolute inset-0 bg-gradient-to-br from-pink-500/20 via-violet-500/10 to-transparent' : ''} />
                                            {canRenderImage ? (
                                                <Image
                                                    src={mediaUrl}
                                                    alt="Sohbet gorseli"
                                                    fill
                                                    className="object-cover"
                                                    onLoadingComplete={() => scrollToBottom(false)}
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400 bg-white/5">
                                                    {isBlockedMedia ? (isExpired ? 'Süre doldu' : 'Görüldü') : 'Yükleniyor...'}
                                                </div>
                                            )}
                                        </div>
                                    ) : isAudio ? (
                                        <audio controls src={signedMediaUrls[rawMediaUrl] || ''} className="w-56" />
                                    ) : isPoll ? (
                                        <div className="space-y-2">
                                            <div className="text-sm font-semibold">{polls[msg.id]?.question || 'Anket'}</div>
                                            {(polls[msg.id]?.options || []).map((opt, idx) => {
                                                const poll = polls[msg.id]
                                                const votes = poll?.votes?.filter((v) => v.option_index === idx).length || 0
                                                return (
                                                    <Button
                                                        key={`${msg.id}-${idx}`}
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        className="w-full justify-between text-xs"
                                                        onClick={async () => {
                                                            if (!poll) return
                                                            const vote = await votePoll(poll.id, idx)
                                                            setPolls((prev) => ({
                                                                ...prev,
                                                                [msg.id]: {
                                                                    ...poll,
                                                                    votes: [...(poll.votes || []), vote],
                                                                },
                                                            }))
                                                        }}
                                                    >
                                                        <span>{opt}</span>
                                                        <span>{votes}</span>
                                                    </Button>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        msg.content
                                    )}
                                    {isGift && (
                                        <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
                                            Hediye
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    {['👍', '❤️', '😂', '🔥'].map((emoji) => (
                                        <button
                                            key={`${msg.id}-${emoji}`}
                                            onClick={() => toggleReaction(msg.id, emoji)}
                                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                    {reactions[msg.id] && (
                                        <div className="text-[10px] text-gray-300 ml-2">
                                            {Object.entries(reactions[msg.id]).map(([emoji, count]) => (
                                                <span key={`${msg.id}-${emoji}`} className="mr-2">{emoji} {count}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="text-[10px] opacity-70 text-right mt-1">
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {isMe && (
                                    <div className="text-[10px] opacity-80 text-right mt-0.5">
                                        {canSeeReadReceipts ? (
                                            msg.read_at ? 'Görüldü' : ''
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="link"
                                                onClick={promptReadReceipts}
                                                className="h-auto px-0 text-pink-200 hover:text-pink-100 underline underline-offset-2"
                                            >
                                                {`${otherUser?.display_name || 'Karşı taraf'} mesajını gördü mü?`}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
                <div ref={scrollRef} />
            </div>
            <div className="p-4 bg-[var(--background)]/80 backdrop-blur-md border-t border-white/10 safe-area-bottom">
                {messages.length === 0 && (
                    <div className="mb-3 flex flex-wrap gap-2 items-center">
                        {introSuggestions.length === 0 ? (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={loadIntroSuggestions}
                                disabled={introLoading}
                                className="rounded-full text-xs px-4"
                            >
                                {introLoading ? 'Öneriler hazırlanıyor...' : 'Akıllı giriş önerileri'}
                            </Button>
                        ) : (
                            introSuggestions.map((text) => (
                                <Button
                                    key={text}
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setInput(text)}
                                    className="text-xs"
                                >
                                    {text}
                                </Button>
                            ))
                        )}
                    </div>
                )}
                <form onSubmit={handleSend} className="flex gap-2 items-center">
                    {(viewOnceMode || expiresMode || showMediaHelp) && (
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-pink-200 bg-pink-500/10 border border-pink-500/20 px-3 py-1 rounded-full">
                            {viewOnceMode && <span>Görüldü sil aktif</span>}
                            {expiresMode && <span>10 dk sonra sil aktif</span>}
                            {showMediaHelp && (
                                <span>
                                    Görüldü sil: karşı taraf görüntüleyince gizlenir. 10 dk modu: süre bitince gizlenir.
                                </span>
                            )}
                        </div>
                    )}
                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file)
                            e.currentTarget.value = ''
                        }}
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-full text-white"
                        disabled={uploadingImage}
                    >
                        <ImageIcon size={18} />
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => setShowGifts(true)}
                        className="rounded-full text-white"
                    >
                        <Gift size={18} />
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => setStickersOpen(true)}
                        className="rounded-full text-white"
                    >
                        <Smile size={18} />
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => setPollOpen(true)}
                        className="rounded-full text-white"
                    >
                        <ListPlus size={18} />
                    </Button>
                    <Button
                        type="button"
                        variant={recording ? 'default' : 'secondary'}
                        size="icon"
                        onClick={() => (recording ? stopRecording() : startRecording())}
                        className="rounded-full text-white"
                    >
                        <Mic size={18} />
                    </Button>
                    <div className="relative group">
                        <Button
                            type="button"
                            variant={viewOnceMode ? 'default' : 'secondary'}
                            size="icon"
                            onClick={() => {
                                setViewOnceMode((prev) => !prev)
                                if (!viewOnceMode) setExpiresMode(false)
                            }}
                            className="rounded-full"
                            title="Görüldü sil"
                            aria-pressed={viewOnceMode}
                        >
                            <EyeOff size={16} />
                        </Button>
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-[10px] text-gray-200 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                            Görüldü sil: karşı taraf görüntüleyince gizlenir.
                        </div>
                    </div>
                    <div className="relative group">
                        <Button
                            type="button"
                            variant={expiresMode ? 'default' : 'secondary'}
                            size="icon"
                            onClick={() => {
                                setExpiresMode((prev) => !prev)
                                if (!expiresMode) setViewOnceMode(false)
                            }}
                            className="rounded-full"
                            title="10 dk sonra sil"
                            aria-pressed={expiresMode}
                        >
                            <Timer size={16} />
                        </Button>
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-36 -translate-x-1/2 rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-[10px] text-gray-200 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                            10 dk modu: süre bitince gizlenir.
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => setShowMediaHelp((prev) => !prev)}
                        className="rounded-full"
                        title="Medya gizlilik bilgisi"
                        aria-pressed={showMediaHelp}
                    >
                        <Info size={16} />
                    </Button>
                    <Input
                        type="text"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value)
                            handleTyping()
                        }}
                        placeholder={messages.length === 0 && !canChatFree ? 'Merhaba de (20 jeton)...' : 'Mesaj yaz...'}
                        className="flex-1 min-w-0 rounded-full px-6 py-3 text-[var(--foreground)] placeholder-gray-500 border-none"
                    />
                    <Button
                        type="submit"
                        disabled={!input.trim() || isSending}
                        className="md:hidden rounded-full"
                        size="icon"
                    >
                        {isSending ? <Spinner className="animate-spin w-5 h-5" /> : <Send size={20} />}
                    </Button>
                    <Button
                        type="submit"
                        disabled={!input.trim() || isSending}
                        className="hidden md:inline-flex rounded-full"
                        size="icon"
                    >
                        {isSending ? <Spinner className="animate-spin w-5 h-5" /> : <Send size={20} />}
                    </Button>
                </form>
                {/* Okundu bilgisi satın alma butonu kaldırıldı */}
                {!canReadReceiptsFree && !canSeeReadReceipts && !premiumReadReceipts && (
                    <div className="mt-3 text-xs text-gray-500 text-center">Okundu bilgisi bu paketler için kapalı.</div>
                )}
            </div>
            {showPremiumModal && <PremiumModal onClose={() => setShowPremiumModal(false)} />}
            <GiftBurst
                open={giftBurstOpen}
                imageUrl={giftBurstUrl}
                onDone={() => setGiftBurstOpen(false)}
            />
            <ConfirmDialog
                open={confirmOpen}
                title={confirmTitle}
                description={confirmMessage}
                confirmText={confirmText}
                cancelText={confirmCancelText}
                variant={confirmVariant}
                onClose={() => {
                    setConfirmOpen(false)
                    setConfirmAction(null)
                }}
                onConfirm={async () => {
                    setConfirmOpen(false)
                    const action = confirmAction
                    setConfirmAction(null)
                    if (action) await action()
                }}
            />
            {
                showGifts && (
                    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end md:items-center justify-center p-4">
                        <div className="bg-[#0b0f14] border border-white/10 rounded-2xl w-full max-w-md p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold">Hediye gönder</div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowGifts(false)}
                                    className="h-auto px-0 text-xs text-gray-400 hover:text-white"
                                >
                                    Kapat
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {giftList.map((g) => (
                                    <Button
                                        key={g.id}
                                        type="button"
                                        variant="secondary"
                                        onClick={() => handleSendGift(g.id)}
                                        disabled={sendingGift}
                                        className="w-full bg-white/5 rounded-xl p-3 text-left hover:bg-white/10"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/5">
                                                <Image
                                                    src={getGiftStickerUrl(g.name) || g.image_url || '/placeholder-user.jpg'}
                                                    alt={g.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="text-xs text-gray-300">Sticker</div>
                                        </div>
                                        <div className="text-sm font-semibold">{g.name}</div>
                                        <div className="text-xs text-gray-400">{g.price} jeton</div>
                                    </Button>
                                ))}
                                {giftList.length === 0 && (
                                    <div className="text-xs text-gray-400 col-span-2">Hediye bulunamadı.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {
                stickersOpen && (
                    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end md:items-center justify-center p-4">
                        <div className="bg-[#0b0f14] border border-white/10 rounded-2xl w-full max-w-md p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold">Sticker gönder</div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setStickersOpen(false)}
                                    className="h-auto px-0 text-xs text-gray-400 hover:text-white"
                                >
                                    Kapat
                                </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {stickers.map((s) => (
                                    <Button
                                        key={s.id}
                                        type="button"
                                        variant="secondary"
                                        onClick={async () => {
                                            if (!user) return
                                            const inserted = await sendStickerMessage(matchId, user.id, s.id, s.image_url)
                                            if (inserted) appendMessage(inserted as Message)
                                            setStickersOpen(false)
                                        }}
                                        className="w-full bg-white/5 rounded-xl p-3 text-left hover:bg-white/10"
                                    >
                                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white/5">
                                            <Image src={s.image_url} alt={s.name} fill className="object-cover" />
                                        </div>
                                    </Button>
                                ))}
                                {stickers.length === 0 && (
                                    <div className="text-xs text-gray-400 col-span-3">Sticker bulunamadı.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {
                pollOpen && (
                    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end md:items-center justify-center p-4">
                        <div className="bg-[#0b0f14] border border-white/10 rounded-2xl w-full max-w-md p-4 space-y-3">
                            <div className="font-semibold">Anket oluştur</div>
                            <Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} placeholder="Soru" />
                            <div className="space-y-2">
                                {pollOptions.map((opt, idx) => (
                                    <Input
                                        key={`opt-${idx}`}
                                        value={opt}
                                        onChange={(e) => {
                                            const next = [...pollOptions]
                                            next[idx] = e.target.value
                                            setPollOptions(next)
                                        }}
                                        placeholder={`Seçenek ${idx + 1}`}
                                    />
                                ))}
                                {pollOptions.length < 4 && (
                                    <Button type="button" variant="secondary" size="sm" onClick={() => setPollOptions((prev) => [...prev, ''])}>
                                        Seçenek ekle
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    onClick={async () => {
                                        if (!user) return
                                        const options = pollOptions.map((o) => o.trim()).filter(Boolean)
                                        if (!pollQuestion.trim() || options.length < 2) return
                                        const poll = await createPoll(matchId, user.id, pollQuestion.trim(), options)
                                        if (poll?.message_id) {
                                            const message: Message = {
                                                id: poll.message_id,
                                                match_id: matchId,
                                                sender_id: user.id,
                                                content: poll.question,
                                                media_url: null,
                                                type: 'poll',
                                                read_at: null,
                                                created_at: new Date().toISOString(),
                                            }
                                            appendMessage(message)
                                            setPolls((prev) => ({
                                                ...prev,
                                                [poll.message_id]: { ...poll, votes: [] },
                                            }))
                                        }
                                        setPollOpen(false)
                                        setPollQuestion('')
                                        setPollOptions(['', ''])
                                    }}
                                >
                                    Gönder
                                </Button>
                                <Button type="button" variant="secondary" onClick={() => setPollOpen(false)}>Kapat</Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
