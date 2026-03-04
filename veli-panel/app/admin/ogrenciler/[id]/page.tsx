'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getOgrenci } from '@/lib/firestore';
import { getParentsByIds } from '@/lib/admin';
import { Ogrenci, Veli, isHarcama } from '@/types';
import Card from '@/components/ui/Card';

export default function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [ogrenci, setOgrenci] = useState<Ogrenci | null>(null);
    const [veliler, setVeliler] = useState<Veli[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentID, setStudentID] = useState<string | null>(null);
    const [filter, setFilter] = useState<'week' | 'month' | 'all'>('week');

    useEffect(() => {
        params.then(p => setStudentID(p.id));
    }, [params]);

    useEffect(() => {
        async function fetchData() {
            if (!studentID) return;

            const data = await getOgrenci(studentID);
            setOgrenci(data);

            // Fetch parents
            if (data?.veliIDleri && data.veliIDleri.length > 0) {
                const parentData = await getParentsByIds(data.veliIDleri);
                setVeliler(parentData);
            }

            setLoading(false);
        }

        fetchData();
    }, [studentID]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (!ogrenci) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">Öğrenci bulunamadı</p>
                    <Link href="/admin/ogrenciler" className="text-blue-600 hover:underline">
                        ← Listeye dön
                    </Link>
                </div>
            </div>
        );
    }

    // Filter transactions
    const now = new Date();
    // Ensure islemGecmisi exists
    const islemler = ogrenci.islemGecmisi || [];

    const filteredIslemler = islemler.filter(islem => {
        const islemDate = islem.tarih.toDate();
        if (filter === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return islemDate >= weekAgo;
        } else if (filter === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return islemDate >= monthAgo;
        }
        return true;
    });

    // Sort by date descending
    filteredIslemler.sort((a, b) => b.tarih.toMillis() - a.tarih.toMillis());

    const toplamHarcama = filteredIslemler
        .filter(i => isHarcama(i.tip, i.tutar))
        .reduce((sum, islem) => sum + Math.abs(islem.tutar), 0);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="container-custom py-6 px-8">
                    <Link
                        href="/admin/ogrenciler"
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4 group"
                    >
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Geri Dön
                    </Link>

                    <div className="flex items-start gap-6">
                        {/* Student Photo */}
                        <div className="flex-shrink-0">
                            {ogrenci.resimURL ? (
                                <img
                                    src={ogrenci.resimURL}
                                    alt={ogrenci.adSoyad}
                                    className="w-24 h-24 rounded-2xl object-cover border-2 border-gray-200 shadow-sm"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-2 border-gray-200">
                                    <span className="text-3xl font-bold text-blue-600">
                                        {ogrenci.adSoyad.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Student Info */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900">{ogrenci.adSoyad}</h1>
                            <div className="flex gap-4 mt-2 text-gray-600">
                                <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-medium">Sınıf: {ogrenci.sinif}</span>
                                <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-medium">Bakiye: <span className={ogrenci.bakiye < 0 ? 'text-red-600' : 'text-green-600'}>{ogrenci.bakiye.toFixed(2)} ₺</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container-custom py-8 px-8">
                {/* Parent Info */}
                {veliler.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        {veliler.map((veli, index) => (
                            <Card key={veli.veliID}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                                            {index === 0 ? 'Anne' : 'Baba'}
                                        </div>
                                        <div className="font-semibold text-gray-900">{veli.adSoyad || 'İsim girilmemiş'}</div>
                                        <div className="text-sm text-gray-600 flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            {veli.telefonNo || 'Telefon girilmemiş'}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
                {/* Stats */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <Card>
                        <div className="text-sm text-gray-600 mb-1">Dönem Harcaması ({filter === 'week' ? 'Son 7 Gün' : filter === 'month' ? 'Son 30 Gün' : 'Tümü'})</div>
                        <div className="text-3xl font-bold text-gray-900">{toplamHarcama.toFixed(2)} ₺</div>
                    </Card>
                    <Card>
                        <div className="text-sm text-gray-600 mb-1">İşlem Adedi</div>
                        <div className="text-3xl font-bold text-gray-900">{filteredIslemler.length}</div>
                    </Card>
                </div>

                {/* Transaction History */}
                <Card>
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                        <h2 className="text-xl font-bold text-gray-800">İşlem Geçmişi</h2>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setFilter('week')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'week'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Bu Hafta
                            </button>
                            <button
                                onClick={() => setFilter('month')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'month'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Bu Ay
                            </button>
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Tümü
                            </button>
                        </div>
                    </div>

                    {filteredIslemler.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-500">Bu dönemde işlem kaydı bulunmamaktadır.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden bg-white border border-gray-100 rounded-xl">
                            <div className="grid grid-cols-1 divide-y divide-gray-100">
                                {filteredIslemler.map((islem, index) => (
                                    <div
                                        key={index}
                                        className="p-4 hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${isHarcama(islem.tip, islem.tutar)
                                                            ? 'bg-red-50 text-red-700'
                                                            : 'bg-green-50 text-green-700'
                                                        }`}>
                                                        {isHarcama(islem.tip, islem.tutar) ? 'Harcama' : 'Yükleme'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(islem.tarih.toDate()).toLocaleString('tr-TR')}
                                                    </span>
                                                </div>

                                                <p className="text-gray-900 font-medium">
                                                    {islem.aciklama}
                                                </p>

                                                {/* Products List - THIS IS WHAT WAS MISSING */}
                                                {islem.urunler && islem.urunler.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {islem.urunler.map((urun, i) => (
                                                            <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                                                                {urun}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`text-lg font-bold ml-4 ${isHarcama(islem.tip, islem.tutar) ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                {isHarcama(islem.tip, islem.tutar) ? '-' : '+'}{Math.abs(islem.tutar).toFixed(2)} ₺
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
