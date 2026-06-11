# Veli Web Paneli

Okul Otomat sistemi için velilerin çocuklarının alışveriş geçmişini takip edebileceği web paneli.

## 🚀 Özellikler

- ✅ Veli kayıt ve giriş sistemi (Firebase Auth)
- 👨‍👩‍👧 Çoklu çocuk desteği
- ⏳ Beklemede/Onaylı durumu ile çocuk yönetimi
- 💰 Anlık bakiye görüntüleme
- 📊 Alışveriş geçmişi ve harcama takibi
- 📱 Responsive tasarım (mobil uyumlu)

## 🛠️ Teknolojiler

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Deployment:** Netlify
- **Form Handling:** React Hook Form
- **Validation:** Zod

## 📁 Proje Yapısı

```
veli-panel/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── kayit/             # Kayıt sayfası
│   ├── giris/             # Giriş sayfası
│   ├── dashboard/         # Dashboard
│   └── cocuk/[kartID]/    # Çocuk detay sayfası
├── components/            # React components
│   ├── ui/               # Temel UI bileşenleri
│   └── CocukCard.tsx     # Çocuk kartı
├── lib/                  # Utility functions
│   ├── firebase.ts       # Firebase config
│   ├── auth.ts           # Auth helpers
│   └── firestore.ts      # Firestore helpers
├── hooks/                # Custom React hooks
│   ├── useAuth.ts
│   └── useVeli.ts
└── types/                # TypeScript types
    └── index.ts
```

## 🔧 Kurulum

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Firebase yapılandırması:**
`.env.local` dosyası oluşturun ve Firebase bilgilerinizi ekleyin:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

3. **Development server'ı başlatın:**
```bash
npm run dev
```

4. **Tarayıcıda açın:**
```
http://localhost:3000
```

## 🌐 Netlify'ye Deploy

1. **Netlify'de yeni site oluşturun**
2. **GitHub repository'nizi bağlayın**
3. **Environment variables'ları ayarlayın** (Firebase config)
4. **Deploy butonuna tıklayın**

Alternatif olarak Netlify CLI ile:
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## 📊 Veritabanı Şeması

### `veliler` Collection
```typescript
{
  veliID: string;
  adSoyad: string;
  telefonNo: string;
  email: string;
  kayitTarihi: Timestamp;
  aktif: boolean;
}
```

### `cocukTalepleri` Collection
```typescript
{
  talepID: string;
  veliID: string;
  veliAdi: string;
  cocukAdi: string;
  sinif?: string;
  kartID?: string | null;
  durum: 'beklemede' | 'onaylandi' | 'reddedildi';
  olusturmaTarihi: Timestamp;
  onaylamaTarihi?: Timestamp;
}
```

## 🔐 Firebase Security Rules

Firebase Console'da aşağıdaki güvenlik kurallarını ayarlayın:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Veli collection
    match /veliler/{veliID} {
      allow read: if request.auth != null && request.auth.uid == veliID;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid == veliID;
    }
    
    // Cocuk Talepleri collection
    match /cocukTalepleri/{talepID} {
      allow read, create: if request.auth != null;
      allow update: if request.auth != null; // Admin'den de güncellenebilir
    }
    
    // Ogrenciler collection (readonly for veliler)
    match /ogrenciler/{kartID} {
      allow read: if request.auth != null;
    }
  }
}
```

## 👤 Kullanım

1. **Kayıt Olun:** Ana sayfadan "Kayıt Ol" butonuna tıklayın
2. **Veli Bilgilerini Girin:** Ad-soyad, email, şifre
3. **Çocuklarınızı Ekleyin:** Çocukların ad-soyadlarını girin
4. **Onay Bekleyin:** Okul admin'i kart ID'lerini atayacak
5. **Takip Edin:** Dashboard'dan çocuklarınızın harcamalarını görün

## 📱 Mobil Uyumluluk

Web paneli tamamen responsive tasarıma sahiptir ve tüm cihazlarda sorunsuz çalışır:
- 📱 Mobil telefonlar
- 💻 Tabletler
- 🖥️ Masaüstü bilgisayarlar

## 🤝 İletişim

Sorularınız için: [okul-otomat-support@example.com](mailto:okul-otomat-support@example.com)

---

**Not:** Bu proje, mevcut Flutter mobil otomat uygulaması ile birlikte çalışmak üzere tasarlanmıştır.
