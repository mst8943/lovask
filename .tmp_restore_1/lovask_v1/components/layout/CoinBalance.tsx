'use client'

import React, { useState } from 'react'
import { useEconomy } from '@/hooks/useEconomy'
import { Coins, Plus, Gem } from 'lucide-react'
import PremiumModal from '@/components/ui/PremiumModal'
import { Button } from '@/components/ui/Button'

export default function CoinBalance() {
    const { balance, isPremium, hasFeature, refetch } = useEconomy()
    const [showPremium, setShowPremium] = useState(false)

    const handleClose = () => {
        setShowPremium(false)
        refetch()
    }

    return (
        <>
            <Button
                onClick={() => setShowPremium(true)}
                variant="secondary"
                size="sm"
                className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs text-yellow-500 font-bold flex items-center gap-1 hover:bg-yellow-500/20 transition-colors"
            >
                <Coins size={14} className="text-yellow-400" />
                <span className="font-mono">{balance}</span>
                {isPremium && hasFeature('premium_badge') && (
                    <span className="ml-1 flex items-center gap-0.5 text-[10px] bg-gradient-to-r from-pink-500 to-violet-500 text-transparent bg-clip-text">
                        <Gem size={10} className="text-pink-500" />
                    </span>
                )}
                <Plus size={12} className="opacity-50 ml-1" />
            </Button>

            {showPremium && <PremiumModal onClose={handleClose} />}
        </>
    )
}
