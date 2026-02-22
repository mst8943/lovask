# Phase 1: İlk 10 Özellik - Teknik Analiz, Veri Modeli, UI Akışı, API/RLS

## 1) Sesli/Görüntülü Arama (Realtime)
**Teknik Analiz**
- WebRTC tabanlı P2P; sinyalleşme `call_signals` üzerinden Supabase Realtime.
- Çağrı yaşam döngüsü: `ringing -> active -> ended/declined/missed`.
- Güvenlik: sadece match katılımcıları, room id server tarafından üretilir.

**Veri Modeli**
- `call_sessions`: çağrının meta durumu, tip, süre, provider.
- `call_participants`: katılımcı rolleri, join/leave/accept.
- `call_signals`: SDP/ICE paketleri.
- `call_events`: audit/analitik.

**UI Akışı**
- Chat üst bar: `Sesli` ve `Görüntülü` çağrı butonları.
- Çağrı gittiğinde banner: “Aranıyor…”, karşı taraf kabul/ret.
- Aktif çağrıda `Minimize / End` kontrolleri.

**API/RLS**
- `POST /api/calls/start`: çağrı başlat.
- `POST /api/calls/respond`: kabul/ret/bitir.
- `POST /api/calls/signal`: WebRTC sinyali.
- RLS: sadece match katılımcıları `select/insert/update`.

## 2) Gelişmiş Keşif Algoritması
**Teknik Analiz**
- Skor = uyum + kalite + yenilik/çeşitlilik + yakınlık.
- Overexposure engeli: aynı profili kısa sürede tekrar gösterme.

**Veri Modeli**
- `profile_quality_scores`: profil kalite puanı.
- `discovery_impressions`: gösterim kaydı.

**UI Akışı**
- Feed kartlarında `Uyum` ve `Mesafe` etiketi.
- Filtrelerde `Mesafe` sınırı.

**API/RLS**
- RPC: `fetch_feed_page_v2` (uyum + mesafe + sıralama).
- RLS: `discovery_impressions` sadece kendi yazabilir.

## 3) Uyumluluk (Compatibility)
**Teknik Analiz**
- Uyum skoru: ilgi/niyet/yaşam tarzı/yaş/mesafe ağırlıkları.
- Periyodik batch/cron ile hesaplanır (admin job).

**Veri Modeli**
- `compatibility_scores`: kullanıcı bazlı skor + breakdown.

**UI Akışı**
- Feed kartında `Uyum %` badge.
- Profil detayında “Neden uyumlu?” kısa açıklama.

**API/RLS**
- Admin insert; kullanıcı sadece kendi skorunu görür.
- RPC feed içinden join.

## 4) Konum Zekası
**Teknik Analiz**
- `haversine_km` ile mesafe.
- Görünürlük modları: `public / approx / hidden`.

**Veri Modeli**
- `profiles.location_*`, `location_visibility`, `location_updated_at`.

**UI Akışı**
- Profilde mesafe etiketi.
- Gizlilikte konum görünürlüğü seçimi.

**API/RLS**
- Mesafe filteri RPC’de.
- Görünürlük: feed’de last_active gibi koşullu gösterim.

## 5) Etkinlik/Tema Bazlı Eşleşme
**Teknik Analiz**
- Etkinlik katılımına göre özel feed ve eşleşme.
- Etkinlik bazlı match kısıtı (aynı event’e katılanlar).

**Veri Modeli**
- `events`, `event_participants`, `event_matches`.

**UI Akışı**
- `/events` listesi, katılım butonu.
- Etkinlik kartı içinde katılan profilleri gösterme (v2).

**API/RLS**
- Events admin create/update.
- Katılım: kullanıcı kendisi için insert.

## 6) Fotoğraf Doğrulama + KYC
**Teknik Analiz**
- Selfie + KYC aşamaları.
- Admin panelinden onay/ret.

**Veri Modeli**
- `user_verifications.type`: `photo / selfie / kyc / video`.
- `provider`, `metadata`.

**UI Akışı**
- Ayarlar > Doğrulama sayfasında adım adım akış.
- Durum rozetleri: `pending/approved/rejected`.

**API/RLS**
- Kullanıcı kendi doğrulamasını görür.
- Admin update.

## 7) Gelişmiş Profil (Niyet & Dealbreakers)
**Teknik Analiz**
- Profil zenginliği uyum skoruna girer.
- Dealbreaker alanları feed filtreye bağlanır.

**Veri Modeli**
- `profiles.intent`, `relationship_goal`, `languages`, `values`, `dealbreakers`, `family_plans`, `fitness`, `pets`, `education_level`, `work_title`.

**UI Akışı**
- Profil düzenlemede yeni alanlar.
- Profil detayında ikonlu özet.

**API/RLS**
- Profile update policy mevcut, ek alanlar aynı policy ile korunur.

## 8) Son Aktif Görünürlüğü
**Teknik Analiz**
- `last_active_visibility`: herkes, sadece eşleşmeler, gizle.
- Feed’de last_active_at koşullu döner.

**Veri Modeli**
- `user_settings.last_active_visibility`.

**UI Akışı**
- Gizlilik sayfasında toggle.

**API/RLS**
- Feed RPC last_active kontrolü.

## 9) Zengin Mesajlaşma (Audio/Sticker/Poll/Reaction)
**Teknik Analiz**
- Audio: özel storage bucket + signed URL.
- Reactions: ayrı tablo (çoklu emoji destekli).
- Poll: message üstü mini oy.

**Veri Modeli**
- `messages.type` genişletildi.
- `message_reactions`, `stickers`, `message_polls`, `message_poll_votes`.

**UI Akışı**
- Chat girişinde `Ses` kaydı butonu.
- Mesaj long-press ile emoji reaksiyon.
- Mini anket şablonları.

**API/RLS**
- Reactions/polls sadece match katılımcıları.
- Sticker okuma auth gerekli.

## 10) Gelişmiş Güvenlik Kontrolleri
**Teknik Analiz**
- İlk mesaj için “istek” modu; kabul edilmeden mesaj düşmez.
- Taciz modu: istek zorunlu, bildirim azaltımı.

**Veri Modeli**
- `message_requests`.
- `user_settings.message_request_mode`, `harassment_mode`.

**UI Akışı**
- Gizlilikte `Mesaj istegi modu`.
- Yeni sohbetlerde “istek gonder” ekranı.

**API/RLS**
- `can_send_message` fonksiyonu ile RLS enforce.
- Message insert policy güncellendi.

