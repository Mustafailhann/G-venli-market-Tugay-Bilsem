'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOgrenci } from '@/lib/firestore';
import { getParentsByIds, addKartUcreti, addStudentBalance, setStudentBalance } from '@/lib/admin';
import { Ogrenci, Veli, Islem, KartUcreti, isHarcama } from '@/types';
import Card from '@/components/ui/Card';
import BalanceModal from '@/components/admin/BalanceModal';
import PhotoModal from '@/components/admin/PhotoModal';

export default function AdminPersonelDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [ogrenci, setOgrenci] = useState<Ogrenci | null>(null);
    const [veliler, setVeliler] = useState<Veli[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentID, setStudentID] = useState<string | null>(null);
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<{ path: string, timestamp: string } | null>(null);

    useEffect(() => {
        params.then(p => setStudentID(p.id));
    }, [params]);

    const fetchData = async (id: string) => {
        const data = await getOgrenci(id);
        setOgrenci(data);
        if (data?.veliIDleri && data.veliIDleri.length > 0) {
            const parentData = await getParentsByIds(data.veliIDleri);
            setVeliler(parentData);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!studentID) return;
        fetchData(studentID);
    }, [studentID]);

    // ---- Balance Modal Handlers ----
    const handleConfirmAdd = async (amount: number) => {
        if (!studentID) return;
        const result = await addStudentBalance(studentID, amount);
        if (result.success) {
            alert('Bakiye başarıyla yüklendi.');
            fetchData(studentID);
        } else {
            alert('Hata: ' + result.error);
        }
    };

    const handleSetBalance = async (newBalance: number) => {
        if (!studentID || !ogrenci) return;
        const result = await setStudentBalance(studentID, newBalance, ogrenci.bakiye || 0);
        if (result.success) {
            alert('Bakiye başarıyla güncellendi.');
            fetchData(studentID);
        } else {
            alert('Hata: ' + result.error);
        }
    };

    const handleKartUcreti = async (tutar: number) => {
        if (!studentID) return;
        const result = await addKartUcreti(studentID, tutar);
        if (result.success) {
            alert('Kart ücreti başarıyla kaydedildi.');
            fetchData(studentID);
        } else {
            alert('Hata: ' + result.error);
        }
    };

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
                    <p className="text-gray-600 mb-4">Personel bulunamadı</p>
                    <Link href="/admin/personeller" className="text-blue-600 hover:underline">
                        ← Listeye dön
                    </Link>
                </div>
            </div>
        );
    }

    // ---- Veri Ayırma ----
    const islemler: Islem[] = [...(ogrenci.islemGecmisi || [])].sort(
        (a, b) => b.tarih.toMillis() - a.tarih.toMillis()
    );
    const yuklemeler = islemler.filter(i => !isHarcama(i.tip, i.tutar));
    const harcamalar = islemler.filter(i => isHarcama(i.tip, i.tutar));
    const kartUcretleri: KartUcreti[] = [...(ogrenci.kartUcretiGecmisi || [])].sort(
        (a, b) => b.tarih.toMillis() - a.tarih.toMillis()
    );

    const toplamYukleme = yuklemeler.reduce((s, i) => s + Math.abs(i.tutar), 0);
    const toplamHarcama = harcamalar.reduce((s, i) => s + Math.abs(i.tutar), 0);
    const toplamKartUcreti = ogrenci.toplamKartUcreti ?? 0;
    const kartUcretiSayisi = kartUcretleri.length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="container-custom py-6 px-8">
                    <Link
                        href="/admin/personeller"
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4 group"
                    >
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Geri Dön
                    </Link>

                    <div className="flex items-start justify-between gap-6">
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
                                <div className="flex flex-wrap gap-3 mt-2 text-gray-600">
                                    <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-medium">
                                        Unvan / Branş: {ogrenci.unvan || ogrenci.sinif || '-'}
                                    </span>
                                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${ogrenci.bakiye < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        Bakiye: {ogrenci.bakiye.toFixed(2)} ₺
                                    </span>
                                    {toplamKartUcreti > 0 && (
                                        <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-sm font-semibold">
                                            Kart Ücreti: {toplamKartUcreti.toFixed(2)} ₺
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bakiye Yönet Butonu */}
                        <button
                            onClick={() => setIsBalanceModalOpen(true)}
                            className="flex-shrink-0 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            💳 Bakiye Yönet
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container-custom py-8 px-8 space-y-8">
                {/* Parents Info Removed */}

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Toplam Yükleme</div>
                        <div className="text-2xl font-bold text-green-600">+{toplamYukleme.toFixed(2)} ₺</div>
                        <div className="text-xs text-gray-400 mt-1">{yuklemeler.length} işlem</div>
                    </Card>
                    <Card>
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Toplam Harcama</div>
                        <div className="text-2xl font-bold text-red-600">-{toplamHarcama.toFixed(2)} ₺</div>
                        <div className="text-xs text-gray-400 mt-1">{harcamalar.length} işlem</div>
                    </Card>
                    <Card>
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Kart Ücreti</div>
                        <div className="text-2xl font-bold text-amber-600">{toplamKartUcreti.toFixed(2)} ₺</div>
                        <div className="text-xs text-gray-400 mt-1">{kartUcretiSayisi} kart</div>
                    </Card>
                    <Card>
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Güncel Bakiye</div>
                        <div className={`text-2xl font-bold ${ogrenci.bakiye < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {ogrenci.bakiye.toFixed(2)} ₺
                        </div>
                        <div className="text-xs text-gray-400 mt-1">&nbsp;</div>
                    </Card>
                </div>

                {/* ─── Üçlü Tablo ─── */}
                <div className="grid lg:grid-cols-3 gap-6">

                    {/* 1. YÜKLEMELER */}
                    <Card>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-800">Yüklemeler</h2>
                                <p className="text-xs text-gray-400">{yuklemeler.length} kayıt</p>
                            </div>
                        </div>

                        {yuklemeler.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">Yükleme kaydı yok.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {yuklemeler.map((islem, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-green-50 border border-green-100">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-500 mb-0.5">
                                                    {islem.tarih.toDate().toLocaleString('tr-TR')}
                                                </p>
                                                <p className="text-sm text-gray-700 truncate">{islem.aciklama}</p>
                                            </div>
                                            <span className="text-sm font-bold text-green-600 ml-2 flex-shrink-0">
                                                +{Math.abs(islem.tutar).toFixed(2)} ₺
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* 2. HARCAMALAR */}
                    <Card>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-800">Harcamalar</h2>
                                <p className="text-xs text-gray-400">{harcamalar.length} kayıt</p>
                            </div>
                        </div>

                        {harcamalar.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">Harcama kaydı yok.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {harcamalar.map((islem, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-100">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-500 mb-0.5">
                                                    {islem.tarih.toDate().toLocaleString('tr-TR')}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm text-gray-700 truncate">{islem.aciklama}</p>
                                                    {islem.islemFotografi ? (
                                                        <button 
                                                            onClick={() => setSelectedPhoto({ 
                                                                path: islem.islemFotografi!, 
                                                                timestamp: islem.tarih.toDate().toLocaleString('tr-TR') 
                                                            })}
                                                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                            title="İşlem Fotoğrafı"
                                                        >
                                                            📷
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            disabled
                                                            className="p-1 text-gray-300 cursor-not-allowed"
                                                            title="Bu işlem için fotoğraf kaydedilmemiş (Eski işlem)"
                                                        >
                                                            📷
                                                        </button>
                                                    )}
                                                </div>
                                                {islem.urunler && islem.urunler.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {islem.urunler.map((urun, j) => (
                                                            <span key={j} className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                                                {urun}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-sm font-bold text-red-600 ml-2 flex-shrink-0">
                                                -{Math.abs(islem.tutar).toFixed(2)} ₺
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* 3. KART ÜCRETLERİ */}
                    <Card>
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-800">Kart Ücretleri</h2>
                                <p className="text-xs text-gray-400">{kartUcretleri.length} kart</p>
                            </div>
                        </div>

                        {kartUcretleri.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">Kart ücreti kaydı yok.</p>
                                <p className="text-gray-400 text-xs mt-1">Bakiye Yönet → Yeni Kart</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {kartUcretleri.map((ku, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-500 mb-0.5">
                                                    {ku.tarih.toDate().toLocaleString('tr-TR')}
                                                </p>
                                                <p className="text-sm font-semibold text-amber-800">{ku.aciklama}</p>
                                            </div>
                                            <span className="text-sm font-bold text-amber-600 ml-2 flex-shrink-0">
                                                {ku.tutar.toFixed(2)} ₺
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Toplam footer */}
                        {kartUcretleri.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-amber-200 flex justify-between items-center">
                                <span className="text-xs text-gray-500 font-medium">Kümülatif Toplam</span>
                                <span className="text-sm font-bold text-amber-700">{toplamKartUcreti.toFixed(2)} ₺</span>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Balance Modal */}
            <BalanceModal
                isOpen={isBalanceModalOpen}
                onClose={() => setIsBalanceModalOpen(false)}
                onConfirm={handleConfirmAdd}
                onSetBalance={handleSetBalance}
                onKartUcreti={handleKartUcreti}
                studentName={ogrenci.adSoyad}
                currentBalance={ogrenci.bakiye}
                toplamKartUcreti={toplamKartUcreti}
                kartUcretiSayisi={kartUcretiSayisi}
            />

            {/* Photo Modal */}
            <PhotoModal 
                isOpen={!!selectedPhoto}
                onClose={() => setSelectedPhoto(null)}
                photoPath={selectedPhoto?.path || ''}
                timestamp={selectedPhoto?.timestamp}
            />
        </div>
    );
}
