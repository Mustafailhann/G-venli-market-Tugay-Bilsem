'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ogrenci, Islem } from '@/types';
import { useRouter } from 'next/navigation';

export default function LegacyBackfillPage() {
    const router = useRouter();
    const [unlocked, setUnlocked] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // UI lists
    const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
    const [legacyCount, setLegacyCount] = useState(0);
    
    // Form State: Unit Cost per Product
    const [costMap, setCostMap] = useState<Record<string, number>>({});

    const PASSCODE = 'SUPERADMIN2026';

    // 1. Passcode Listener
    useEffect(() => {
        let sequence = '';
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            
            sequence = (sequence + e.key.toUpperCase()).slice(-PASSCODE.length);
            if (sequence === PASSCODE) {
                setUnlocked(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 2. Fetch Data Once Unlocked
    useEffect(() => {
        if (unlocked) {
            analyzeLegacyData();
        }
    }, [unlocked]);

    const analyzeLegacyData = async () => {
        setLoading(true);
        try {
            const studentsSnap = await getDocs(collection(db, 'ogrenciler'));
            const productsSet = new Set<string>();
            let lCount = 0;

            studentsSnap.forEach(docSnap => {
                const data = docSnap.data() as Ogrenci;
                const islemler = data.islemGecmisi || [];

                islemler.forEach(islem => {
                    // It must be an expense and it must NOT have toplamMaliyet
                    if (islem.isCancelled) return;
                    const isExpense = islem.tip === 'Ödeme' || islem.tip === 'Harcama' || (islem.tutar != null && islem.tutar < 0);
                    
                    if (isExpense && typeof islem.toplamMaliyet === 'undefined') {
                        lCount++;
                        if (islem.urunler && Array.isArray(islem.urunler)) {
                            islem.urunler.forEach((urunEntry) => {
                                // Backfill only processes legacy string records
                                if (typeof urunEntry !== 'string') return;
                                // Extract name via regex, ignoring "(x1)"
                                const match = urunEntry.match(/^(.+?)(?:\s*\(x\d+\))?$/);
                                if (match && match[1]) {
                                    productsSet.add(match[1].trim());
                                }
                            });
                        }
                    }
                });
            });

            setUniqueProducts(Array.from(productsSet).sort());
            setLegacyCount(lCount);

            // Initialize form state
            const initialMap: Record<string, number> = {};
            productsSet.forEach(p => initialMap[p] = 0);
            setCostMap(initialMap);

        } catch (error) {
            console.error(error);
            alert('Geçmiş veri analiz edilemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handleRunBackfill = async () => {
        if (legacyCount === 0) {
            alert('Güncellenecek eski kayıt yok!');
            return;
        }

        const confirmText = `Bu işlem ${legacyCount} adet eski işlemi kalıcı olarak güncelleyecektir. İşleme devam edilsin mi?`;
        if (!window.confirm(confirmText)) return;

        setIsProcessing(true);
        try {
            const studentsSnap = await getDocs(collection(db, 'ogrenciler'));
            let updatedStudentsCount = 0;
            let updatedTransactionsCount = 0;
            
            // Limit batches to 500 ops. We'll use multiple batches if necessary.
            let batch = writeBatch(db);
            let opCount = 0;
            let totalBatchesCommited = 0;

            for (const docSnap of studentsSnap.docs) {
                const studentId = docSnap.id;
                const data = docSnap.data() as Ogrenci;
                const islemler = data.islemGecmisi || [];
                let modified = false;

                const newIslemler = islemler.map(islem => {
                    if (islem.isCancelled) return islem;
                    const isExpense = islem.tip === 'Ödeme' || islem.tip === 'Harcama' || (islem.tutar != null && islem.tutar < 0);
                    
                    // IF purely legacy (lacks snapshot)
                    if (isExpense && typeof islem.toplamMaliyet === 'undefined') {
                        modified = true;
                        updatedTransactionsCount++;
                        
                        let totalCost = 0;
                        if (islem.urunler && Array.isArray(islem.urunler)) {
                            islem.urunler.forEach((urunEntry) => {
                                // Backfill only processes legacy string records
                                if (typeof urunEntry !== 'string') return;
                                const match = urunEntry.match(/^(.+?)(?:\s*\(x(\d+)\))?$/);
                                if (match && match[1]) {
                                    const pName = match[1].trim();
                                    const pQty = match[2] ? parseInt(match[2], 10) : 1;
                                    const pCost = costMap[pName] || 0;
                                    totalCost += (pCost * pQty);
                                }
                            });
                        }

                        return {
                            ...islem,
                            toplamMaliyet: parseFloat(totalCost.toFixed(2)) // Immutable Snapshot applied!
                        };
                    }
                    return islem;
                });

                if (modified) {
                    updatedStudentsCount++;
                    batch.update(doc(db, 'ogrenciler', studentId), { islemGecmisi: newIslemler });
                    opCount++;

                    if (opCount === 450) { // Keep safe limit below 500
                        await batch.commit();
                        batch = writeBatch(db);
                        opCount = 0;
                        totalBatchesCommited++;
                    }
                }
            }

            if (opCount > 0) {
                await batch.commit();
            }

            alert(`${updatedTransactionsCount} işlem başarıyla güncellendi!`);
            
            // Refresh
            await analyzeLegacyData();

        } catch (error) {
            console.error('Backfill Error:', error);
            alert('Güncelleme sırasında bir hata oluştu.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!unlocked) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 pb-20">
                <svg className="h-14 w-14 text-slate-700 opacity-50 transition-opacity hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="mt-6 text-sm font-bold tracking-[0.2em] text-slate-600 uppercase">Restricted Area</p>
                {/* Dev hint: Type SUPERADMIN2026 anywhere on screen */}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 pb-20 dark:bg-slate-900 sm:p-12">
            <div className="mx-auto max-w-4xl space-y-8">
                
                {/* Super Admin Red Banner */}
                <div className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-white shadow-sm ring-4 ring-red-600/20">
                    <svg className="h-5 w-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm font-black tracking-wide uppercase">SUPER ADMIN MODE: Modifying historical records globally.</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white sm:text-3xl">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">Eski Veri Düzeltme</span>
                        </h1>
                        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                            Geçmiş işlemlere ait SMM (Maliyet) değerlerini geri dönük olarak hesaplayın.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/admin/finans')}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        &larr; Finans Paneline Dön
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        
                        {/* Status Card */}
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-900/10">
                            <h2 className="text-lg font-bold text-amber-800 dark:text-amber-400">Eksik Maliyet Kayıtları: {legacyCount} adet işlem</h2>
                            <p className="mt-1 text-sm text-amber-700 dark:text-amber-500">
                                Bu işlemler sistem anlık SMM snapshot'ı almaya başlamadan önce kaydedilmiştir. 
                                Sistem, aşağıdaki ürünlerin geçmiş maliyetlerini girerek bunları kalıcı olarak onarmanıza olanak tanır.
                            </p>
                        </div>

                        {/* Cost Config Form */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
                                <h3 className="font-bold text-slate-800 dark:text-white">Ürün Base Maliyetleri (Bakiye Öncesi)</h3>
                            </div>
                            
                            {uniqueProducts.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">
                                    <span className="text-4xl">🎉</span>
                                    <p className="mt-4 font-bold">Harika! Geçmişe dönük eksik SMM kaydı kalmadı.</p>
                                </div>
                            ) : (
                                <div>
                                    <div className="grid grid-cols-1 gap-0 divide-y divide-slate-100 dark:divide-slate-700 sm:grid-cols-2 lg:grid-cols-3 sm:divide-x sm:divide-y-0">
                                        {uniqueProducts.map(product => (
                                            <div key={product} className="flex flex-col justify-between p-4 px-6 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    {product}
                                                </label>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-slate-400">₺</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={costMap[product] || ''}
                                                        onChange={(e) => setCostMap(prev => ({ ...prev, [product]: parseFloat(e.target.value) || 0 }))}
                                                        className="block w-full rounded-lg border-0 bg-slate-100 py-1.5 pl-3 pr-2 text-slate-900 shadow-inner ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-amber-500 sm:text-sm sm:leading-6 dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-slate-100 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
                                        <button
                                            onClick={handleRunBackfill}
                                            disabled={isProcessing}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-amber-600 focus:ring-4 focus:ring-amber-500/30 disabled:opacity-50 sm:w-auto"
                                        >
                                            {isProcessing ? (
                                                <svg className="h-5 w-5 animate-spin text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            ) : (
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                            )}
                                            {isProcessing ? 'Kayıtlar Onarılıyor...' : 'Eski Kayıtları Onar ve Kaydet'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
