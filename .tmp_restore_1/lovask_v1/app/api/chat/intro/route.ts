import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitHeaders } from '@/lib/rateLimit'

type IntroPayload = {
    matchId?: string
}

type ProfileLite = {
    display_name?: string | null
    bio?: string | null
    interests?: string[] | null
    city?: string | null
    age?: number | null
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

const fallbackSuggestions = (profile: ProfileLite) => {
    const name = profile.display_name || 'selam'
    const city = profile.city
    const interest = profile.interests?.find(Boolean) || null
    const bio = (profile.bio || '').trim()

    const base = [
        `Selam ${name}! Bugün nasılsın?`,
        `Merhaba! Profilin çok hoşuma gitti, seni tanımak isterim.`,
        `Günün nasıl geçiyor?`,
    ]

    const byInterest = interest
        ? [
            `Merhaba! ${interest} sevdiğini gördüm, en çok neyi önerirsin?`,
            `${interest} ilgimi çekti. Sende nasıl başladı?`,
        ]
        : []

    const byCity = city
        ? [
            `${city} nasıl, orada en sevdiğin yer neresi?`,
            `${city}’de en iyi kahve nerede içilir?`,
        ]
        : []

    const byBio = bio.length > 0
        ? [
            `Bio’da “${bio.slice(0, 40)}${bio.length > 40 ? '…' : ''}” yazmışsın, bunu biraz açar mısın?`,
            `Bio’ndaki detay dikkatimi çekti, bunun hikâyesi var mı?`,
        ]
        : []

    const suggestions: string[] = []
    suggestions.push(pick(base))
    if (byInterest.length) suggestions.push(pick(byInterest))
    if (byCity.length) suggestions.push(pick(byCity))
    if (byBio.length && suggestions.length < 3) suggestions.push(pick(byBio))

    while (suggestions.length < 3) {
        suggestions.push(pick(base))
    }

    return Array.from(new Set(suggestions)).slice(0, 3)
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) return new NextResponse('Unauthorized', { status: 401 })

        const rate = rateLimit(`intro:${auth.user.id}`, 6, 60_000)
        if (!rate.ok) {
            return new NextResponse('Too many requests', { status: 429, headers: rateLimitHeaders(6, rate) })
        }

        const body = (await req.json().catch(() => ({}))) as IntroPayload
        const matchId = body.matchId
        if (!matchId) return new NextResponse('Missing matchId', { status: 400 })

        const { data: match } = await supabase
            .from('matches')
            .select('id,user_a,user_b')
            .eq('id', matchId)
            .maybeSingle()
        if (!match) return new NextResponse('Match not found', { status: 404 })

        const isParticipant = match.user_a === auth.user.id || match.user_b === auth.user.id
        if (!isParticipant) return new NextResponse('Forbidden', { status: 403 })

        const otherUserId = match.user_a === auth.user.id ? match.user_b : match.user_a
        const { data: profile } = await supabase
            .from('profiles')
            .select('display_name,bio,interests,city,age')
            .eq('id', otherUserId)
            .maybeSingle()

        const profileLite = (profile || {}) as ProfileLite

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json({ suggestions: fallbackSuggestions(profileLite) }, { headers: rateLimitHeaders(6, rate) })
        }

        const prompt = [
            'Generate 3 short, friendly first-message suggestions for a dating chat.',
            'Constraints: 1 sentence each, casual tone, no emojis, no overly long questions.',
            'Keep it natural and specific if profile info exists. Avoid copying bio verbatim.',
            'Language: Turkish.',
            `Profile: name=${profileLite.display_name || ''}, age=${profileLite.age || ''}, city=${profileLite.city || ''}, interests=${(profileLite.interests || []).join(', ')}, bio=${profileLite.bio || ''}.`
        ].join('\n')

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost',
                'X-Title': 'Lovask',
            },
            body: JSON.stringify({
                model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
                messages: [
                    { role: 'system', content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 120,
            }),
        })

        if (!response.ok) {
            return NextResponse.json({ suggestions: fallbackSuggestions(profileLite) }, { headers: rateLimitHeaders(6, rate) })
        }

        const json = await response.json()
        const raw = json?.choices?.[0]?.message?.content || ''
        const lines = String(raw)
            .split('\n')
            .map((l) => l.replace(/^[-*\\d.\\s]+/, '').trim())
            .filter(Boolean)

        const unique = Array.from(new Set(lines))
        const suggestions = (unique.length >= 3 ? unique.slice(0, 3) : fallbackSuggestions(profileLite))
        return NextResponse.json({ suggestions }, { headers: rateLimitHeaders(6, rate) })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error'
        return new NextResponse(message, { status: 500 })
    }
}
