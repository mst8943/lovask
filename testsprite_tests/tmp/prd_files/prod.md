Uygulama: Lovask Web
  Kapsam: Sadece kullanıcı tarafı (admin hariç)
  Amaç: Frontend E2E testleri (happy path + kritik edge case)

  ## 1) Kimlik Doğrulama
  - Register:
    - Geçerli bilgilerle kayıt başarılı.
    - Hatalı email formatı uyarı verir.
    - Zayıf/uygunsuz şifre uyarı verir.
  - Login:
    - Geçerli kullanıcı ile giriş başarılı.
    - Hatalı şifreyle girişte hata mesajı.
  - Session:
    - Sayfa yenilenince oturum korunur.
    - Logout sonrası korumalı sayfalara erişim yok.

  ## 2) Onboarding
  - Adım adım akış tamamlanır.
  - Zorunlu alanlar boşsa ilerlenemez.
  - Fotoğraf ekleme/doğrulama alanı çalışır.
  - Onboarding tamamlanınca ana akışa yönlendirme yapılır.

  ## 3) Feed / Swipe
  - Keşfet/sıralı profil kartları yüklenir.
  - Like/Pass aksiyonları çalışır.
  - Super Like akışı çalışır (gerekli yerlerde coin/premium kontrolü).
  - Rewind (geri al) akışı çalışır (premium/coin kurallarına göre).
  - Kart bitince boş durum ekranı görünür.
  - Yenile butonu yeni veri ister.

  ## 4) Match Popup (Swipe sonrası)
  - Eşleşme olduğunda popup açılır.
  - Popup’ta iki buton vardır:
    - “Ona merhaba de”
    - “Kaydırmaya devam et”
  - “Ona merhaba de” tıklanınca otomatik mesaj gönderilir:
    - “Selam nasıl gidiyor”
  - “Kaydırmaya devam et” popup’ı kapatır ve swipe akışı devam eder.

  ## 5) Liked Me
  - Sayfa iki bölüm gösterir:
    - Eşleşmeler
    - Beğenenler
  - Premium kullanıcı:
    - Beğenenler net görünür.
  - Non-premium kullanıcı:
    - Beğenenler bulanık/gizli görünür.
    - Eşleşmeler görünür.
  - Unlock/premium geçiş sonrası beğenenler açılır.

  ## 6) Matches / Chat
  - Eşleşme listesi yüklenir.
  - Sohbet ekranı açılır.
  - Mesaj gönderme/alma görünümü çalışır.
  - Otomatik gönderilen “Selam nasıl gidiyor” mesajı sohbette görünür.
  - Geri dönüş ve listeye dönme çalışır.

  ## 7) Profil
  - Profil görüntüleme çalışır.
  - Profil düzenleme alanları kaydedilir.
  - Fotoğraf/avatar fallback doğru çalışır.
  - İlgi alanları ve temel bilgiler UI’da doğru görünür.

  ## 8) Ayarlar
  - Bildirim ayarları aç/kapat çalışır.
  - Gizlilik/hesap ayarları sayfaları açılır.
  - Hesap işlemleri (varsa) doğrulama modalı ile çalışır.

  ## 9) Navigasyon
  - Bottom nav linkleri doğru sayfalara gider.
  - Korumalı route davranışı doğru.
  - Mobil viewport ve desktop viewport’ta temel akış bozulmaz.

  ## 10) UI/UX Kalite Kontrolleri
  - Yüklenme durumları (loader/skeleton) görünür.
  - Boş durum ekranları düzgün.
  - Hata mesajları kullanıcıya anlaşılır gösterilir.
  - Kritik butonlar işlem sırasında disabled/loading olur.
  - Görsel kırılma ve overflow olmamalı (mobil+desktop).

  ## 11) Test Hesapları
  - Non-premium test hesabı kullan.
  - Premium test hesabı kullan.
  - Her iki hesapla Liked Me davranışını ayrı doğrula.