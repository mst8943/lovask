import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type AdminPermission = string

export const useAdminPermissions = (userId?: string | null) => {
    const supabase = useMemo(() => createClient(), [])
    const [permissions, setPermissions] = useState<AdminPermission[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            if (!userId) {
                setPermissions([])
                setLoading(false)
                return
            }
            const { data: userRow } = await supabase.from('users').select('role').eq('id', userId).maybeSingle()
            const role = (userRow as { role?: string } | null)?.role || 'user'
            if (role === 'admin') {
                setPermissions(['*'])
                setLoading(false)
                return
            }
            const { data: userRole } = await supabase.from('admin_user_roles').select('role').eq('user_id', userId).maybeSingle()
            const effectiveRole = (userRole as { role?: string } | null)?.role || role
            const { data: perms } = await supabase
                .from('admin_role_permissions')
                .select('permission_key')
                .eq('role', effectiveRole)
            setPermissions((perms || []).map((p: { permission_key: string }) => p.permission_key))
            setLoading(false)
        }
        void load()
    }, [supabase, userId])

    const has = (key?: string) => {
        if (!key) return true
        if (permissions.includes('*')) return true
        return permissions.includes(key)
    }

    return { permissions, loading, has }
}
