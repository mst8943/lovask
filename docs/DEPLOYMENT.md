# Deployment

## Vercel

1. **Environment Variables (Project Settings)**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`
   - `HEALTH_SECRET`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_SITE_URL`
   - `APP_ORIGIN`
   - `CALL_PROVIDER` (set to `none` if you are not using Agora/Twilio)

2. **Cron jobs**
   - Vercel Cron should call:
     - `POST /api/cron/moderation`
     - `POST /api/cron/stories`
     - `POST /api/cron/cleanup-audio`
   - Add header: `Authorization: Bearer <CRON_SECRET>`
   - Suggested schedules (UTC):
     - Moderation: every 10 minutes
     - Stories: hourly
     - Cleanup audio: daily

## VPS

1. **Node version**
   - Use Node 20 (see `.nvmrc`).

2. **Build & run**
   ```bash
   npm ci
   npm run build
   npm start
   ```

3. **Environment**
   - Copy the same variables from `.env.local` into the server environment.
   - Make sure `NEXT_PUBLIC_SITE_URL` and `APP_ORIGIN` point to your VPS domain.

4. **Cron (Linux)**
   Example crontab (UTC):
   ```cron
   */10 * * * * curl -s -X POST https://YOUR_DOMAIN/api/cron/moderation -H "Authorization: Bearer $CRON_SECRET"
   0 * * * * curl -s -X POST https://YOUR_DOMAIN/api/cron/stories -H "Authorization: Bearer $CRON_SECRET"
   0 3 * * * curl -s -X POST https://YOUR_DOMAIN/api/cron/cleanup-audio -H "Authorization: Bearer $CRON_SECRET"
   ```
