'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOgrenci } from '@/lib/firestore';
import { getParentsByIds, addKartUcreti, addStudentBalance, setStudentBalance, cancelIslem, cancelKartUcreti } from '@/lib/admin';
import { Ogrenci, Veli, Islem, KartUcreti, isHarcama } from '@/types';
import Card from '@/components/ui/Card';
import BalanceModal from '@/components/admin/BalanceModal';
import PhotoModal from '@/components/admin/PhotoModal';

// ─── Confirmation Modal ───────────────────────────────────────────────────────
interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
    loading?: boolean;
}

function ConfirmModal({ isOpen, title, message, onConfirm, onClose, loading }: ConfirmModalProps) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
                <div className="p-6">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                    </div>
                    <h3 className="mb-1 text-lg font-bold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500">{message}</p>
                </div>
                <div className="flex gap-3 border-t border-gray-100 p-4">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                    >
                        {loading ? 'İşleniyor...' : 'Evet, İptal Et'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [ogrenci, setOgrenci] = useState<Ogrenci | null>(null);
    const [veliler, setVeliler] = useState<Veli[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentID, setStudentID] = useState<string | null>(null);
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<{ path: string, timestamp: string } | null>(null);

    // Cancel modal state
    const [cancelTarget, setCancelTarget] = useState<
        | { type: 'islem'; index: number; label: string; tutar: number; tip: string }
        | { type: 'kart'; index: number; label: string; tutar: number }
        | null
    >(null);
    const [cancelLoading, setCancelLoading] = useState(false);

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

    // ---- Cancel Handler ----
    const handleCancelConfirm = async () => {
        if (!studentID || !cancelTarget) return;
        setCancelLoading(true);
        try {
            let result;
            if (cancelTarget.type === 'islem') {
                result = await cancelIslem(studentID, cancelTarget.index);
            } else {
                result = await cancelKartUcreti(studentID, cancelTarget.index);
            }
            if (result.success) {
                setCancelTarget(null);
                fetchData(studentID);
            } else {
                alert('Hata: ' + result.error);
            }
        } finally {
            setCancelLoading(false);
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
                    <p className="text-gray-600 mb-4">Öğrenci bulunamadı</p>
                    <Link href="/admin/ogrenciler" className="text-blue-600 hover:underline">
                        ← Listeye dön
                    </Link>
                </div>
            </div>
        );
    }

    // ---- Veri Ayırma ----
    // We use original array indices for cancellation, so we zip each item with its original index.
    const rawIslemler = ogrenci.islemGecmisi || [];
    const islemlerWithIdx = rawIslemler
        .map((item, idx) => ({ item, idx }))
        .sort((a, b) => b.item.tarih.toMillis() - a.item.tarih.toMillis());

    const yuklemelerWithIdx = islemlerWithIdx.filter(({ item }) => !isHarcama(item.tip, item.tutar));
    const harcamalarWithIdx = islemlerWithIdx.filter(({ item }) => isHarcama(item.tip, item.tutar));

    const rawKartUcretleri = ogrenci.kartUcretiGecmisi || [];
    const kartUcretleriWithIdx = rawKartUcretleri
        .map((item, idx) => ({ item, idx }))
        .sort((a, b) => b.item.tarih.toMillis() - a.item.tarih.toMillis());

    const toplamYukleme = yuklemelerWithIdx.filter(({ item }) => !item.isCancelled).reduce((s, { item }) => s + Math.abs(item.tutar), 0);
    const toplamHarcama = harcamalarWithIdx.filter(({ item }) => !item.isCancelled).reduce((s, { item }) => s + Math.abs(item.tutar), 0);
    const toplamKartUcreti = ogrenci.toplamKartUcreti ?? 0;
    const kartUcretiSayisi = kartUcretleriWithIdx.length;

    // ─── Cancel Modal description ───
    let cancelModalMessage = '';
    if (cancelTarget) {
        if (cancelTarget.type === 'islem') {
            const isDeposit = !isHarcama(cancelTarget.tip, cancelTarget.tutar);
            const effect = isDeposit
                ? `Bakiyeden ${Math.abs(cancelTarget.tutar).toFixed(2)} ₺ düşülecek.`
                : `Bakiyeye ${Math.abs(cancelTarget.tutar).toFixed(2)} ₺ iade edilecek.`;
            cancelModalMessage = `"${cancelTarget.label}" kaydı iptal edilecek. ${effect} Bu işlem geri alınamaz.`;
        } else {
            cancelModalMessage = `"${cancelTarget.label}" kart ücreti iptal edilecek. Toplam kart ücretinden ${cancelTarget.tutar.toFixed(2)} ₺ düşülecek.`;
        }
    }

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
                                        Sınıf: {ogrenci.sinif}
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
                {/* Parent Info */}
                {veliler.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-6">
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

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Toplam Yükleme</div>
                        <div className="text-2xl font-bold text-green-600">+{toplamYukleme.toFixed(2)} ₺</div>
                        <div className="text-xs text-gray-400 mt-1">{yuklemelerWithIdx.length} işlem</div>
                    </Card>
                    <Card>
                        <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Toplam Harcama</div>
                        <div className="text-2xl font-bold text-red-600">-{toplamHarcama.toFixed(2)} ₺</div>
                        <div className="text-xs text-gray-400 mt-1">{harcamalarWithIdx.length} işlem</div>
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
                                <p className="text-xs text-gray-400">{yuklemelerWithIdx.length} kayıt</p>
                            </div>
                        </div>

                        {yuklemelerWithIdx.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">Yükleme kaydı yok.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {yuklemelerWithIdx.map(({ item: islem, idx }) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg border transition-opacity ${
                                            islem.isCancelled
                                                ? 'bg-gray-100 border-gray-200 opacity-60'
                                                : 'bg-green-50 border-green-100'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-500 mb-0.5">
                                                    {islem.tarih.toDate().toLocaleString('tr-TR')}
                                                </p>
                                                <p className={`text-sm text-gray-700 truncate ${islem.isCancelled ? 'line-through text-gray-400' : ''}`}>
                                                    {islem.aciklama}
                                                </p>
                                                {islem.isCancelled && (
                                                    <span className="inline-block mt-1 text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                                        İptal Edildi
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <span className={`text-sm font-bold ${islem.isCancelled ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                                                    +{Math.abs(islem.tutar).toFixed(2)} ₺
                                                </span>
                                                {!islem.isCancelled && (
                                                    <button
                                                        onClick={() => setCancelTarget({
                                                            type: 'islem',
                                                            index: idx,
                                                            label: islem.aciklama,
                                                            tutar: islem.tutar,
                                                            tip: islem.tip
                                                        })}
                                                        className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="İptal Et"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
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
                                <p className="text-xs text-gray-400">{harcamalarWithIdx.length} kayıt</p>
                            </div>
                        </div>

                        {harcamalarWithIdx.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">Harcama kaydı yok.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {harcamalarWithIdx.map(({ item: islem, idx }) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg border transition-opacity ${
                                            islem.isCancelled
                                                ? 'bg-gray-100 border-gray-200 opacity-60'
                                                : 'bg-red-50 border-red-100'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-500 mb-0.5">
                                                    {islem.tarih.toDate().toLocaleString('tr-TR')}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm text-gray-700 truncate ${islem.isCancelled ? 'line-through text-gray-400' : ''}`}>
                                                        {islem.aciklama}
                                                    </p>
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
                                                        <button disabled className="p-1 text-gray-300 cursor-not-allowed" title="Bu işlem için fotoğraf kaydedilmemiş (Eski işlem)">
                                                            📷
                                                        </button>
                                                    )}
                                                </div>
                                                {islem.isCancelled && (
                                                    <span className="inline-block mt-1 text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                                        İptal Edildi
                                                    </span>
                                                )}
                                                {islem.urunler && islem.urunler.length > 0 && (
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {islem.urunler.map((urunEntry, j) => {
                                                            const label = typeof urunEntry === 'object' && urunEntry !== null
                                                                ? `${(urunEntry as import('@/types').UrunKalemi).ad} (x${(urunEntry as import('@/types').UrunKalemi).miktar})`
                                                                : String(urunEntry);
                                                            return (
                                                                <span key={j} className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                                                    {label}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <span className={`text-sm font-bold ${islem.isCancelled ? 'text-gray-400 line-through' : 'text-red-600'}`}>
                                                    -{Math.abs(islem.tutar).toFixed(2)} ₺
                                                </span>
                                                {!islem.isCancelled && (
                                                    <button
                                                        onClick={() => setCancelTarget({
                                                            type: 'islem',
                                                            index: idx,
                                                            label: islem.aciklama,
                                                            tutar: islem.tutar,
                                                            tip: islem.tip
                                                        })}
                                                        className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="İptal Et"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
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
                                <p className="text-xs text-gray-400">{kartUcretleriWithIdx.length} kart</p>
                            </div>
                        </div>

                        {kartUcretleriWithIdx.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">Kart ücreti kaydı yok.</p>
                                <p className="text-gray-400 text-xs mt-1">Bakiye Yönet → Yeni Kart</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                                {kartUcretleriWithIdx.map(({ item: ku, idx }) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg border transition-opacity ${
                                            ku.isCancelled
                                                ? 'bg-gray-100 border-gray-200 opacity-60'
                                                : 'bg-amber-50 border-amber-100'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-500 mb-0.5">
                                                    {ku.tarih.toDate().toLocaleString('tr-TR')}
                                                </p>
                                                <p className={`text-sm font-semibold ${ku.isCancelled ? 'line-through text-gray-400' : 'text-amber-800'}`}>
                                                    {ku.aciklama}
                                                </p>
                                                {ku.isCancelled && (
                                                    <span className="inline-block mt-1 text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                                        İptal Edildi
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <span className={`text-sm font-bold ${ku.isCancelled ? 'text-gray-400 line-through' : 'text-amber-600'}`}>
                                                    {ku.tutar.toFixed(2)} ₺
                                                </span>
                                                {!ku.isCancelled && (
                                                    <button
                                                        onClick={() => setCancelTarget({
                                                            type: 'kart',
                                                            index: idx,
                                                            label: ku.aciklama,
                                                            tutar: ku.tutar
                                                        })}
                                                        className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="İptal Et"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Toplam footer */}
                        {kartUcretleriWithIdx.length > 0 && (
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

            {/* Cancel Confirmation Modal */}
            <ConfirmModal
                isOpen={!!cancelTarget}
                title="İşlemi İptal Et"
                message={cancelModalMessage}
                onConfirm={handleCancelConfirm}
                onClose={() => !cancelLoading && setCancelTarget(null)}
                loading={cancelLoading}
            />
        </div>
    );
}
