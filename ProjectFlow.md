# 🚀 NİHAİ PROJE AKIŞ PLANI: PROMPT MÜHENDİSİ MOBİL UYGULAMASI (V.3.0)

## 🎯 Ana Vizyon ve Hedefler
Kullanıcıların görsel yükleyip AI prompt'u ürettiği, bu prompt'ları sergileyip (sosyal vitrin) ve abonelik/kredi sistemiyle çalışan Full-Stack mobil uygulama. Uygulama, kullanıcının ürettiği içeriği paylaşmasını ödüllendirmelidir.

## 🛠️ Tech Stack ve Entegrasyonlar
- **Frontend:** React Native (TypeScript), Expo (Expo Router), React Native Paper (UI)
- **Backend/DB/Auth/Storage:** Supabase (PostgreSQL)
- **AI Processing:** Gemini 2.5 Flash API (Harici bir Cloud Function/Flask API üzerinden çağrılacak)
- **Monetizasyon:** RevenueCat (Abonelik ve Kredi Satın Alma Yönetimi)

## 📌 TİCARİ İŞ MANTIĞI VE KURALLAR

| İşlem | Kural/Maliyet | Ödül | Veritabanı Etkisi |
| :--- | :--- | :--- | :--- |
| **Kayıt** | Başlangıç: 50 Kredi | Yok | `profiles.credits` = 50 |
| **Prompt Üretimi** | **10 Kredi** harcar. (Aboneler için 0 kredi) | Yok | `profiles.credits` azalır, `transactions` kaydı SPEND olur. |
| **Prompt Düzenleme** | 0 Kredi harcar. | Yok | Yok |
| **Paylaşım Ödülü** | Yok | Her **3 Paylaşılan Görsel** İçin **10 Kredi** | `profiles.credits` artar, `transactions` kaydı REWARD olur. |
| **Kredi Satın Alma** | Tek Seferlik 100 Kredilik Paket (RevenueCat) | Yok | `profiles.credits` artar, `transactions` kaydı PURCHASE olur. |
| **Abonelik** | Aylık Ödeme (RevenueCat) | **Sınırsız Prompt Üretimi** (`is_premium` true olur) | `profiles.is_premium` true olur. |

## 💾 VERİTABANI ŞEMASI (Supabase)
(Tabloların zaten oluşturulduğu varsayılır. Cursor'ın bu tablolarla çalışması gerekir.)

## 📱 EKRANLAR VE NAVİGASYON (Expo Router Tabs)
Tüm ekranlarda React Native Paper bileşenleri kullanılacaktır. Alt kısımda kalıcı bir **Tab Navigator** (4 Sekme) olacaktır.

| Sekme (Alt Bar) | Rota | İçerik ve UX Detayı | Erişim |
| :--- | :--- | :--- | :--- |
| **1. Galeri (Vitrin)** | `/tabs/gallery` | **Gelişmiş Flip Card Tasarımı:** Kartın ön yüzünde görsel, üzerine tıklandığında/dokunulduğunda arka yüzde tam prompt metni görünmelidir. **Sıralama:** "Şuna Göre Sırala" (En Yeni, En Popüler, En Çok Favorilenen) filtreleri. **Etkileşim:** Favorileme butonu. | Herkes |
| **2. Oluştur** | `/tabs/create` | Botun ana çalışma ekranı: Görsel yükleme, Kredi Kontrolü ve Prompt Üretme Formu. | Giriş Yapmış |
| **3. Profil** | `/tabs/profile` | Kullanıcının toplam kredisi, paylaşım istatistikleri ve sadece kendi oluşturduğu prompt'ları gösteren liste. | Giriş Yapmış |
| **4. Ayarlar** | `/tabs/settings` | Koyu/Açık Tema, Dil Seçeneği. Kredi Satın Alma ve Abonelik Yönetimi (RevenueCat) sayfalarına yönlendiren butonlar. | Giriş Yapmış |
| **Harici** | `/auth/login`, `/auth/register` | Standart Supabase Auth ile giriş/kayıt ekranları. | Herkes |
