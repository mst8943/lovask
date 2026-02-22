export const NOTIFICATIONS_UNREAD_EVENT = 'notifications:unread-changed'

export const emitUnreadCount = (userId: string, unread: number) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
        new CustomEvent(NOTIFICATIONS_UNREAD_EVENT, {
            detail: { userId, unread },
        })
    )
}

