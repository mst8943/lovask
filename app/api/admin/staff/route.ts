import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Ensure caller is an admin
const ensureAdmin = async () => {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null

    const admin = createAdminClient()
    const { data: userData } = await admin.from('users').select('role').eq('id', user.id).maybeSingle()
    if (userData?.role !== 'admin') return null
    return { admin, userId: user.id }
}

export async function GET() {
    const session = await ensureAdmin()
    if (!session) return new NextResponse('Unauthorized', { status: 401 })
    const { admin } = session

    const { data, error } = await admin
        .from('users')
        .select('id, email, role, created_at, last_active_at')
        .eq('role', 'admin')
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ admins: data })
}

export async function POST(req: Request) {
    const session = await ensureAdmin()
    if (!session) return new NextResponse('Unauthorized', { status: 401 })
    const { admin } = session

    try {
        const body = await req.json()
        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json({ error: 'Email ve şifre zorunludur' }, { status: 400 })
        }

        // Kendi oturumunu kırmak için kendi email'ini girmeyi engelle
        const { data: { user } } = await admin.auth.getUser()
        if (user && user.email === email) {
            return NextResponse.json({ error: 'Mevcut kendi hesabınızı ekleyerek şifrenizi yenileyemezsiniz, aksi halde oturumunuz kapanır! Bunu Hesap Ayarları sayfasından yapmalısınız.' }, { status: 400 })
        }

        let authId = null;

        // "listUsers" sadece 50 kişi döndürüyor. Sistemde 104+ kişi var.
        // O yüzden kullanıcıyı e-posta ile önceden public.users tablosundan arıyoruz.
        const { data: existingPublicUser } = await admin.from('users').select('id').eq('email', email).maybeSingle();

        if (existingPublicUser) {
            authId = existingPublicUser.id;
            // Var Olan Kişinin Şifresini ŞİMDİ ZORLA Değiştir! 
            // ("Yanlış şifre" hatasını çözer)
            const { error: updErr } = await admin.auth.admin.updateUserById(authId, { password, email_confirm: true })
            if (updErr) throw new Error('Mevcut kullanıcının şifresi güncellenemedi: ' + updErr.message)
        } else {
            // Hiç yoksa Sıfırdan Yarat
            const { data: authData, error: createError } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            })

            if (createError) {
                // Supabase API yine de "already registered" derse, public tablosunda olmayıp auth'ta kalmış olabilir.
                // Bu durumu yakalayıp uyaralım
                throw new Error('Kullanıcı eklenemedi: ' + createError.message);
            }
            if (!authData?.user) throw new Error('Hesap yaratıldı ancak API nesne döndürmedi.')
            authId = authData.user.id;
        }

        // Trigger'lara ufak bir tolerans (veritabanı satır eklemeye fırsat bulsun)
        await new Promise(r => setTimeout(r, 600))

        // Public Users Tablosunda Mutfak Yetkisini Ver: 'admin'
        const { error: upsertErr } = await admin.from('users').upsert({ id: authId, email, role: 'admin' })
        if (upsertErr) throw new Error('Kullanıcı veritabanında Admin yapılamadı: ' + upsertErr.message)

        return NextResponse.json({ success: true, userId: authId })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const session = await ensureAdmin()
    if (!session) return new NextResponse('Unauthorized', { status: 401 })
    const { admin, userId } = session

    try {
        const url = new URL(req.url)
        const id = url.searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID eksik' }, { status: 400 })

        if (userId === id) {
            return NextResponse.json({ error: 'Kendinizi silemezsiniz!' }, { status: 400 })
        }

        // 1. TAMAMEN SİL (AUTH) - This cascades to public.users if DB is configured correctly.
        const { error: e1 } = await admin.auth.admin.deleteUser(id)
        if (e1) {
            return NextResponse.json({ error: `Kullanıcı tamamen silinemedi (Büyük ihtimalle geçmiş maç/mesaj vb. veritabanı kayıtları engelliyor): ${e1.message}` }, { status: 400 })
        }

        // Just in case public.users didn't cascade
        await admin.from('users').delete().eq('id', id)

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error("ADMIN STAFF DELETE FATAL ERROR:", err);
        return NextResponse.json({ error: err.message, stack: err.stack, details: JSON.stringify(err) }, { status: 500 })
    }
}
