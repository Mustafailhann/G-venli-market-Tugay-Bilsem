import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Bu endpoint bir kez çalıştırılır, adminleri Firestore'a ekler.
// Güvenlik: sadece SECRET_KEY ile erişilebilir.

const SECRET = process.env.SETUP_SECRET || 'tugaybilsem2025';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== SECRET) {
        return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    try {
        // Firebase Admin SDK başlat
        if (!getApps().find(a => a.name === 'admin-setup')) {
            initializeApp({
                credential: cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
            }, 'admin-setup');
        }

        const adminApp = getApps().find(a => a.name === 'admin-setup')!;
        const adminDb = getFirestore(adminApp);

        const admins = [
            {
                telefonNo: '5056310572',
                adSoyad: 'Ali Demir',
                unvan: 'Müdür',
                role: 'admin',
                aktif: true,
                sifreDegistirmeZorunlu: true,
            },
            {
                telefonNo: '5054079537',
                adSoyad: 'Nuri Özen',
                unvan: 'Müdür Yardımcısı',
                role: 'admin',
                aktif: true,
                sifreDegistirmeZorunlu: true,
            },
        ];

        const results: string[] = [];

        for (const admin of admins) {
            // Mevcut kaydı kontrol et
            const snapshot = await adminDb
                .collection('veliler')
                .where('telefonNo', '==', admin.telefonNo)
                .get();

            if (!snapshot.empty) {
                // Güncelle
                const docRef = snapshot.docs[0].ref;
                await docRef.update({
                    adSoyad: admin.adSoyad,
                    unvan: admin.unvan,
                    role: admin.role,
                    aktif: admin.aktif,
                });
                results.push(`✅ Güncellendi: ${admin.adSoyad} (${admin.unvan})`);
            } else {
                // Yeni ekle
                const newRef = adminDb.collection('veliler').doc();
                await newRef.set({
                    veliID: newRef.id,
                    ...admin,
                    kayitTarihi: new Date(),
                });
                results.push(`✅ Eklendi: ${admin.adSoyad} (${admin.unvan})`);
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
