'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

export default function MaintenancePage() {
    const [status, setStatus] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeOp, setActiveOp] = useState('');

    const deleteCardNumbers = async () => {
        if (!confirm('TÜM öğrencilerin Kart Numaralarını (kartID alanını) silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
        setIsProcessing(true);
        setActiveOp('kart');
        setStatus('İşlem başlıyor...');
        try {
            const snapshot = await getDocs(collection(db, 'ogrenciler'));
            if (snapshot.empty) { setStatus('Hiç öğrenci bulunamadı.'); return; }
            const batch = writeBatch(db);
            snapshot.docs.forEach((studentDoc) => {
                batch.update(doc(db, 'ogrenciler', studentDoc.id), { kartID: '' });
            });
            await batch.commit();
            setStatus(`✅ Başarılı! ${snapshot.size} öğrencinin kart numarası silindi.`);
        } catch (error: any) {
            setStatus('❌ Hata: ' + error.message);
        } finally {
            setIsProcessing(false);
            setActiveOp('');
        }
    };

    const deleteAllTransactions = async () => {
        if (!confirm('⚠️ TÜM öğrencilerin işlem geçmişi silinecek!\n\nBu işlem GERİ ALINAMAZ. Günlük, haftalık ve aylık ciro sıfırlanacak.\n\nDevam etmek istiyor musunuz?')) return;
        setIsProcessing(true);
        setActiveOp('islem');
        setStatus('İşlem geçmişleri temizleniyor...');
        try {
            const snapshot = await getDocs(collection(db, 'ogrenciler'));
            if (snapshot.empty) { setStatus('Hiç öğrenci bulunamadı.'); return; }

            // Firestore batch max 500 doc — chunk into groups
            const batchSize = 400;
            let count = 0;
            for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                const chunk = snapshot.docs.slice(i, i + batchSize);
                const batch = writeBatch(db);
                chunk.forEach((studentDoc) => {
                    batch.update(doc(db, 'ogrenciler', studentDoc.id), {
                        islemGecmisi: []
                    });
                    count++;
                });
                await batch.commit();
                setStatus(`İşleniyor... ${count}/${snapshot.size} öğrenci tamamlandı`);
            }
            setStatus(`✅ Başarılı! ${count} öğrencinin tüm işlem geçmişi silindi.\nGünlük, haftalık ve aylık ciro artık 0.00 ₺ gösterecek.`);
        } catch (error: any) {
            setStatus('❌ Hata: ' + error.message);
        } finally {
            setIsProcessing(false);
            setActiveOp('');
        }
    };

    return (
        <div className="p-10 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6 text-red-600">⚙️ Sistem Bakımı</h1>

            {/* İşlem Geçmişi Sil */}
            <div className="bg-white p-6 rounded-xl shadow border border-orange-300 mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🗑️</span>
                    <h2 className="font-bold text-lg text-orange-700">Tüm İşlem Geçmişini Sil</h2>
                </div>
                <p className="mb-2 text-gray-600 text-sm">
                    Tüm öğrencilerin satış / bakiye yükleme işlem geçmişini temizler.
                </p>
                <ul className="text-sm text-gray-500 mb-4 list-disc list-inside space-y-1">
                    <li>Günlük ciro → <strong>0.00 ₺</strong></li>
                    <li>Haftalık ciro → <strong>0.00 ₺</strong></li>
                    <li>Aylık ciro → <strong>0.00 ₺</strong></li>
                    <li>Öğrenci bakiyeleri <strong>değişmez</strong></li>
                </ul>
                <button
                    onClick={deleteAllTransactions}
                    disabled={isProcessing}
                    className="bg-orange-600 text-white px-5 py-2.5 rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium transition-colors"
                >
                    {isProcessing && activeOp === 'islem' ? '⏳ İşleniyor...' : '🗑️ Tüm İşlem Geçmişini Sil'}
                </button>
            </div>

            {/* Kart Numarası Sil */}
            <div className="bg-white p-6 rounded-xl shadow border border-red-200 mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">💳</span>
                    <h2 className="font-bold text-lg text-red-700">Tüm Kart Numaralarını Sil</h2>
                </div>
                <p className="mb-4 text-gray-600 text-sm">
                    Tüm öğrencilerin kart ID alanını temizler. Öğrenci ve bakiye bilgileri korunur.
                </p>
                <button
                    onClick={deleteCardNumbers}
                    disabled={isProcessing}
                    className="bg-red-600 text-white px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
                >
                    {isProcessing && activeOp === 'kart' ? '⏳ İşleniyor...' : '💳 Tüm Kart Numaralarını Sil'}
                </button>
            </div>

            {status && (
                <div className={`mt-4 p-4 rounded-xl text-sm font-mono whitespace-pre-wrap ${status.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : status.startsWith('❌') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-700'}`}>
                    {status}
                </div>
            )}
        </div>
    );
}
