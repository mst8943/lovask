export default function OfflinePage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
            <div className="max-w-md w-full glass-panel p-6 rounded-2xl text-center space-y-3">
                <h1 className="text-2xl font-bold">Çevrim dışısın</h1>
                <p className="text-sm text-gray-400">
                    Bazı özellikler için internet bağlantısı gerekir. Lütfen tekrar bağlan ve yeniden dene.
                </p>
            </div>
        </div>
    )
}

