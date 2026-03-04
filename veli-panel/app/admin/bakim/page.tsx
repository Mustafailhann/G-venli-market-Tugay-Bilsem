'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

export default function MaintenancePage() {
    const [status, setStatus] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const deleteCardNumbers = async () => {
        if (!confirm('TÜM öğrencilerin Kart Numaralarını (kartID alanını) silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;

        setIsProcessing(true);
        setStatus('İşlem başlıyor...');

        try {
            const batch = writeBatch(db);
            const q = collection(db, 'ogrenciler');
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setStatus('Hiç öğrenci bulunamadı.');
                setIsProcessing(false);
                return;
            }

            let count = 0;
            snapshot.docs.forEach((studentDoc) => {
                const ref = doc(db, 'ogrenciler', studentDoc.id);
                // Update specific field only
                batch.update(ref, {
                    kartID: '' // Clearing the field
                });
                count++;
            });

            await batch.commit();
            setStatus(`Başarılı! ${count} öğrencinin kart numarası silindi.`);
        } catch (error: any) {
            console.error(error);
            setStatus('Hata oluştu: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-10">
            <h1 className="text-2xl font-bold mb-6 text-red-600">Sistem Bakımı</h1>

            <div className="bg-white p-6 rounded-lg shadow border border-red-200">
                <h2 className="font-bold mb-2">Tehlikeli Bölge</h2>
                <p className="mb-4 text-gray-600">Bu işlem veri tabanındaki tüm öğrencilerin kart numaralarını temizler.</p>

                <button
                    onClick={deleteCardNumbers}
                    disabled={isProcessing}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                    {isProcessing ? 'İşleniyor...' : 'Tüm Kart Numaralarını Sil'}
                </button>

                {status && (
                    <div className="mt-4 p-3 bg-gray-100 rounded text-sm font-mono whitespace-pre-wrap">
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}
