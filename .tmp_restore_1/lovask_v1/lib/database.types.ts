export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string | null
                    role: 'user' | 'admin' | 'bot'
                    coin_balance: number
                    is_premium: boolean
                    premium_expires_at: string | null
                    referral_code?: string | null
                    referred_by?: string | null
                    last_login_at?: string | null
                    last_active_at?: string | null
                    is_banned?: boolean | null
                    ban_reason?: string | null
                    ban_expires_at?: string | null
                    is_hidden?: boolean | null
                    created_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    role?: 'user' | 'admin' | 'bot'
                    coin_balance?: number
                    is_premium?: boolean
                    premium_expires_at?: string | null
                    referral_code?: string | null
                    referred_by?: string | null
                    last_login_at?: string | null
                    last_active_at?: string | null
                    is_banned?: boolean | null
                    ban_reason?: string | null
                    ban_expires_at?: string | null
                    is_hidden?: boolean | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    role?: 'user' | 'admin' | 'bot'
                    coin_balance?: number
                    is_premium?: boolean
                    premium_expires_at?: string | null
                    referral_code?: string | null
                    referred_by?: string | null
                    last_login_at?: string | null
                    last_active_at?: string | null
                    is_banned?: boolean | null
                    ban_reason?: string | null
                    ban_expires_at?: string | null
                    is_hidden?: boolean | null
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    display_name: string | null
                    age: number | null
                    gender: string | null
                    bio: string | null
                    city: string | null
                    photos: Json
                    interests: string[] | null
                    looking_for_genders?: string[] | null
                    relationship_type?: string | null
                    education?: string | null
                    smoking?: string | null
                    alcohol?: string | null
                    kids_status?: string | null
                    height_cm?: number | null
                    religion?: string | null
                    lifestyle?: string | null
                    is_verified?: boolean | null
                    is_bot?: boolean | null
                    location_lat?: number | null
                    location_lng?: number | null
                    distance_km_pref?: number | null
                    gender_pref?: string[] | null
                    age_min_pref?: number | null
                    age_max_pref?: number | null
                    hide_from_discovery?: boolean | null
                    location_visibility?: 'public' | 'approx' | 'hidden' | null
                    location_updated_at?: string | null
                    intent?: string | null
                    relationship_goal?: string | null
                    work_title?: string | null
                    education_level?: string | null
                    languages?: string[] | null
                    dealbreakers?: string[] | null
                    values?: string[] | null
                    family_plans?: string | null
                    pets?: string | null
                    fitness?: string | null
                    updated_at: string
                }
                Insert: {
                    id: string
                    display_name?: string | null
                    age?: number | null
                    gender?: string | null
                    bio?: string | null
                    city?: string | null
                    photos?: Json
                    interests?: string[] | null
                    looking_for_genders?: string[] | null
                    relationship_type?: string | null
                    education?: string | null
                    smoking?: string | null
                    alcohol?: string | null
                    kids_status?: string | null
                    height_cm?: number | null
                    religion?: string | null
                    lifestyle?: string | null
                    is_verified?: boolean | null
                    is_bot?: boolean | null
                    location_lat?: number | null
                    location_lng?: number | null
                    distance_km_pref?: number | null
                    gender_pref?: string[] | null
                    age_min_pref?: number | null
                    age_max_pref?: number | null
                    hide_from_discovery?: boolean | null
                    location_visibility?: 'public' | 'approx' | 'hidden' | null
                    location_updated_at?: string | null
                    intent?: string | null
                    relationship_goal?: string | null
                    work_title?: string | null
                    education_level?: string | null
                    languages?: string[] | null
                    dealbreakers?: string[] | null
                    values?: string[] | null
                    family_plans?: string | null
                    pets?: string | null
                    fitness?: string | null
                    updated_at?: string
                }
                Update: {
                    id?: string
                    display_name?: string | null
                    age?: number | null
                    gender?: string | null
                    bio?: string | null
                    city?: string | null
                    photos?: Json
                    interests?: string[] | null
                    looking_for_genders?: string[] | null
                    relationship_type?: string | null
                    education?: string | null
                    smoking?: string | null
                    alcohol?: string | null
                    kids_status?: string | null
                    height_cm?: number | null
                    religion?: string | null
                    lifestyle?: string | null
                    is_verified?: boolean | null
                    is_bot?: boolean | null
                    location_lat?: number | null
                    location_lng?: number | null
                    distance_km_pref?: number | null
                    gender_pref?: string[] | null
                    age_min_pref?: number | null
                    age_max_pref?: number | null
                    hide_from_discovery?: boolean | null
                    location_visibility?: 'public' | 'approx' | 'hidden' | null
                    location_updated_at?: string | null
                    intent?: string | null
                    relationship_goal?: string | null
                    work_title?: string | null
                    education_level?: string | null
                    languages?: string[] | null
                    dealbreakers?: string[] | null
                    values?: string[] | null
                    family_plans?: string | null
                    pets?: string | null
                    fitness?: string | null
                    updated_at?: string
                }
            }
            matches: {
                Row: {
                    id: string
                    user_a: string
                    user_b: string
                    created_at: string
                    is_active: boolean
                }
                Insert: {
                    id?: string
                    user_a: string
                    user_b: string
                    created_at?: string
                    is_active?: boolean
                }
                Update: {
                    id?: string
                    user_a?: string
                    user_b?: string
                    created_at?: string
                    is_active?: boolean
                }
            }
            messages: {
                Row: {
                    id: string
                    match_id: string
                    sender_id: string
                    content: string | null
                    media_url: string | null
                    media_view_once?: boolean | null
                    media_expires_at?: string | null
                    media_viewed_at?: string | null
                    type: 'text' | 'image' | 'audio' | 'sticker' | 'poll' | 'call'
                    media_duration_s?: number | null
                    audio_waveform?: Json | null
                    sticker_id?: string | null
                    read_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    match_id: string
                    sender_id: string
                    content?: string | null
                    media_url?: string | null
                    media_view_once?: boolean | null
                    media_expires_at?: string | null
                    media_viewed_at?: string | null
                    type?: 'text' | 'image' | 'audio' | 'sticker' | 'poll' | 'call'
                    media_duration_s?: number | null
                    audio_waveform?: Json | null
                    sticker_id?: string | null
                    read_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    match_id?: string
                    sender_id?: string
                    content?: string | null
                    media_url?: string | null
                    media_view_once?: boolean | null
                    media_expires_at?: string | null
                    media_viewed_at?: string | null
                    type?: 'text' | 'image' | 'audio' | 'sticker' | 'poll' | 'call'
                    media_duration_s?: number | null
                    audio_waveform?: Json | null
                    sticker_id?: string | null
                    read_at?: string | null
                    created_at?: string
                }
            }
            likes: {
                Row: {
                    id: string
                    from_user: string
                    to_user: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    from_user: string
                    to_user: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    from_user?: string
                    to_user?: string
                    created_at?: string
                }
            }
            transactions: {
                Row: {
                    id: string
                    user_id: string
                    amount: number
                    type: 'bonus' | 'purchase' | 'spend' | 'gift'
                    metadata: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    amount: number
                    type: 'bonus' | 'purchase' | 'spend' | 'gift'
                    metadata?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    amount?: number
                    type?: 'bonus' | 'purchase' | 'spend' | 'gift'
                    metadata?: Json
                    created_at?: string
                }
            }
            stories: {
                Row: {
                    id: string
                    user_id: string
                    media_url: string
                    expires_at: string
                    views_count: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    media_url: string
                    expires_at?: string
                    views_count?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    media_url?: string
                    expires_at?: string
                    views_count?: number
                    created_at?: string
                }
            }
            bot_configs: {
                Row: {
                    user_id: string
                    personality_prompt: string | null
                    behavior_settings: Json
                }
                Insert: {
                    user_id: string
                    personality_prompt?: string | null
                    behavior_settings?: Json
                }
                Update: {
                    user_id?: string
                    personality_prompt?: string | null
                    behavior_settings?: Json
                }
            }
            reports: {
                Row: {
                    id: string
                    reporter_id: string | null
                    reported_id: string
                    reason: string | null
                    status: 'pending' | 'resolved' | 'dismissed'
                    created_at: string
                }
                Insert: {
                    id?: string
                    reporter_id?: string | null
                    reported_id: string
                    reason?: string | null
                    status?: 'pending' | 'resolved' | 'dismissed'
                    created_at?: string
                }
                Update: {
                    id?: string
                    reporter_id?: string | null
                    reported_id?: string
                    reason?: string | null
                    status?: 'pending' | 'resolved' | 'dismissed'
                    created_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

