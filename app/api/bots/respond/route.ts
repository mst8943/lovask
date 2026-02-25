import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'

const LANGUAGE_NAMES: Record<string, string> = {
    tr: 'Turkish',
    en: 'English',
    de: 'German',
    fr: 'French',
    ar: 'Arabic',
}

const detectLanguageFromText = (text: string): string | null => {
    const raw = (text || '').trim()
    if (!raw) return null

    if (/\p{Script=Arabic}/u.test(raw)) return 'ar'
    if (/[ğĞıİşŞçÇöÖüÜ]/.test(raw)) return 'tr'
    if (/[ßÄÖÜäöü]/.test(raw)) return 'de'
    if (/[àâçéèêëîïôûùüÿœ]/i.test(raw)) return 'fr'

    const words = raw
        .toLowerCase()
        .replace(/[^a-zğışçöüàâçéèêëîïôûùüÿœßäöü]+/gi, ' ')
        .split(/\s+/)
        .filter(Boolean)

    const score = (list: string[]) => words.reduce((acc, w) => acc + (list.includes(w) ? 1 : 0), 0)

    const scores: Record<string, number> = {
        tr: score(['selam', 'merhaba', 'nasılsın', 'naber', 'teşekkür', 'lütfen', 'evet', 'hayır', 'ben', 'sen', 'ama', 'çünkü', 'çok', 'değil', 'var', 'yok', 'mı', 'mi', 'mu', 'mü']),
        en: score(['hello', 'hi', 'hey', 'how', 'are', 'you', 'thanks', 'please', 'yes', 'no', 'i', 'we', 'but', 'because', 'not', 'this', 'that', 'do', 'did', 'can']),
        de: score(['hallo', 'wie', 'geht', 'dir', 'danke', 'bitte', 'ja', 'nein', 'ich', 'du', 'und', 'aber', 'nicht', 'was', 'ist', 'das', 'guten', 'morgen', 'abend']),
        fr: score(['bonjour', 'salut', 'comment', 'ça', 'va', 'merci', 's', 'il', 'vous', 'je', 'tu', 'oui', 'non', 'mais', 'pas', 'quoi', 'est', 'le', 'la', 'un', 'une', 'bien']),
    }

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
    if (!best || best[1] === 0) return null

    const [bestLang, bestScore] = best
    const secondScore = Object.entries(scores)
        .filter(([lang]) => lang !== bestLang)
        .map(([, v]) => v)
        .sort((a, b) => b - a)[0] || 0

    if (bestScore === secondScore) return null
    return bestLang
}

const getFallbackReply = (lang: string): string => {
    switch (lang) {
        case 'tr':
            return 'Mesajını aldım. Biraz daha anlatır mısın?'
        case 'en':
            return 'I got your message. Can you tell me a bit more?'
        case 'de':
            return 'Ich habe deine Nachricht gesehen. Magst du ein bisschen mehr erzählen?'
        case 'fr':
            return 'J’ai bien reçu ton message. Tu peux m’en dire un peu plus ?'
        case 'ar':
            return 'وصلت رسالتك. هل يمكنك أن تخبرني المزيد؟'
        default:
            return 'Mesajını aldım. Biraz daha anlatır mısın?'
    }
}

type FallbackSettings = {
    enabled?: boolean
    messages?: Record<string, string[]>
    groups?: Record<string, { messages?: Record<string, string[]>; neutral?: Record<string, string[]> }>
    delays?: { group1?: number; group2?: number; group3?: number }
    message_tr?: string | null
    message_en?: string | null
    message_de?: string | null
    message_fr?: string | null
    message_ar?: string | null
}

const pickFallbackMessage = (lang: string, settings?: FallbackSettings | null): string | null => {
    const list = settings?.messages?.[lang]
    if (Array.isArray(list) && list.length > 0) {
        const usable = list.map((v) => (v || '').trim()).filter(Boolean)
        if (usable.length > 0) {
            return usable[Math.floor(Math.random() * usable.length)]
        }
    }
    const legacyMap: Record<string, string | null | undefined> = {
        tr: settings?.message_tr,
        en: settings?.message_en,
        de: settings?.message_de,
        fr: settings?.message_fr,
        ar: settings?.message_ar,
    }
    const legacy = legacyMap[lang]
    if (legacy && legacy.trim()) return legacy.trim()
    return null
}

