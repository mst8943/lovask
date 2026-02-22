# Call Provider Setup (Twilio / Agora)

## Environment Variables

Set `CALL_PROVIDER` to either `twilio` or `agora`.

### Twilio
- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_SERVICE_SID` (optional, if using Conversations)

### Agora
- `AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE`

## API Endpoints
- `POST /api/calls/start`
  - Creates `call_sessions` row, validates provider config.
- `POST /api/calls/token`
  - Placeholder for provider token generation.
- `POST /api/calls/respond`
- `POST /api/calls/signal`

## Next Steps
1. Choose provider.
2. Add env vars.
3. Implement token generation in `app/api/calls/token/route.ts`.
4. Add WebRTC client to use provider tokens in chat.
