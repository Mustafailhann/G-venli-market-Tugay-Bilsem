// TypeScript type definitions for Veli Panel

import { Timestamp } from 'firebase/firestore';

export interface Veli {
    veliID: string;
    authID?: string; // Links to Firebase Auth UID
    adSoyad: string;
    telefonNo: string;
    email?: string;
    kayitTarihi: Timestamp;
    aktif: boolean;
    sifreDegistirmeZorunlu?: boolean; // New: Forced password change
    role?: 'admin' | 'veli'; // Yöneticileri belirlemek için rol eklendi
    unvan?: string; // Örn: 'Müdür', 'Müdür Yardımcısı'
}

export interface CocukTalebi {
    talepID: string;
    veliID: string;
    veliAdi: string;
    cocukAdi: string;
    sinif?: string;
    kartID?: string | null;
    durum: 'beklemede' | 'onaylandi' | 'reddedildi';
    olusturmaTarihi: Timestamp;
    onaylamaTarihi?: Timestamp;
    notlar?: string;
}

export interface Ogrenci {
    id: string; // Firestore Document ID
    kartID: string; // Physical Card Number (now optional/empty)
    adSoyad: string;
    sinif: string;
    bakiye: number;
    islemGecmisi: Islem[];
    veliIDleri?: string[]; // IDs of up to 2 parents
    veliTelefonlari?: string[]; // Phone numbers for easier lookup
    resimURL?: string; // Student photo URL in Firebase Storage
}

export interface Islem {
    tarih: Timestamp;
    tip: 'Bakiye Yükleme' | 'Ödeme' | 'Harcama';
    tutar: number;
    aciklama: string;
    urunler?: string[];
}

/** Flutter 'Harcama', Web 'Ödeme' — ikisini de harcama olarak kabul et. Ayrıca tutar negatifse de harcamadır. */
export function isHarcama(tip: string, tutar?: number): boolean {
    return tip === 'Ödeme' || tip === 'Harcama' || (tutar !== undefined && tutar < 0);
}

export interface CocukWithStatus extends CocukTalebi {
    ogrenciData?: Ogrenci;
}

export interface Urun {
    id: string; // Firestore Document ID
    ad: string;
    fiyat: number;
    resimURL?: string;
    kategori?: string;
    stok: number;
    olusturmaTarihi: Timestamp;
}
