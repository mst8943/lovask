'use client'

import React, { useEffect, useState } from 'react'
import Lottie from 'lottie-react'
import Image from 'next/image'

interface StickerPlayerProps {
    url: string
    size?: number
    className?: string
    onLoadingComplete?: () => void
}

export default function StickerPlayer({ url, size = 80, className = '', onLoadingComplete }: StickerPlayerProps) {
    const [animationData, setAnimationData] = useState<any>(null)
    const [error, setError] = useState(false)
    const isJson = url.toLowerCase().endsWith('.json')

    useEffect(() => {
        if (isJson) {
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    setAnimationData(data)
                    onLoadingComplete?.()
                })
                .catch(() => setError(true))
        }
    }, [url, isJson])

    if (error) {
        return <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-[10px] text-gray-500">!</div>
    }

    if (isJson) {
        if (!animationData) return <div className="animate-pulse bg-white/5 rounded-lg" style={{ width: size, height: size }} />
        return (
            <div style={{ width: size, height: size }} className={className}>
                <Lottie animationData={animationData} loop={true} />
            </div>
        )
    }

    return (
        <div style={{ width: size, height: size }} className={`relative ${className}`}>
            <Image
                src={url}
                alt="sticker"
                fill
                className="object-contain"
                onLoadingComplete={onLoadingComplete}
            />
        </div>
    )
}
