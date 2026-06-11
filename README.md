# 🏫 Okul Otomat Uygulaması

Modern okul otomatları için geliştirilmiş Flutter tabanlı mobil uygulama. USB kart okuyucu desteği, offline çalışma özelliği ve Firebase entegrasyonu ile tam donanımlı bir otomat yönetim sistemi.

## ✨ Özellikler

### 🎯 Temel Özellikler
- **USB Kart Okuyucu Desteği**: HID kart okuyucuları ile sorunsuz çalışır
- **Offline-First Mimari**: İnternet olmadan tam işlevsellik
- **Firebase Entegrasyonu**: Cloud Firestore ile gerçek zamanlı senkronizasyon
- **Otomatik Veri Senkronizasyonu**: Offline işlemler otomatik olarak Firebase'e aktarılır

### 💳 Ödeme Sistemi
- Öğrenci kartı ile hızlı ödeme
- Gerçek zamanlı bakiye kontrolü
- İşlem geçmişi takibi
- Offline ödeme desteği (sonradan senkronize)

### 📱 Kullanıcı Arayüzü
- Modern ve kullanıcı dostu tasarım
- 4 farklı kategori (İçecekler, Atıştırmalıklar, Tatlılar, Gofretter)
- 20+ ürün çeşidi
- Sepet yönetimi
- Anlık popup bildirimleri

### 🔐 Admin Paneli
- Öğrenci ekleme/düzenleme
- Bakiye yükleme
- Satış istatistikleri
- Şifre korumalı erişim

## 🛠️ Teknolojiler

- **Framework**: Flutter 3.5.4
- **Backend**: Firebase Cloud Firestore
- **Offline Depolama**: SharedPreferences
- **State Management**: StatefulWidget
- **Platform**: Android (Tablet optimizasyonlu)

## 📦 Kurulum

### Gereksinimler
- Flutter SDK ^3.5.4
- Dart SDK
- Android Studio / VS Code
- Firebase hesabı

### Kurulum Adımları

1. **Projeyi klonlayın**
```bash
git clone https://github.com/Mustafailhann/Okul-Otomat-Uygulamas.git
cd okul_otomat_hibrit
```

2. **Bağımlılıkları yükleyin**
```bash
flutter pub get
```

3. **Firebase yapılandırması**
- Firebase Console'da yeni proje oluşturun
- `google-services.json` dosyasını `android/app/` klasörüne ekleyin
- Firestore Database oluşturun

4. **Uygulamayı çalıştırın**
```bash
flutter run -d <device_id>
```

## 📁 Proje Yapısı

```
lib/
├── main.dart                    # Ana uygulama dosyası
├── models/
│   ├── ogrenci.dart            # Öğrenci ve İşlem modelleri
│   └── urun.dart               # Ürün, Sepet ve Kategori modelleri
├── services/
│   └── veri_yoneticisi.dart   # Firebase ve offline veri yönetimi
└── data/
    └── urunler.dart            # Ürün ve kategori verileri
```

## 🔧 Yapılandırma

### Firebase Firestore Koleksiyonları

**ogrenciler**
```json
{
  "kartID": "string",
  "adSoyad": "string",
  "sinif": "string",
  "bakiye": number,
  "islemGecmisi": []
}
```

**istatistikler/urunSatislari**
```json
{
  "UrunIsmi": satisAdedi
}
```

## 💡 Kullanım

### Öğrenci İşlemleri
1. Ana ekranda kategori seçin
2. Ürünleri sepete ekleyin
3. "KART İLE ÖDE" butonuna tıklayın
4. Kartınızı okutun
5. Ödeme onayını bekleyin

### Admin İşlemleri
1. Admin kartını (3539442829) okutun
2. Şifre girin (varsayılan: 1234)
3. Öğrenci ekleyin veya bakiye yükleyin
4. İstatistikleri görüntüleyin

## 🌐 Offline Mod

Uygulama internet olmadan tam işlevseldir:
- Tüm ödeme işlemleri offline kaydedilir
- Bakiye sorgulamaları offline veriden yapılır
- İnternet bağlantısı kurulduğunda otomatik senkronizasyon
- Her 30 saniyede bir otomatik senkronizasyon denemesi

## 🐛 Sorun Giderme

### Kart Okuyucu Çalışmıyor
- USB OTG adaptörünün takılı olduğundan emin olun
- Kart okuyucu HID modunda olmalı
- Android izinlerini kontrol edin

### Firebase Bağlantı Hatası
- `google-services.json` dosyasının doğru konumda olduğundan emin olun
- Internet bağlantınızı kontrol edin
- Firebase Console'da proje ayarlarını kontrol edin

## 📝 Önemli Notlar

- **Timeout Ayarları**: Firebase işlemleri 2-3 saniye timeout ile sınırlıdır
- **Dialog Animasyonları**: Popup'lar arası 300ms bekleme süresi vardır
- **Offline Kuyruk**: Maksimum 100 offline işlem saklanır
- **Senkronizasyon**: Her 30 saniyede otomatik senkronizasyon

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Push edin (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 👨‍💻 Geliştirici

Mustafa İlhan - [@Mustafailhann](https://github.com/Mustafailhann)

## 🙏 Teşekkürler

- Flutter ekibine
- Firebase ekibine
- Tüm katkıda bulunanlara

---

⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!
