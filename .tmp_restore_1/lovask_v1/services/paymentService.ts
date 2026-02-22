export const createPaymentRequest = async (payload: {
    provider: string
    kind: 'coins' | 'premium'
    amount: number
    metadata?: Record<string, unknown>
}) => {
    const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Payment request failed')
    }
    return res.json()
}

