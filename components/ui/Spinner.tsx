import { clsx } from 'clsx'
import React from 'react'

type SpinnerProps = {
    className?: string
    label?: string
    showGlow?: boolean
}

export default function Spinner({ className, label = 'Yukleniyor', showGlow = false }: SpinnerProps) {
    const finalClassName = className?.replace(/\banimate-spin\b/g, '')

    return (
        <div
            className={clsx('relative inline-flex items-center justify-center shrink-0', finalClassName)}
            role="status"
            aria-label={label}
        >
            {/* Glow Sphere - optional based on prop */}
            {showGlow && (
                <div
                    className="absolute w-[200%] h-[200%] rounded-full z-0"
                    style={{
                        background: 'radial-gradient(circle, rgba(217,28,92,0.15) 0%, rgba(18,18,20,0) 70%)',
                        animation: 'pulse-glow 3s ease-in-out infinite alternate',
                    }}
                />
            )}

            {/* Rotating gradient ring — mask uses calc so ring is always ~3px thick regardless of container size */}
            <div
                className="absolute inset-0 z-10 rounded-full"
                style={{
                    background: 'conic-gradient(from 0deg, transparent 60%, #D4AF37 90%, #D91C5C 100%)',
                    WebkitMask: 'radial-gradient(transparent calc(50% - 3px), #000 calc(50% - 1px))',
                    mask: 'radial-gradient(transparent calc(50% - 3px), #000 calc(50% - 1px))',
                    animation: 'spin 1.5s linear infinite',
                }}
            />

            {/* Inner Heart Logo Beating */}
            <div
                className="absolute z-20 w-[40%] h-[40%] flex items-center justify-center"
                style={{
                    animation: 'heartbeat 2s infinite cubic-bezier(0.215, 0.610, 0.355, 1.000)'
                }}
            >
                <div
                    className="relative w-[60%] h-[60%] -rotate-45"
                    style={{
                        background: 'linear-gradient(135deg, #D91C5C, #75225E)',
                        boxShadow: '0 4px 20px rgba(217, 28, 92, 0.4)',
                        borderRadius: '10% 10% 10% 25%',
                    }}
                >
                    <div
                        className="absolute w-full h-full -top-[50%] left-0 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #D91C5C, #75225E)' }}
                    />
                    <div
                        className="absolute w-full h-full top-0 left-[50%] rounded-full"
                        style={{ background: 'linear-gradient(135deg, #75225E, #D91C5C)' }}
                    />
                </div>
            </div>

            <span className="sr-only">{label}</span>
        </div>
    )
}