const getFallbackReplyWithSettings = (lang: string, settings?: FallbackSettings | null): string => {
    if (settings?.enabled !== false) {
        const picked = pickFallbackMessage(lang, settings)
        if (picked) return picked
    }
    return getFallbackReply(lang)
}

const detectAggressive = (text: string): boolean => {
    const raw = (text || '').toLowerCase()
    if (!raw) return false
    const aggressiveWords = [
        'aptal', 'salak', 'gerizekalı', 'şerefsiz', 'mal', 'siktir', 'orospu', 'piç',
        'fuck', 'fck', 'shit', 'bitch', 'idiot', 'stupid', 'asshole', 'moron',
    ]
    return aggressiveWords.some((w) => raw.includes(w))
}

const getFallbackGroupFromStreak = (streak: number) => {
    if (streak <= 1) return 'group1'
    if (streak === 2) return 'group2'
    return 'group3'
}

const getFallbackDelaySeconds = (group: string, settings?: FallbackSettings | null) => {
    const delays = settings?.delays || {}
    if (group === 'group1') return Number(delays.group1 ?? 300)
    if (group === 'group2') return Number(delays.group2 ?? 600)
    return Number(delays.group3 ?? 0)
}

const getFallbackList = (
    lang: string,
    settings: FallbackSettings | null | undefined,
    group: string,
    aggressive: boolean
): string[] => {
    if (!settings || settings.enabled === false) return []
    const groups = settings.groups || {}
    const groupData = groups[group] || {}
    const normal = groupData.messages || {}
    const neutral = groupData.neutral || {}
    const list = (aggressive ? neutral[lang] : normal[lang]) || []
    if (Array.isArray(list) && list.length > 0) {
        return list.map((v) => (v || '').trim()).filter(Boolean)
    }
    if (settings.messages && group === 'group1') {
        const legacyList = settings.messages[lang]
        if (Array.isArray(legacyList)) {
            return legacyList.map((v) => (v || '').trim()).filter(Boolean)
        }
    }
    return []
}

