import React from 'react'
import LoadingSplash from './LoadingSplash'

type AnimatedLoaderProps = {
    label?: string
    size?: number // preserved for compatibility, but LoadingSplash is usually fixed
    fullScreen?: boolean
}

/**
 * AnimatedLoader is now a wrapper for the premium LoadingSplash design.
 * This ensures visual consistency across the entire app.
 */
export default function AnimatedLoader({ label = 'Yükleniyor...', fullScreen = false }: AnimatedLoaderProps) {
    return <LoadingSplash fullScreen={fullScreen} text={label} />
}
