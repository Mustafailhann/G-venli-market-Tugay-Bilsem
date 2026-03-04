'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useVeli } from '@/hooks/useVeli';
import { createCocukTalebi } from '@/lib/firestore';

export default function CocukEklePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { veli } = useVeli();

    const [ad, setAd] = useState('');
    const [soyad, setSoyad] = useState('');
    const [sinif, setSinif] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!user || !veli) {
            setError('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
            setLoading(false);
            return;
        }

        try {
            const cocukTamAd = `${ad} ${soyad}`.trim();

            const result = await createCocukTalebi(
                user.uid,
                veli.adSoyad,
                cocukTamAd,
                sinif
            );

            if (result.success) {
                router.push('/dashboard');
            } else {
                throw new Error(result.error || 'Bir hata oluştu.');
            }
        } catch (err: any) {
            console.error(err);
            setError('Çocuk eklenirken bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 text-blue-600 rounded-xl mb-4">
                        <span className="text-2xl">👶</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        Çocuk Ekle
                    </h1>
                    <p className="text-gray-500 text-sm">
                        Çocuğunuzun bilgilerini girin
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 text-sm">
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ad
                            </label>
                            <input
                                type="text"
                                value={ad}
                                onChange={(e) => setAd(e.target.value)}
                                placeholder="Ali"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Soyad
                            </label>
                            <input
                                type="text"
                                value={soyad}
                                onChange={(e) => setSoyad(e.target.value)}
                                placeholder="Yılmaz"
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sınıf (Opsiyonel)
                        </label>
                        <input
                            type="text"
                            value={sinif}
                            onChange={(e) => setSinif(e.target.value)}
                            placeholder="5-A"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-md disabled:opacity-50"
                        >
                            {loading ? 'Ekleniyor...' : 'Çocuğumu Ekle'}
                        </button>
                    </div>

                    <Link href="/dashboard" className="block text-center mt-4">
                        <button type="button" className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                            İptal, Geri Dön
                        </button>
                    </Link>
                </form>
            </div>
        </div>
    );
}
