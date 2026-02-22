'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import Spinner from '@/components/ui/Spinner'
export default function AdminGate({ children }: { children: React.ReactNode }) {
    const { session, isLoading } = useAuthStore()
    const [checking, setChecking] = useState(true)
    const router = useRouter()
    const supabase = createClient()
    useEffect(() => {
        const checkAdmin = async () => {
            if (isLoading) return
            if (!session) {
                router.replace('/admin/login')
                return
            }
            const { data, error } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .maybeSingle()
            if (error || data?.role !== 'admin') {
                router.replace('/admin/login?reason=forbidden')
                return
            }
            setChecking(false)
        }
        checkAdmin()
    }, [isLoading, session, router, supabase])
    if (isLoading || checking) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-[9999]">
                <Spinner className="w-10 h-10 text-pink-500 animate-spin" />
            </div>
        )
    }
    return children
}
