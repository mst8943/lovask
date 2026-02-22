import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export const fetchBots = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('id,email,role,coin_balance,is_premium,created_at,last_active_at, profiles:profiles(display_name,age,gender,city,photos), bot_configs:bot_configs(personality_prompt,behavior_settings,tone,language_mode,auto_like_rate,engagement_intensity,cooldown_hours,active_hours,response_delay_min_s,response_delay_max_s,auto_story,profile_rotation_minutes,use_global)')
        .eq('role', 'bot')
        .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
}

export const fetchBotGroups = async () => {
    const { data, error } = await supabase
        .from('bot_groups')
        .select('*')
        .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
}

export const createBotGroup = async (name: string, prompt: string) => {
    const { data, error } = await supabase
        .from('bot_groups')
        .insert({ name, prompt })
        .select()
        .single()
    if (error) throw error
    return data
}
