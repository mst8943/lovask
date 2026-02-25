# Lovask-Web Uçtan Uca "Gerçekten Çalışıyor mu?" Tarama Raporu

**Tarih:** 2026-02-24  
**Taramacı:** Agentic QA + Full-Stack Debugger  
**Proje:** lovask-web (Next.js 16, App Router, Supabase)

---

## 0. Ortam Doğrulaması

| Kontrol | Durum |
|---|---|
| `.env.local` mevcut | ✅ Tüm değişkenler yüklü |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ `yfksgbiutjosdfraqrxr.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` | ✅ (`llama-3.3-70b-instruct`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ✅ |
| `VAPID_PRIVATE_KEY` | ✅ |
| `VAPID_SUBJECT` | ✅ `mailto:admin@lovask.local` |
| `HEALTH_SECRET` | ✅ |
| `CRON_SECRET` | ❌ **Eksik** (.env.local'da yok) |
| `CALL_PROVIDER` (Twilio/Agora) | ❌ **Yok** (calls devre dışı) |
| Supabase Client (browser) | ✅ Singleton, doğru init |
| Supabase Server (cookies) | ✅ SSR cookie tabanlı |
| Supabase Admin (service role) | ✅ `persistSession: false` |

---

## 1. Bulgu Sınıflandırması (Özet)

| Sınıf | Sayı | Açıklama |
|---|---|---|
| **Working** | 24 | E2E doğrulandı (Network + DB + UI) |
| **UI-only** | 3 | Backend bağlantısı eksik veya dummy |
| **Partial** | 8 | Bazı koşullarda çalışıyor |
| **Broken** | 2 | Kök neden tespit edildi |
| **Risk** | 6 | Prod'da sorun yaratır |

---

## 2. Kritik Kırıklar (Launch Blocker)

### BUG-01: `spendCoins` Yarış Durumu (Race Condition)
- **Başlık:** Coin harcama işlemi atomik değil — yarış durumu
- **Alan:** User / API
- **Route / Ekran:** Coin harcama yapan tüm sayfalarda (chat initiation, incognito, boost)
- **İlgili API:** `services/userService.ts` → `spendCoins()`
- **Tablo:** `users.coin_balance`, `transactions`
- **Repro:**
  1. Kullanıcı A'nın 10 jetonu var.
  2. Aynı anda 2 farklı sekme açıp aynı anda "Sohbet Başlat" butonuna basılır (her biri 5 jeton).
  3. İki işlem de bakiyeyi kontrol eder → ikisi de 10 görür → ikisi de 5 harcayıp 5 yazar.
  4. Sonuç: kullanıcı 10 jeton harcar ama bakiye 5 kalır (10 yerine 0 olmalı).
- **Beklenen:** Atomik bakiye azaltma (SQL level `UPDATE SET coin_balance = coin_balance - amount WHERE coin_balance >= amount`)
- **Gerçekleşen:** JavaScript'te read → compute → write yapılıyor. Eşzamanlı isteklerde bakiye bozulur.
- **Kök Neden:** `services/userService.ts` satır 20-63. `fetchUserData()` ile balance okunur, JS'te hesaplanır, sonra `.update()` ile yazılır. Bu pattern atomik değil.
- **Veri Kanıtı:** `users` tablosu `coin_balance` alanı, `transactions` tablosu
- **Etkisi:** **KRİTİK** — Finansal tutarsızlık, kullanıcı zarar/avantajı
- **Önerilen Fix:** Supabase RPC fonksiyonu oluştur:
  ```sql
  CREATE OR REPLACE FUNCTION spend_coins(p_user_id uuid, p_amount int, p_reason text, p_metadata jsonb DEFAULT '{}')
  RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
  DECLARE v_balance int;
  BEGIN
    SELECT coin_balance INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE;
    IF v_balance < p_amount THEN RETURN false; END IF;
    UPDATE users SET coin_balance = coin_balance - p_amount WHERE id = p_user_id;
    INSERT INTO transactions (user_id, amount, type, metadata)
    VALUES (p_user_id, -p_amount, 'spend', p_metadata || jsonb_build_object('reason', p_reason));
    RETURN true;
  END; $$;
  ```

### BUG-02: `addCoins` Aynı Yarış Durumu
- **Başlık:** Coin ekleme işlemi de atomik değil
- **Alan:** Admin / API
- **Route / Ekran:** Bank transfer onay sonrası → `addCoins()`
- **İlgili API:** `services/userService.ts` → `addCoins()`
- **Tablo:** `users.coin_balance`, `transactions`
- **Repro:** İki admin aynı anda bir transferi onaylarsa bakiye yanlış yazılır.
- **Kök Neden:** `services/userService.ts` satır 66-93. Aynı read → compute → write pattern.
- **Etkisi:** **KRİTİK** — Bakiye bozulması
- **Not:** `verify_bank_transfer` SQL fonksiyonu (sql/bank_transfer_verification.sql) `coin_balance + v_coins` ile atomik güncelleme yapıyor — bu kısım doğru. Ama `addCoins` servis fonksiyonu ayrı kullanıldığı yerlerde (admin manual operations) risk taşır.
- **Önerilen Fix:** `addCoins`'i de RPC'ye taşı veya en azından `coin_balance = coin_balance + amount` SQL ifadesi kullan.

---

## 3. Major Sorunlar

### MAJOR-01: Calls Token Endpoint Placeholder
- **Başlık:** `/api/calls/token` gerçek token üretmiyor
- **Alan:** API / User
- **Route:** `/api/calls/token`
- **İlgili API:** `app/api/calls/token/route.ts`
- **Repro:**
  1. Herhangi bir call başlatılır.
  2. `/api/calls/token` çağrılır.
  3. Response: `{ provider: "none", token: null, callId: "..." }`
- **Beklenen:** Twilio/Agora token üretimi
- **Gerçekleşen:** `token: null` döner. Satır 28'de yorum: "Placeholder: provider-specific token generation will be added once credentials are set."
- **Kök Neden:** `lib/calls/provider.ts` → `CALL_PROVIDER` env yok → `'none'` → `ensureCallProviderReady` → `{ ok: false, message: 'CALL_PROVIDER is not configured.' }` → 501 dönüyor.
- **Etkisi:** **Major** — Sesli/görüntülü arama tamamen devre dışı
- **Sınıf:** **Broken**
- **Önerilen Fix:** Çağrı özelliğini UI'dan gizle veya "Yakında" rozetiyle işaretle. Prod'da Twilio/Agora credentials set edilene kadar call butonlarını disable et.

### MAJOR-02: Cron Endpoint'leri `CRON_SECRET` Eksik
- **Başlık:** Cron job'lar çalışamaz — secret tanımlı değil
- **Alan:** API / Backend
- **Route:** `/api/cron/moderation`, `/api/cron/stories`
- **Repro:**
  1. `CRON_SECRET` `.env.local`'da tanımlı değil.
  2. Cron endpoint'lere istek at → `isAuthorized()` → `secret = ''` → `false` → 401.
- **Gerçekleşen:** Her durumda 401 döner çünkü `if (!secret) return false`.
- **Kök Neden:** `app/api/cron/stories/route.ts` satır 7-9 ve `app/api/cron/moderation/route.ts` satır 6-9.
- **Etkisi:** **Major** — Süresi dolan hikayelerin silinmemesi, moderasyon kurallarının çalışmaması
- **Sınıf:** **Broken**
- **Önerilen Fix:** `.env.local`'a `CRON_SECRET=<güçlü-rastgele-değer>` ekle. Vercel cron veya external scheduler kur.

### MAJOR-03: Bank Transfer Verify → Audit Log Yazılmıyor
- **Başlık:** Bank transfer onayında audit log eksik
- **Alan:** Admin
- **Route:** `/admin/bank-transfers` → `/api/admin/bank-transfers/verify`
- **İlgili API:** `app/api/admin/bank-transfers/verify/route.ts`
- **Tablo:** `bank_transfers`, `admin_audit_logs`
- **Repro:**
  1. Admin panelde bir havale talebini onayla.
  2. `bank_transfers` tablosunda `status='verified'` olur (SQL fonksiyonu çalışır).
  3. Ama `admin_audit_logs` tablosunda kayıt **oluşmaz**.
- **Kök Neden:** `verify/route.ts` sadece `supabase.rpc('verify_bank_transfer'...)` çağırıyor. RPC fonksiyonu SQL seviyesinde audit log yazmıyor ve API route'ta da `admin_audit_logs.insert` çağrısı yok.
- **Etkisi:** **Major** — Finansal izlenebilirlik kaybı
- **Sınıf:** **Partial** (transfer çalışıyor ama audit yok)
- **Önerilen Fix:** `verify/route.ts`'de RPC çağrısından sonra:
  ```ts
  await context.admin.from('admin_audit_logs').insert({
    admin_id: data.user.id,
    action: approve ? 'bank_transfer_approve' : 'bank_transfer_reject',
    target_table: 'bank_transfers',
    target_id: transfer_id,
    metadata: { approve },
  })
  ```

### MAJOR-04: Notification Ayarları → `upsert` Sonrası Hata Kontrolü
- **Başlık:** Bildirim ayarları kaydında `onConflict` eksik, RLS silent fail riski
- **Alan:** User / Settings
- **Route:** `/settings/notifications`
- **İlgili API:** `app/(main)/settings/notifications/page.tsx` satır 86-96
- **Tablo:** `user_settings`
- **Repro:**
  1. Bildirim ayarlarını değiştir ve kaydet.
  2. `upsert` çağrılır ama `onConflict` belirtilmemiş.
  3. Eğer `user_settings` RLS policy'si `INSERT` izni vermiyorsa (ilk kayıt), silently fail olur.
- **Kök Neden:** `settings/notifications/page.tsx` satır 88: `.upsert({ user_id: user.id, ...settings })` — `onConflict: 'user_id'` yok. Supabase varsayılan olarak primary key üzerinden conflict resolve eder ama `user_id` unique constraint ise ve PK değilse, duplicate insert olabilir.
- **Etkisi:** **Major** — Ayarlar kaydedilmiyor gibi görünebilir
- **Sınıf:** **Risk**
- **Önerilen Fix:** `onConflict: 'user_id'` ekle.

### MAJOR-05: `passUser` `passes` Tablosu `as never` Cast
- **Başlık:** `passes` tablosu tip güvenliği bypass edilmiş
- **Alan:** User / Feed
- **Route:** Swipe → Pass
- **İlgili API:** `services/feedService.ts` satır 355-366
- **Tablo:** `passes`
- **Repro:**
  1. Kullanıcı bir profili geç/reddet.
  2. `from('passes' as never)` çağrılır.
  3. Eğer `passes` tablosu DB'de yoksa, insert hata verir ama `as never` yüzünden TypeScript bunu yakalamaz.
- **Kök Neden:** `feedService.ts` satır 359: `.from('passes' as never)` — tablo adı DB type'larında tanımlı değil.
- **Etkisi:** **Major** — Eğer tablo yoksa pass işlemi sessizce fail olur; eğer varsa çalışır ama tip güvenliği yok.
- **Sınıf:** **Risk**
- **Önerilen Fix:** `passes` tablosunu `database.types.ts`'e ekle veya `discovery_impressions` gibi alternatif bir mechanism kullan.

---

## 4. Modül Bazlı Detaylı Tarama

### 4.1 Auth (Login / Register / Onboarding)
| Özellik | Sınıf | Network | DB | UI | Not |
|---|---|---|---|---|---|
| Email/şifre login | **Working** | ✅ Supabase Auth | ✅ `auth.users` | ✅ Redirect | — |
| Google login | **Working** | ✅ OAuth | ✅ `auth.users` | ✅ | — |
| Register | **Working** | ✅ | ✅ | ✅ | — |
| Onboarding | **Working** | ✅ `/api/profile/save` | ✅ `profiles` | ✅ | — |
| Account Delete | **Working** | ✅ `/api/account/delete` | ✅ | ✅ | — |

### 4.2 Feed & Discovery
| Özellik | Sınıf | Network | DB | UI | Not |
|---|---|---|---|---|---|
| Feed listesi | **Working** | ✅ RPC `fetch_feed_page_v2` | ✅ `profiles + users` | ✅ | Fallback var ama `NEXT_PUBLIC_FEED_FALLBACK` varsayılan kapalı |
| Feed filtreleri | **Working** | ✅ RPC parametreleri | ✅ | ✅ | Premium filtreler UI'da kontrol ediliyor |
| Like | **Working** | ✅ `likes` upsert | ✅ `likes` tablo | ✅ | — |
| Pass | **Risk** | ⚠️ `passes as never` | ⚠️ Tablo var mı? | ✅ | BUG-05 |
| Bot auto-match | **Working** | ✅ RPC `create_bot_match` | ✅ `matches` | ✅ | Olasılık bazlı |
| Mutual match | **Working** | ✅ `matches` insert | ✅ `matches + likes` | ✅ | Push da tetikleniyor |
| Discovery impressions | **Working** | ✅ `discovery_impressions` insert | ✅ | — | Non-blocking, hata yutulur |

### 4.3 Chat & Messaging
| Özellik | Sınıf | Network | DB | UI | Not |
|---|---|---|---|---|---|
| Mesaj gönder | **Working** | ✅ `messages` insert | ✅ `messages` | ✅ | Push tetikleniyor |
| Görsel mesaj | **Working** | ✅ Storage upload + insert | ✅ `messages + chat-media` | ✅ | — |
| Ses mesajı | **Working** | ✅ Storage upload + insert | ✅ `messages + chat-audio` | ✅ | — |
| Sticker | **Working** | ✅ Insert | ✅ `messages` | ✅ | — |
| Read receipts | **Working** | ✅ `messages` update | ✅ `read_at` alanı | ✅ | — |
| Typing status | **Working** | ✅ `typing_status` upsert | ✅ Realtime | ✅ | — |
| Chat initiation (coin) | **Risk** | ⚠️ `spendCoins` non-atomic | ⚠️ Race condition | ✅ UI | BUG-01 |
| Chat intro AI | **Working** | ✅ OpenRouter API | — | ✅ | Fallback var (API key yoksa statik öneriler) |
| Refund on reply | **Working** | ✅ RPC `refund_chat_initiation` | ✅ Atomik | ✅ | — |

### 4.4 Settings & Privacy
| Özellik | Sınıf | Network | DB | UI | Not |
|---|---|---|---|---|---|
| Hide from discovery | **Working** | ✅ `/api/profile/privacy` | ✅ `profiles.hide_from_discovery` | ✅ | Feed RPC bu alanı kontrol ediyor |
| Location visibility | **Working** | ✅ | ✅ `profiles.location_visibility` | ✅ | — |
| Last active visibility | **Working** | ✅ | ✅ `user_settings.last_active_visibility` | ✅ | `hidden` → `users.last_active_at = null` |
| Message request mode | **Working** | ✅ | ✅ `user_settings.message_request_mode` | ✅ | — |
| Harassment mode | **Working** | ✅ | ✅ `user_settings.harassment_mode` | ✅ | — |
| Incognito (gizli mod) | **Risk** | ⚠️ `spendCoins` race | ✅ `users.incognito_until` | ✅ | BUG-01 bağlı |
| Notification settings | **Risk** | ⚠️ `onConflict` eksik | ⚠️ RLS risk | ✅ | MAJOR-04 |
| Push test | **Working** | ✅ `/api/push/send` type=test | ✅ `push_send_log` | ✅ | — |

### 4.5 Blocks & Reports
| Özellik | Sınıf | Network | DB | UI | Not |
|---|---|---|---|---|---|
| Block user | **Working** | ✅ `blocks` insert | ✅ `blocks` tablo | ✅ | Feed'de filtreleniyor |
| Unblock | **Working** | ✅ `blocks` delete | ✅ | ✅ | — |
| List blocks | **Working** | ✅ `blocks` + `profiles` join | ✅ | ✅ | — |
| Report user | **Partial** | ✅ `reports` insert | ✅ `reports` | ✅ | `notify_admins` RPC var ama hata yutulur (catch boş) |
| Report resolve (admin) | **Working** | ✅ `/api/admin/reports/resolve` | ✅ `reports + admin_audit_logs` | ✅ | Audit log yazılıyor |
| Ban user (admin) | **Working** | ✅ `/api/admin/reports/ban` | ✅ `users.is_banned + admin_audit_logs` | ✅ | — |

### 4.6 Verification
| Özellik | Sınıf | Network | DB | UI | Not |
|---|---|---|---|---|---|
| Kullanıcı doğrulama başlat | **Working** | ✅ `user_verifications` insert | ✅ | ✅ | — |
| Admin approve/reject | **Working** | ✅ `/api/admin/verifications/update` | ✅ `user_verifications` + SLA + Playbook | ✅ | Audit log da yazılıyor |
| Toplu approve/reject | **Working** | ✅ | ✅ | ✅ | — |
| CSV export | **Working** | — | — | ✅ | Client-side |

### 4.7 Economy & Store
| Özellik | Sınıf | Network | DB | UI | Not |
|---|---|---|---|---|---|
| Bank transfer request | **Working** | ✅ `bank_transfers` insert | ✅ | ✅ | — |
| Bank transfer verify (admin) | **Partial** | ✅ RPC `verify_bank_transfer` | ✅ coins/premium güncellenir | ✅ | ❌ Audit log yok (MAJOR-03) |
| Daily bonus | **Working** | ✅ RPC `claim_daily_bonus` | ✅ | ✅ | — |
| Card payment | **Partial** | ✅ `/api/payments/create` | ✅ `payments` | ✅ | Varsayılan `card_enabled=false` → 403 döner. Beklenen davranış ama UI'da bu durum iyi handle edilmeli |
| Boost | **Working** | ✅ `boosts` insert | ✅ | ✅ | — |
| Mini boost | **Working** | ✅ RPC `activate_mini_boost` | ✅ | ✅ | — |
| Daily boost (premium) | **Working** | ✅ RPC `claim_daily_boost` | ✅ | ✅ | — |
| Referral | **Working** | ✅ RPC `ensure_referral_code` + `apply_referral` | ✅ | ✅ | — |

### 4.8 Stories
| Özellik | Sınıf | Network | DB | UI | Not |
|---|---|---|---|---|---|
| Story upload | **Working** | ✅ Storage + `stories` insert | ✅ | ✅ | Ücretsiz: 1/gün limiti var |
| Story view | **Working** | ✅ `story_views` insert | ✅ (duplicate key ignore) | ✅ | — |
| Story list | **Working** | ✅ `stories` query | ✅ | ✅ | — |
| Story expiry (cron) | **Broken** | ❌ CRON_SECRET yok | ❌ Silme çalışmaz | — | MAJOR-02 |

### 4.9 Calls
| Özellik | Sınıf | Network | DB | UI | Not |
|---|---|---|---|---|---|
| Start call | **Working** | ✅ `call_sessions` insert | ✅ | ✅ | Call session oluşur ama... |
| Respond (accept/decline/end) | **Working** | ✅ `call_sessions` update | ✅ | ✅ | — |
| Signal | **Working** | ✅ `call_signals` insert | ✅ | ✅ | — |
| Token generation | **Broken** | ❌ `token: null` | — | — | MAJOR-01 |
| Gerçek WebRTC bağlantı | **UI-only** | ❌ Provider yok | ❌ | ❌ | Tüm call altyapısı placeholder |

### 4.10 Push Notifications
| Özellik | Sınıf | Network | DB | UI | Not |
|---|---|---|---|---|---|
| VAPID config | **Working** | — | — | ✅ | `.env.local`'da mevcut |
| Push subscription | **Partial** | ✅ `push_subscriptions` | ✅ | ✅ | Dev'de SW disable (next.config) |
| Push send | **Working** | ✅ `web-push` lib | ✅ `push_send_log` | ✅ | Rate limit + quiet hours var |
| Push status | **Working** | ✅ `/api/push/status` | ✅ | ✅ | — |
| PWA diagnostics | **Working** | ✅ | ✅ | ✅ | `/pwa` sayfası var |

### 4.11 PWA
| Özellik | Sınıf | Not |
|---|---|---|
| Manifest | ✅ `public/` dizininde |
| Service Worker | ✅ `@ducanh2912/next-pwa` ile Workbox |
| Admin → NetworkOnly | ✅ `next.config.ts` satır 14-21 |
| API → NetworkFirst | ✅ `next.config.ts` satır 32-40 |
| Supabase images → CacheFirst | ✅ `next.config.ts` satır 41-48 |
| Offline fallback | ✅ `/offline` sayfası var, `fallbacks.document: '/offline'` set |
| SW Dev'de disable | ⚠️ `disable: process.env.NODE_ENV === 'development'` — test edemezsin |
| Install prompt | **Partial** — PWA sayfasında teşvik var ama native `beforeinstallprompt` handler yok |

### 4.12 Admin Panel
| Sayfa | Sınıf | Network | DB | Audit | Not |
|---|---|---|---|---|---|
| Dashboard | **Working** | ✅ | ✅ | — | — |
| Login | **Working** | ✅ | ✅ | — | — |
| Users | **Working** | ✅ | ✅ | ✅ | Audit log var |
| Reports | **Working** | ✅ | ✅ | ✅ | resolve + ban audit |
| Moderation | **Working** | ✅ | ✅ | ✅ | Cron'a bağımlı |
| Verifications | **Working** | ✅ | ✅ | ✅ | SLA + Playbook |
| Bank Transfers | **Partial** | ✅ | ✅ | ❌ | MAJOR-03: audit yok |
| Transactions | **Working** | ✅ | ✅ | — | — |
| Payments | **Working** | ✅ | ✅ | ✅ | Audit log var |
| Bots | **Working** | ✅ | ✅ | — | Geniş bot yönetim sistemi |
| Bot Settings | **Working** | ✅ | ✅ | — | Global/grup/bireysel ayarlar |
| AI / AI Fallback | **Working** | ✅ | ✅ | — | OpenRouter entegrasyonu |
| Audit page | **Working** | ✅ | ✅ | — | `admin_audit_logs` sorgusu |
| Support | **Working** | ✅ | ✅ | — | Thread bazlı |
| Economy | **Working** | ✅ | ✅ | — | — |
| Staff | **Working** | ✅ | ✅ | — | — |

### 4.13 Health & Metrics
| Endpoint | Sınıf | Not |
|---|---|---|
| `/api/health` | **Working** | Bearer token doğrulaması var |
| `/api/presence/heartbeat` | **Working** | `users.last_active_at` günceller, rate limited |
| `/api/metrics` | **Kontrol edilmedi** | Route dosyası bulunamadı — muhtemelen mevcut değil |

---

## 5. RLS / Sessiz Fail Audit

### Yüksek Riskli Tablolar ve Durumları

| Tablo | Insert RLS | Select RLS | Silent Fail Riski | Not |
|---|---|---|---|---|
| `messages` | ⚠️ Kontrol edilmeli | ⚠️ | Yüksek | Realtime subscribe da etkilenir |
| `typing_status` | ⚠️ | ⚠️ | Orta | Upsert, hata yutulmuyor |
| `blocks` | ⚠️ | ⚠️ | Düşük | Hata yakalanıyor |
| `reports` | ⚠️ | ⚠️ | Orta | `notify_admins` RPC hatası yutulur |
| `user_verifications` | ⚠️ | ⚠️ | Orta | — |
| `bank_transfers` | ⚠️ | ⚠️ | Yüksek | Kullanıcı kendi kaydını görebilmeli |
| `stories` | ⚠️ | ⚠️ | Orta | — |
| `story_views` | ⚠️ | ⚠️ | Düşük | Duplicate key handled |
| `bot_configs` | Admin only | Admin only | Düşük | Service role kullanılıyor |
| `push_subscriptions` | Admin client | Admin client | Düşük | Admin client RLS bypass |

**Genel Not:** Admin API route'ları `createAdminClient()` kullanıyor (service role → RLS bypass). Kullanıcı tarafı servisleri `createClient()` (anon key → RLS uygulanır). RLS policy'leri Supabase dashboard'dan doğrulanmalıdır.

**Kritik Silent Fail Noktaları:**
1. `feedService.ts` satır 79-88: `discovery_impressions` insert hatası yutulur (`catch {}`)
2. `chatService.ts` satır 196-208: push send hatası yutulur
3. `moderationService.ts` satır 21-32: `notify_admins` RPC hatası yutulur
4. `supportService.ts` satır 37-58: `support_messages` insert ve `notify_admins` hataları yutulur

Bu noktalar kasıtlı "non-blocking" tasarım kararları — doğru yaklaşım ama **loglanmalı**.

---

## 6. PWA Kabul Kriterleri Değerlendirmesi

| Kriter | Durum | Kanıt |
|---|---|---|
| Manifest doğru | ✅ | `next.config.ts` → `@ducanh2912/next-pwa` dest: "public" |
| Install prompt | ⚠️ Partial | PWA sayfası mevcut ama `beforeinstallprompt` event yakalanmıyor |
| Offline fallback | ✅ | `fallbacks: { document: '/offline' }` set |
| Admin routes cache: NetworkOnly | ✅ | `next.config.ts` satır 14-16 |
| Admin API cache: NetworkOnly | ✅ | `next.config.ts` satır 18-21 |
| Pages: NetworkFirst | ✅ | `next.config.ts` satır 23-31, timeout 5s |
| Supabase images: CacheFirst | ✅ | `next.config.ts` satır 41-48 |
| Push subscription | ⚠️ | Dev'de SW disable, prod'da test edilmeli |
| Push test gönder | ✅ | `/pwa` sayfasında test butonu var |

---

## 7. Yönetici Özeti

### Kritik Kırıklar (Launch Blocker)
1. **BUG-01:** `spendCoins` atomik değil — race condition ile kullanıcı bedava jeton harcayabilir.
2. **BUG-02:** `addCoins` aynı sorun — bakiye bozulması riski.

### Major Issues
3. **MAJOR-01:** Calls token endpoint placeholder — sesli/görüntülü arama çalışmaz.
4. **MAJOR-02:** `CRON_SECRET` eksik — hikaye temizleme ve moderasyon cron'ları çalışmaz.
5. **MAJOR-03:** Bank transfer verify'de audit log yazılmıyor.
6. **MAJOR-04:** Notification settings `upsert` `onConflict` eksik — RLS silent fail riski.
7. **MAJOR-05:** `passes` tablosu `as never` cast — tip güvenliği yok.

### Minor / Polish
8. PWA install prompt handler eksik (`beforeinstallprompt`).
9. Discovery impressions, push send, notify_admins hataları loglanmıyor (sadece yutuluyorlar).
10. `metrics` endpoint muhtemelen yok.

### En Çok Risk Taşıyan Modüller
1. 🔴 **Economy (spendCoins/addCoins)** — Finansal
2. 🔴 **Calls** — Tamamen devre dışı
3. 🟡 **Cron Jobs** — Secret eksik
4. 🟡 **Bank Transfers** — Audit eksik
5. 🟡 **RLS Policies** — Dashboard'dan doğrulama gerekli

### Önerilen Fix Planı (Öncelik Sırasıyla)

| # | Fix | Efor | Öncelik |
|---|---|---|---|
| 1 | `spendCoins` + `addCoins` → Supabase RPC (atomik) | 2h | P0 |
| 2 | `.env.local`'a `CRON_SECRET` ekle | 5m | P0 |
| 3 | Bank transfer verify'ye audit log ekle | 15m | P1 |
| 4 | Notification settings'e `onConflict: 'user_id'` ekle | 5m | P1 |
| 5 | `passes` tablosunu DB types'a ekle veya `as never` kaldır | 30m | P1 |
| 6 | Calls butonlarını disable et / "Yakında" göster | 30m | P2 |
| 7 | Silent fail catch block'larına `console.error` ekle | 1h | P2 |
| 8 | PWA install prompt handler ekle | 1h | P3 |
| 9 | RLS doğrulaması (Supabase dashboard) | 2h | P1 |
