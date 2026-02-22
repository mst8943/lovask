import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
    const response = NextResponse.next()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const path = request.nextUrl.pathname
    if (!path.startsWith('/admin')) return response
    if (path === '/admin/login') return response

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/login'
        url.searchParams.set('redirect', path)
        return NextResponse.redirect(url)
    }

    const { data: userRow } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    if (userRow?.role !== 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/login'
        url.searchParams.set('reason', 'forbidden')
        return NextResponse.redirect(url)
    }

    return response
}

export const config = {
    matcher: ['/admin/:path*'],
}
