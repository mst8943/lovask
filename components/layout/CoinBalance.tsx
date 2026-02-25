'use client'

import React, { useState } from 'react'
import { useEconomy } from '@/hooks/useEconomy'
import { Gem, Coins } from 'lucide-react'
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
                variant="ghost"
                size="sm"
                className="px-3 py-1.5 h-auto text-[13px] font-bold flex items-center gap-1.5 transition-all outline-none bg-[#1c1105] hover:bg-[#2a1a08] border-[0.5px] border-[#b3790f66] text-[#ffd08a] rounded-full shadow-[0_2px_10px_rgba(179,121,15,0.2)]"
            >
                <div className="flex items-center justify-center w-[18px] h-[18px] bg-gradient-to-br from-[#ffe2a3] to-[#f6c36c] rounded-full text-[#7a4c00]">
                    <Coins size={11} strokeWidth={2} className="text-[#7a4c00]" />
                </div>
                <span className="font-sans leading-none mt-[1px]">{balance?.toLocaleString() || '0'}</span>
                {isPremium && hasFeature('premium_badge') && (
                    <span className="ml-1 flex items-center gap-0.5 text-[10px] bg-gradient-to-r from-pink-500 to-violet-500 text-transparent bg-clip-text">
                        <Gem size={10} className="text-pink-500" />
                    </span>
                )}
            </Button>

            {showPremium && <PremiumModal onClose={handleClose} />}
        </>
    )
}
