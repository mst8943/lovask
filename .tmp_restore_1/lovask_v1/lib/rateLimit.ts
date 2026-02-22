type RateLimitEntry = {
    count: number
    resetAt: number
}

type RateLimitResult = {
    ok: boolean
    remaining: number
    resetAt: number
    retryAfter: number
}

const store = new Map<string, RateLimitEntry>()

export const rateLimit = (key: string, limit: number, windowMs: number): RateLimitResult => {
    const now = Date.now()
    const current = store.get(key)

    if (!current || now >= current.resetAt) {
        const resetAt = now + windowMs
        store.set(key, { count: 1, resetAt })
        return {
            ok: true,
            remaining: Math.max(0, limit - 1),
            resetAt,
            retryAfter: 0,
        }
    }

    const nextCount = current.count + 1
    current.count = nextCount
    store.set(key, current)

    if (nextCount > limit) {
        const retryAfter = Math.max(0, Math.ceil((current.resetAt - now) / 1000))
        return {
            ok: false,
            remaining: 0,
            resetAt: current.resetAt,
            retryAfter,
        }
    }

    return {
        ok: true,
        remaining: Math.max(0, limit - nextCount),
        resetAt: current.resetAt,
        retryAfter: 0,
    }
}

export const rateLimitHeaders = (limit: number, result: RateLimitResult) => {
    return {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        ...(result.retryAfter > 0 ? { 'Retry-After': String(result.retryAfter) } : {}),
    }
}