const detectUnsafe = (text: string): string | null => {
    const raw = (text || '').toLowerCase()
    if (!raw) return null
    if (/\b(?:\+?\d[\d\s().-]{6,}\d)\b/.test(raw)) return 'phone'
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) return 'email'
    if (/\b(0x[a-f0-9]{16,}|bc1[a-z0-9]{8,})\b/i.test(raw)) return 'crypto'
    if (/\bhttps?:\/\/\S+/i.test(raw)) return 'url'
    return null
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const { match_id, bot_id, user_message } = body
        if (!match_id || !bot_id || !user_message) {
            return new NextResponse('Missing parameters', { status: 400 })
        }
        const admin = createAdminClient()
        // Resolve participants directly from match to avoid auth session fragility in route handlers.
        const { data: match } = await admin
            .from('matches')
            .select('user_a,user_b')
            .eq('id', match_id)
            .maybeSingle()
        if (!match) return new NextResponse('Unauthorized', { status: 401 })
        const { data: participants } = await admin
            .from('profiles')
            .select('id,is_bot')
            .in('id', [match.user_a, match.user_b])
        const bot = (participants || []).find((p) => p.is_bot)
        const human = (participants || []).find((p) => !p.is_bot)
        if (!bot || bot.id !== bot_id || !human) {
            return new NextResponse('Unauthorized', { status: 401 })
        }
        if (auth.user.id !== human.id) {
            return new NextResponse('Forbidden', { status: 403 })
        }

        const authUser = { id: human.id }
        const requestStarted = Date.now()

        const rate = rateLimit(`bots-respond:${authUser.id}`, 6, 60_000)
        if (!rate.ok) {
            return new NextResponse('Too many requests', { status: 429, headers: rateLimitHeaders(6, rate) })
        }

        const { data: botProfile } = await admin
            .from('profiles')
            .select('display_name,age,gender,city,bio')
            .eq('id', bot_id)
            .maybeSingle()

        const { data: botConfig } = await admin
            .from('bot_configs')
            .select('personality_prompt,behavior_settings,tone,language_mode,engagement_intensity,read_receipt_delay_s,use_global')
            .eq('user_id', bot_id)
            .maybeSingle()

        if (botConfig?.behavior_settings?.active === false) {
            return NextResponse.json({ skipped: 'inactive' })
        }

        const { data: override } = await admin
            .from('bot_chat_overrides')
            .select('ai_enabled')
            .eq('match_id', match_id)
            .maybeSingle()
        if (override?.ai_enabled === false) {
            return NextResponse.json({ skipped: 'admin_handoff' })
        }

        const { data: quarantine } = await admin
            .from('bot_quarantine')
            .select('id,active')
            .eq('user_id', authUser.id)
            .maybeSingle()
        if (quarantine?.active) {
            return NextResponse.json({ skipped: 'quarantine' })
        }

        const { data: handoff } = await admin
            .from('bot_handoffs')
            .select('id,active')
            .eq('match_id', match_id)
            .eq('bot_id', bot_id)
            .maybeSingle()
        if (handoff?.active) {
            return NextResponse.json({ skipped: 'handoff' })
        }

        type BotSettings = {
            tone?: string | null
            language_mode?: string | null
            engagement_intensity?: string | null
            read_receipt_delay_s?: number | null
            cooldown_seconds?: number | null
            active_hours?: number[] | null
            response_delay_min_s?: number | null
            response_delay_max_s?: number | null
            global_prompt?: string | null
        }

        const groupId = botConfig?.behavior_settings?.group_id
        let groupPrompt = ''
        let groupSettings: BotSettings | null = null
        if (groupId) {
            const { data: group } = await admin.from('bot_groups').select('*').eq('id', groupId).maybeSingle()
            groupPrompt = group?.prompt || ''
            groupSettings = group as BotSettings
        }

        const { data: messages } = await admin
            .from('messages')
            .select('sender_id,content,created_at')
            .eq('match_id', match_id)
            .order('created_at', { ascending: true })
            .limit(30)

        const { data: globalSettings } = await admin
            .from('bot_global_settings')
            .select('*')
            .limit(1)
            .maybeSingle()

        const useGlobal = botConfig?.use_global !== false
        const base: BotSettings = useGlobal
            ? (groupSettings || (globalSettings as BotSettings) || {})
            : ((botConfig as BotSettings) || {})
        const fallback: BotSettings = (globalSettings as BotSettings) || {}
        const tone = (useGlobal ? (base.tone || fallback.tone) : (botConfig?.tone || fallback.tone)) || 'playful'
        const languageMode: string = (useGlobal ? (base.language_mode || fallback.language_mode) : (botConfig?.language_mode || fallback.language_mode)) || 'auto'
        const intensity = (useGlobal ? (base.engagement_intensity || fallback.engagement_intensity) : (botConfig?.engagement_intensity || fallback.engagement_intensity)) || 'medium'
        const readReceiptDelay = (useGlobal ? (base.read_receipt_delay_s || fallback.read_receipt_delay_s) : (botConfig?.read_receipt_delay_s || fallback.read_receipt_delay_s)) || 10
        const detectedLanguage = languageMode === 'auto' ? detectLanguageFromText(user_message) : null
        const effectiveLanguage = languageMode === 'auto' ? (detectedLanguage || 'auto') : languageMode

        const cooldownSeconds =
            Number(botConfig?.behavior_settings?.cooldown_seconds)
            || Number(groupSettings?.cooldown_seconds)
            || Number(globalSettings?.cooldown_seconds)
            || 5
        if (cooldownSeconds > 0) {
            const { data: cd } = await admin
                .from('bot_cooldowns')
                .select('last_sent_at')
                .eq('bot_id', bot_id)
                .eq('user_id', authUser.id)
                .maybeSingle()
            if (cd?.last_sent_at) {
                const last = new Date(cd.last_sent_at).getTime()
                if (Date.now() - last < cooldownSeconds * 1000) {
                    return NextResponse.json({ skipped: 'cooldown' })
                }
            }
        }

        const { data: experiment } = await admin
            .from('bot_experiments')
            .select('*')
            .eq('status', 'active')
            .or(`target_type.eq.global,target_id.eq.${bot_id}${groupId ? `,target_id.eq.${groupId}` : ''}`)
            .limit(1)
            .maybeSingle()
        let experimentPrompt = ''
        if (experiment?.id) {
            const { data: assignment } = await admin
                .from('bot_experiment_assignments')
                .select('variant_id')
                .eq('experiment_id', experiment.id)
                .eq('match_id', match_id)
                .maybeSingle()
            let variantId = assignment?.variant_id as string | null
            if (!variantId) {
                const { data: variants } = await admin
                    .from('bot_experiment_variants')
                    .select('id,weight')
                    .eq('experiment_id', experiment.id)
                const list = variants || []
                if (list.length > 0) {
                    const seed = Array.from(String(match_id)).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
                    const total = list.reduce((acc: number, v: { weight: number }) => acc + (v.weight || 1), 0)
                    let pick = seed % total
                    let chosen = list[0]
                    for (const v of list as Array<{ id: string; weight: number }>) {
                        pick -= (v.weight || 1)
                        if (pick < 0) {
                            chosen = v
                            break
                        }
                    }
                    variantId = chosen.id
                    await admin.from('bot_experiment_assignments').insert({
                        experiment_id: experiment.id,
                        match_id,
                        variant_id: variantId,
                    })
                }
            }
            if (variantId) {
                const { data: variant } = await admin
                    .from('bot_experiment_variants')
                    .select('prompt')
                    .eq('id', variantId)
                    .maybeSingle()
                experimentPrompt = variant?.prompt || ''
            }
        }

        const systemPrompt = [
            'You are a friendly dating app user. Respond naturally and keep responses concise.',
            'Do not mention you are an AI or a bot.',
            'If the user writes in Turkish, reply only in Turkish and avoid any non-Latin scripts.',
            botProfile
                ? `Profile: ${botProfile.display_name}, ${botProfile.age}, ${botProfile.gender}, ${botProfile.city}. Bio: ${botProfile.bio || ''}`
                : '',
            groupPrompt ? `Group personality: ${groupPrompt}` : '',
            globalSettings?.global_prompt ? `Global prompt: ${globalSettings.global_prompt}` : '',
            botConfig?.personality_prompt ? `Personal prompt: ${botConfig.personality_prompt}` : '',
            experimentPrompt ? `Experiment prompt: ${experimentPrompt}` : '',
            `Tone: ${tone}.`,
            `Language: ${effectiveLanguage}.`,
            languageMode === 'auto'
                ? `Reply in the same language as the user's latest message. If it's mixed, pick the dominant language; if unclear, default to Turkish.`
                : `Reply only in ${LANGUAGE_NAMES[languageMode] || languageMode}.`,
            `Engagement intensity: ${intensity}.`,
        ].filter(Boolean).join('\n')

        const conversation = ((messages || []) as Array<{ sender_id: string; content: string | null }>).map((m) => ({
            role: m.sender_id === bot_id ? 'assistant' : 'user',
            content: m.content || '',
        }))

        conversation.push({ role: 'user', content: user_message })

        const unsafeUser = detectUnsafe(user_message)
        if (unsafeUser) {
            await admin.from('bot_safety_events').insert({
                bot_id,
                match_id,
                user_id: authUser.id,
                category: unsafeUser,
                content: user_message,
            })
        }

        // Schedule checks
        const { data: schedule } = await admin
            .from('bot_schedules')
            .select('*')
            .eq('bot_id', bot_id)
            .maybeSingle()

        const activeHours = schedule?.active_hours || groupSettings?.active_hours || globalSettings?.active_hours
        if (activeHours && Array.isArray(activeHours) && activeHours.length > 0) {
            const now = new Date()
            const hour = now.getUTCHours()
            if (!activeHours.includes(hour)) {
                return NextResponse.json({ skipped: 'inactive_hours' })
            }
        }

        // Daily message limit
        const dailyLimit = schedule?.daily_message_limit || null
        if (dailyLimit) {
            const { count } = await admin
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('sender_id', bot_id)
                .gte('created_at', new Date(new Date().toDateString()).toISOString())
            if ((count || 0) >= dailyLimit) {
                return NextResponse.json({ skipped: 'daily_limit' })
            }
        }

        const { data: openrouterSettings } = await admin
            .from('app_settings')
            .select('value')
            .eq('key', 'openrouter_settings')
            .maybeSingle()
        const openrouterValue = (openrouterSettings?.value || {}) as { api_key?: string; model?: string; base_url?: string }
        const { data: fallbackSettings } = await admin
            .from('app_settings')
            .select('value')
            .eq('key', 'openrouter_fallback')
            .maybeSingle()
        const fallbackValue = (fallbackSettings?.value || {}) as FallbackSettings
        const apiKey = openrouterValue.api_key || process.env.OPENROUTER_API_KEY
        const model = openrouterValue.model || DEFAULT_MODEL
        const baseUrl = openrouterValue.base_url || 'https://openrouter.ai/api/v1/chat/completions'

        const fetchUserStreak = async () => {
            const { data: recent } = await admin
                .from('messages')
                .select('sender_id,created_at,content,type')
                .eq('match_id', match_id)
                .order('created_at', { ascending: false })
                .limit(30)
            let streak = 0
            let lastUserMessage: { created_at: string; content: string | null } | null = null
            for (const msg of recent || []) {
                if (msg.sender_id === bot_id) break
                if (msg.sender_id === authUser.id) {
                    streak += 1
                    if (!lastUserMessage) {
                        lastUserMessage = { created_at: msg.created_at, content: msg.content }
                    }
                }
            }
            return { streak, lastUserMessage }
        }

        const sendFallbackMessage = async (group: string, triggeredAt: string) => {
            const { streak, lastUserMessage } = await fetchUserStreak()
            if (!lastUserMessage) return
            const expectedGroup = getFallbackGroupFromStreak(streak)
            if (expectedGroup !== group) return
            const { data: botAfter } = await admin
                .from('messages')
                .select('id')
                .eq('match_id', match_id)
                .eq('sender_id', bot_id)
                .gt('created_at', triggeredAt)
                .limit(1)
            if (botAfter && botAfter.length > 0) return

            const langGuess = detectLanguageFromText(lastUserMessage.content || '') || 'tr'
            const aggressive = detectAggressive(lastUserMessage.content || '')

            const { data: usedRows } = await admin
                .from('messages')
                .select('content')
                .eq('match_id', match_id)
                .eq('sender_id', bot_id)
                .eq('type', 'fallback')
                .limit(500)
            const used = new Set((usedRows || []).map((r) => (r.content || '').trim()).filter(Boolean))

            const list = getFallbackList(langGuess, fallbackValue, group, aggressive)
            const usable = list.filter((v) => !used.has(v))
            if (usable.length === 0) return
            const candidate = usable[Math.floor(Math.random() * usable.length)]

            await admin.from('messages').insert({
                match_id,
                sender_id: bot_id,
                content: candidate,
                type: 'fallback',
            })
        }

        const scheduleFallback = async (group: string, delaySeconds: number, triggeredAt: string) => {
            if (fallbackValue?.enabled === false) return
            if (delaySeconds <= 0) {
                await sendFallbackMessage(group, triggeredAt)
                return
            }
            setTimeout(() => {
                void sendFallbackMessage(group, triggeredAt)
            }, delaySeconds * 1000)
        }
        if (!apiKey) {
            if (fallbackValue?.enabled === false) {
                return NextResponse.json({ scheduled: false, disabled: true }, { headers: rateLimitHeaders(6, rate) })
            }
            const { streak, lastUserMessage } = await fetchUserStreak()
            const group = getFallbackGroupFromStreak(streak)
            const delaySeconds = getFallbackDelaySeconds(group, fallbackValue)
            if (lastUserMessage?.created_at) {
                await scheduleFallback(group, delaySeconds, lastUserMessage.created_at)
            }
            return NextResponse.json({ scheduled: true, group, delay_s: delaySeconds }, { headers: rateLimitHeaders(6, rate) })
        }

        // Response delay
        const minDelay = schedule?.response_delay_min_s ?? groupSettings?.response_delay_min_s ?? globalSettings?.response_delay_min_s ?? 2
        const maxDelay = schedule?.response_delay_max_s ?? groupSettings?.response_delay_max_s ?? globalSettings?.response_delay_max_s ?? 8
        const delayMs = (Math.random() * (maxDelay - minDelay) + minDelay) * 1000
        await new Promise((r) => setTimeout(r, delayMs))

        // Mark user's last message as read for bots if read receipts are unlocked/premium.
        // Do this before the bot response is generated (even if the response fails).
        try {
            const { data: viewer } = await admin
                .from('users')
                .select('is_premium')
                .eq('id', authUser.id)
                .maybeSingle()

            let hasReadReceipts = !!viewer?.is_premium
            if (!hasReadReceipts) {
                const { data: unlock } = await admin
                    .from('read_receipt_unlocks')
                    .select('id')
                    .eq('match_id', match_id)
                    .eq('user_id', authUser.id)
                    .maybeSingle()
                hasReadReceipts = !!unlock
            }

            if (hasReadReceipts) {
                const { data: lastUserMessage } = await admin
                    .from('messages')
                    .select('id')
                    .eq('match_id', match_id)
                    .eq('sender_id', authUser.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (lastUserMessage?.id) {
                    await admin
                        .from('messages')
                        .update({ read_at: new Date().toISOString() })
                        .eq('id', lastUserMessage.id)
                    const readDelayMs = Math.max(0, Number(readReceiptDelay) || 0) * 1000
                    if (readDelayMs > 0) {
                        await new Promise((r) => setTimeout(r, readDelayMs))
                    }
                }
            }
        } catch {
            // Non-blocking: read receipt update failures shouldn't break bot response.
        }

        const maxTokens =
            intensity === 'low' ? 120 :
                intensity === 'high' ? 300 : 200

        const referer = process.env.APP_ORIGIN || req.headers.get('origin') || 'http://localhost'
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': referer,
                'X-Title': 'Lovask',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...conversation,
                ],
                temperature: intensity === 'low' ? 0.6 : intensity === 'high' ? 0.9 : 0.8,
                max_tokens: maxTokens,
            }),
        })

        let json: { choices?: Array<{ message?: { content?: string } }>; usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number } } | null = null
        let botReply = ''
        if (response.ok) {
            json = await response.json()
            botReply = json?.choices?.[0]?.message?.content?.trim() || ''
        } else {
            // Model/provider errors should not break chat UX; fallback reply keeps flow alive.
            void response.text().catch(() => '')
            botReply = ''
        }

        if (!botReply) {
            if (fallbackValue?.enabled === false) {
                return NextResponse.json({ scheduled: false, disabled: true }, { headers: rateLimitHeaders(6, rate) })
            }
            const { streak, lastUserMessage } = await fetchUserStreak()
            const group = getFallbackGroupFromStreak(streak)
            const delaySeconds = getFallbackDelaySeconds(group, fallbackValue)
            if (lastUserMessage?.created_at) {
                await scheduleFallback(group, delaySeconds, lastUserMessage.created_at)
            }
            return NextResponse.json({ scheduled: true, group, delay_s: delaySeconds }, { headers: rateLimitHeaders(6, rate) })
        }

        const unsafeBot = detectUnsafe(botReply)
        if (unsafeBot) {
            await admin.from('bot_safety_events').insert({
                bot_id,
                match_id,
                user_id: authUser.id,
                category: unsafeBot,
                content: botReply,
            })
            const lang = effectiveLanguage === 'auto' ? 'tr' : effectiveLanguage
            botReply = getFallbackReplyWithSettings(lang, fallbackValue)
        }

        await admin.from('messages').insert({
            match_id,
            sender_id: bot_id,
            content: botReply,
            type: 'text',
        })

        await admin.from('bot_memories').upsert({
            match_id,
            bot_id,
            memory_text: user_message.slice(0, 300),
            last_user_message: user_message.slice(0, 500),
            last_bot_reply: botReply.slice(0, 500),
            updated_at: new Date().toISOString(),
        }, { onConflict: 'match_id,bot_id' })

        await admin.from('bot_cooldowns').upsert({
            bot_id,
            user_id: authUser.id,
            last_sent_at: new Date().toISOString(),
        }, { onConflict: 'bot_id,user_id' })

        const day = new Date().toISOString().slice(0, 10)
        const latency = Math.max(0, Date.now() - requestStarted)
        const { data: health } = await admin
            .from('bot_health_daily')
            .select('replies,reply_latency_ms,safety_flags')
            .eq('bot_id', bot_id)
            .eq('day', day)
            .maybeSingle()
        if (health) {
            await admin.from('bot_health_daily').update({
                replies: (health.replies || 0) + 1,
                reply_latency_ms: (health.reply_latency_ms || 0) + latency,
                safety_flags: (health.safety_flags || 0) + (unsafeUser || unsafeBot ? 1 : 0),
            }).eq('bot_id', bot_id).eq('day', day)
        } else {
            await admin.from('bot_health_daily').insert({
                bot_id,
                day,
                replies: 1,
                reply_latency_ms: latency,
                safety_flags: unsafeUser || unsafeBot ? 1 : 0,
            })
        }

        const usage = json?.usage || {}
        if (usage?.total_tokens) {
            await admin.from('ai_usage').insert({
                user_id: authUser.id,
                bot_id,
                model,
                tokens_in: usage.prompt_tokens || 0,
                tokens_out: usage.completion_tokens || 0,
                cost_usd: 0,
            })
        }

        return NextResponse.json({ reply: botReply }, { headers: rateLimitHeaders(6, rate) })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
