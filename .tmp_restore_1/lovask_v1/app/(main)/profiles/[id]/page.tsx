import { createClient } from '@/lib/supabase/server'
import ProfileDetailClient from './ProfileDetailClient'
import type { Metadata } from 'next'

type Params = { id: string }

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('profiles')
        .select('display_name, age, city, bio, photos')
        .eq('id', params.id)
        .maybeSingle()

    if (!data) {
        return {
            title: 'Profil bulunamadı | Lovask',
        }
    }

    const title = `${data.display_name || 'Profil'}${data.age ? `, ${data.age}` : ''} | Lovask`
    const description = data.bio || `${data.city || 'bulunduğun bölgede'} ${data.display_name || 'bu kişi'} ile tanış.`

    let image: string | undefined
    if (data.photos) {
        try {
            const photos = Array.isArray(data.photos) ? data.photos : JSON.parse(data.photos)
            if (photos?.[0]) image = photos[0]
        } catch {
            image = undefined
        }
    }

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: image ? [{ url: image }] : undefined,
        },
    }
}

export default function ProfilePage() {
    return <ProfileDetailClient />
}
