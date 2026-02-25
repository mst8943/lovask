export const fetchBots = async () => {
    const res = await fetch('/api/admin/bots/list', { method: 'POST' })
    if (!res.ok) throw new Error(await res.text())
    const payload = await res.json()
    return payload.rows || []
}

export const fetchBotGroups = async () => {
    const res = await fetch('/api/admin/bot-groups/list', { method: 'POST' })
    if (!res.ok) throw new Error(await res.text())
    const payload = await res.json()
    return payload.rows || []
}

export const createBotGroup = async (name: string, prompt: string) => {
    const res = await fetch('/api/admin/bot-groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, prompt }),
    })
    if (!res.ok) throw new Error(await res.text())
    const payload = await res.json()
    return payload.row
}
