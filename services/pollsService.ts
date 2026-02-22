import { createClient } from '@/lib/supabase/client'

export type PollRow = {
    id: string
    message_id: string
    question: string
    options: string[]
    multiple: boolean
    expires_at: string | null
}

export type PollVote = {
    id: string
    poll_id: string
    user_id: string
    option_index: number
}

export type PollWithVotes = PollRow & { votes: PollVote[] }

export const createPoll = async (matchId: string, senderId: string, question: string, options: string[]) => {
    const supabase = createClient()
    const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
            match_id: matchId,
            sender_id: senderId,
            content: question,
            type: 'poll',
        })
        .select('id')
        .single()
    if (msgError) throw msgError

    const { data, error } = await supabase
        .from('message_polls')
        .insert({
            message_id: message.id,
            question,
            options,
        })
        .select('*')
        .single()
    if (error) throw error
    return data as PollRow
}

export const fetchPollsByMessageIds = async (messageIds: string[]) => {
    if (messageIds.length === 0) return []
    const supabase = createClient()
    const { data: polls, error } = await supabase
        .from('message_polls')
        .select('*')
        .in('message_id', messageIds)
    if (error) throw error
    const pollIds = (polls || []).map((p) => p.id)
    let votes: PollVote[] = []
    if (pollIds.length > 0) {
        const { data: votesData } = await supabase
            .from('message_poll_votes')
            .select('*')
            .in('poll_id', pollIds)
        votes = (votesData || []) as PollVote[]
    }
    return (polls || []).map((p) => ({
        ...(p as PollRow),
        votes: votes.filter((v) => v.poll_id === (p as PollRow).id),
    })) as PollWithVotes[]
}

export const votePoll = async (pollId: string, optionIndex: number) => {
    const supabase = createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) throw new Error('Unauthorized')
    const { data, error } = await supabase
        .from('message_poll_votes')
        .insert({
            poll_id: pollId,
            option_index: optionIndex,
            user_id: auth.user.id,
        })
        .select('*')
        .single()
    if (error) throw error
    return data as PollVote
}
