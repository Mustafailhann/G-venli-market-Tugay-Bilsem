// Dashboard Page

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import CocukCard from '@/components/CocukCard';
import { useAuth } from '@/hooks/useAuth';
import { useVeli } from '@/hooks/useVeli';
import { isHarcama } from '@/types';
import { signOut, changeUserPassword } from '@/lib/auth';

export default function DashboardPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { veli, cocuklar, loading: dataLoading, refetch } = useVeli();

    // Password Change State
    const [showPasswordWarning, setShowPasswordWarning] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/giris');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (veli && veli.sifreDegistirmeZorunlu) {
            setShowPasswordWarning(true);
        }
    }, [veli]);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword.length < 6) {
            setPasswordError('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Şifreler eşleşmiyor.');
            return;
        }

        setPasswordLoading(true);
        const result = await changeUserPassword(newPassword);
        setPasswordLoading(false);

        if (result.success) {
            setPasswordSuccess('Şifreniz başarıyla güncellendi.');
            setShowPasswordWarning(false);
            setNewPassword('');
            setConfirmPassword('');
            // Optional: Reload window or user to ensure consistency
        } else {
            setPasswordError(result.error || 'Şifre değiştirilemedi.');
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    if (authLoading || dataLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (!user || !veli) {
        return null; // or redirect handled by useEffect
    }

    const onayliCocuklar = cocuklar.filter(c => c.durum === 'onaylandi');
    const bekleyenCocuklar = cocuklar.filter(c => c.durum === 'beklemede');

    const toplamHarcama = onayliCocuklar.reduce((total, cocuk) => {
        if (!cocuk.ogrenciData) return total;
        const odemeler = cocuk.ogrenciData.islemGecmisi.filter(i => isHarcama(i.tip, i.tutar));
        return total + odemeler.reduce((sum, islem) => sum + Math.abs(islem.tutar), 0);
    }, 0);

    return (
        <div className="min-h-screen relative overflow-x-hidden">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="container-custom py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                                <span className="text-xl">🏫</span>
                            </div>
                            <div>
                                <Link href="/" className="text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors">
                                    TUGAY BİLSEM OTOMAT PRO
                                </Link>
                                <p className="text-xs text-gray-500 font-medium">Veli Paneli</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="hidden md:block text-sm text-gray-600 font-medium">
                                {veli.adSoyad}
                            </span>
                            <button
                                onClick={handleSignOut}
                                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                                Çıkış
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container-custom py-8">

                {/* Password Change Warning */}
                {showPasswordWarning && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm mb-8 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-start gap-4">
                            <div className="bg-red-100 p-2 rounded-full text-red-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-red-800 mb-2">
                                    Şifre Değişikliği Gerekli
                                </h3>
                                <p className="text-red-700 mb-4 text-sm">
                                    Güvenliğiniz için lütfen geçici şifrenizi yenisiyle değiştiriniz. Bu işlemi yapmadan panele tam erişim sağlayamazsınız.
                                </p>

                                <form onSubmit={handlePasswordChange} className="bg-white p-4 rounded-lg border border-red-100 shadow-sm max-w-md">
                                    {passwordError && (
                                        <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm font-medium">
                                            {passwordError}
                                        </div>
                                    )}
                                    {passwordSuccess && (
                                        <div className="bg-green-100 text-green-700 px-4 py-2 rounded mb-4 text-sm font-medium">
                                            {passwordSuccess}
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium text-gray-900"
                                                placeholder="En az 6 karakter"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre (Tekrar)</label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium text-gray-900"
                                                placeholder="Şifrenizi doğrulayın"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={passwordLoading}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors shadow-md shadow-red-500/30 disabled:opacity-50"
                                        >
                                            {passwordLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Welcome Section */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            TUGAY BİLSEM GÜVENLİ ÖĞRENCİ TAKİP SİSTEMİ
                        </h1>
                        <p className="text-gray-600">
                            Hoşgeldiniz, çocuklarınızın harcamalarını buradan takip edebilirsiniz.
                        </p>
                    </div>
                    <button
                        onClick={refetch}
                        className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Verileri Yenile
                    </button>
                </div>

                {/* Stats Cards */}
                {onayliCocuklar.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div className="text-sm font-medium text-gray-500">Toplam Çocuk</div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900">{cocuklar.length}</div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-sm font-medium text-gray-500">Onaylı Çocuk</div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900">{onayliCocuklar.length}</div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-sm font-medium text-gray-500">Bu Ay Harcama</div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900">{toplamHarcama.toFixed(2)} ₺</div>
                        </div>
                    </div>
                )}

                {/* Children Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Çocuk Listesi</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Kayıtlı çocukların bakiyelerini ve durumlarını görüntüleyin
                            </p>
                        </div>
                    </div>

                    {cocuklar.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Kayıtlı Öğrenci Bulunamadı</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mb-6">
                                Sistemde size tanımlı öğrenci bulunmamaktadır. Lütfen okul yönetimi ile iletişime geçiniz.
                            </p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {cocuklar.map(cocuk => (
                                <CocukCard key={cocuk.talepID} cocuk={cocuk} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Legend / Info */}
                {
                    cocuklar.length > 0 && (
                        <div className="mt-8 flex gap-6 text-sm text-gray-500 justify-center md:justify-start">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                <span>Onaylı: Kart tanımlanmış</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                <span>Beklemede: İşlem bekleniyor</span>
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
}
