type CallProvider = 'twilio' | 'agora' | 'none'

type CallProviderConfig = {
    provider: CallProvider
    twilio?: {
        accountSid?: string
        apiKeySid?: string
        apiKeySecret?: string
        serviceSid?: string
    }
    agora?: {
        appId?: string
        appCertificate?: string
    }
}

export function getCallProviderConfig(): CallProviderConfig {
    const provider = (process.env.CALL_PROVIDER as CallProvider) || 'none'
    return {
        provider,
        twilio: {
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            apiKeySid: process.env.TWILIO_API_KEY_SID,
            apiKeySecret: process.env.TWILIO_API_KEY_SECRET,
            serviceSid: process.env.TWILIO_SERVICE_SID,
        },
        agora: {
            appId: process.env.AGORA_APP_ID,
            appCertificate: process.env.AGORA_APP_CERTIFICATE,
        },
    }
}

export function ensureCallProviderReady(config: CallProviderConfig) {
    if (config.provider === 'twilio') {
        const ok = !!(config.twilio?.accountSid && config.twilio?.apiKeySid && config.twilio?.apiKeySecret)
        return ok
            ? { ok: true as const }
            : { ok: false as const, message: 'Twilio config missing. Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET.' }
    }
    if (config.provider === 'agora') {
        const ok = !!(config.agora?.appId && config.agora?.appCertificate)
        return ok
            ? { ok: true as const }
            : { ok: false as const, message: 'Agora config missing. Set AGORA_APP_ID, AGORA_APP_CERTIFICATE.' }
    }
    return { ok: false as const, message: 'CALL_PROVIDER is not configured.' }
}
