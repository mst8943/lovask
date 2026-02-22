'use client'
import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchMyBlocks, unblockUser, BlockRow } from '@/services/blocksService'
import { Ban } from 'lucide-react'
import Image from 'next/image'
import { getProfileAvatar } from '@/utils/avatar'
import { Button } from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
export default function BlocksPage() {
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [blocks, setBlocks] = useState<BlockRow[]>([])
    const loadData = useCallback(async (userId: string) => {
        setLoading(true)
        const rows = await fetchMyBlocks(userId)
        setBlocks(rows)
        setLoading(false)
    }, [])
    useEffect(() => {
        if (!user) return
        const id = setTimeout(() => {
            void loadData(user.id)
        }, 0)
        return () => clearTimeout(id)
    }, [loadData, user])
    const handleUnblock = async (id: string) => {
        await unblockUser(id)
        if (user) {
            await loadData(user.id)
        }
    }
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    return (
        <div className="space-y-6 pb-8">
            {blocks.length === 0 ? (
                <div className="glass-panel p-6 rounded-2xl text-sm text-gray-400">
                    Engellediğin kullanıcı yok.
                </div>
            ) : (
                <div className="space-y-3">
                    {blocks.map((block) => {
                        const profile = block.blocked_profile
                        const photoUrl = getProfileAvatar(profile)
                        return (
                            <div key={block.id} className="glass-panel p-4 rounded-2xl flex items-center gap-4">
                                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10">
                                    <Image src={photoUrl} alt={profile?.display_name || 'User'} fill className="object-cover" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold">{profile?.display_name || 'Kullanıcı'}</div>
                                    <div className="text-xs text-gray-400">
                                        {block.reason ? `Neden: ${block.reason}` : 'Neden belirtilmedi'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(block.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleUnblock(block.id)}
                                    variant="secondary"
                                    size="sm"
                                    className="text-xs flex items-center gap-2"
                                >
                                    <Ban size={14} />
                                    Engeli kaldır
                                </Button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}