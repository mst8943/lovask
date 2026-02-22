import { createClient } from '@/lib/supabase/client'

export type CallSession = {
    id: string
    match_id: string
    created_by: string
    call_type: 'voice' | 'video'
    status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined' | 'canceled'
    created_at: string
    started_at?: string | null
    ended_at?: string | null
}

export const startCall = async (matchId: string, callType: 'voice' | 'video') => {
    const res = await fetch('/api/calls/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, callType }),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Call start failed')
    }
    return res.json() as Promise<{ call: CallSession }>
}

export const respondCall = async (callId: string, action: 'accept' | 'decline' | 'end') => {
    const res = await fetch('/api/calls/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, action }),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Call response failed')
    }
    return res.json() as Promise<{ call: CallSession }>
}

export const sendCallSignal = async (callId: string, toUserId: string, signalType: 'offer' | 'answer' | 'candidate' | 'bye', payload: Record<string, unknown>) => {
    const res = await fetch('/api/calls/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, toUserId, signalType, payload }),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Signal failed')
    }
    return res.json() as Promise<{ ok: true }>
}

export const fetchLatestCallForMatch = async (matchId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (error) throw error
    return data as CallSession | null
}
