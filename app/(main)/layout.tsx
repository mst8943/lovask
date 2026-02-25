import BottomNav from '@/components/layout/BottomNav'
import UserHeader from '@/components/layout/UserHeader'
import AuthGate from '@/components/layout/AuthGate'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import PresenceHeartbeat from '@/components/presence/PresenceHeartbeat'
import PushOnboardingPrompt from '@/components/pwa/PushOnboardingPrompt'

export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGate>
            <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden">
                <UserHeader />
                <div className="h-16" />

                {/* Main Content Area */}
                <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 pb-20 md:pb-4 md:max-w-4xl">
                    {children}
                </main>

                <BottomNav />
                <InstallPrompt />
                <PushOnboardingPrompt />
                <PresenceHeartbeat />
            </div>
        </AuthGate>
    )
}
