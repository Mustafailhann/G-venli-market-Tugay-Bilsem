'use client';

import { useState } from 'react';
import { changeAdminSettings } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function AdminAyarlarPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        mevcutSifre: '',
        yeniTelefon: '', // Optional
        yeniSifre: '',   // Optional
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Görsel formatlama: 555 123 45 67
    const formatPhoneNumber = (value: string) => {
        if (!value) return value;
        const phoneNumber = value.replace(/[^\d]/g, '');
        const len = phoneNumber.length;
        if (len < 4) return phoneNumber;
        if (len < 7) return `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3)}`;
        if (len < 9) return `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3, 6)} ${phoneNumber.slice(6)}`;
        return `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3, 6)} ${phoneNumber.slice(6, 8)} ${phoneNumber.slice(8, 10)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        if (val.startsWith('0')) {
            val = val.substring(1);
        }
        val = val.replace(/[^\d]/g, '');
        if (val.length > 10) val = val.slice(0, 10);
        setFormData({ ...formData, yeniTelefon: formatPhoneNumber(val) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!formData.mevcutSifre) {
            setMessage({ type: 'error', text: 'Mevcut şifrenizi girmelisiniz.' });
            return;
        }

        if (!formData.yeniSifre && !formData.yeniTelefon) {
            setMessage({ type: 'error', text: 'Değiştirmek istediğiniz bir alan doldurun.' });
            return;
        }

        if (formData.yeniSifre && formData.yeniSifre.length < 6) {
            setMessage({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalıdır.' });
            return;
        }

        const digits = formData.yeniTelefon.replace(/[^\d]/g, '');
        if (formData.yeniTelefon && digits.length !== 10) {
            setMessage({ type: 'error', text: 'Telefon numarası tam 10 haneli olmalıdır.' });
            return;
        }

        setLoading(true);

        const result = await changeAdminSettings(
            formData.mevcutSifre,
            formData.yeniTelefon || undefined,
            formData.yeniSifre || undefined
        );

        if (result.success) {
            setMessage({ type: 'success', text: 'Ayarlar başarıyla güncellendi! Yönetici profiliniz değişti.' });
            setFormData({ mevcutSifre: '', yeniTelefon: '', yeniSifre: '' });
        } else {
            setMessage({ type: 'error', text: 'Hata: ' + result.error });
        }
        setLoading(false);
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 mb-8">Yönetici Ayarları</h1>

            {message.text && (
                <div className={`p-4 rounded-xl mb-6 ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-4">Profil Bilgilerini Güncelle</h2>
                        <p className="text-sm text-slate-500 mb-6">Sisteme giriş telefon numaranızı veya şifrenizi değiştirmek için aşağıdaki alanları kullanabilirsiniz. Değiştirmek istemediğiniz alanı boş bırakın.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Yeni Telefon Numarası</label>
                        <p className="text-xs text-blue-600 mb-2">Başında sıfır (0) olmadan giriniz (Örn: 5XX...)</p>
                        <input
                            type="tel"
                            maxLength={13}
                            placeholder="5XX 123 45 67"
                            value={formData.yeniTelefon}
                            onChange={handlePhoneChange}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Yeni Şifre</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={formData.yeniSifre}
                            onChange={(e) => setFormData({ ...formData, yeniSifre: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Mevcut Şifre (Zorunlu)</label>
                        <p className="text-xs text-slate-500 mb-2">Güvenlik gereği işlemi onaylamak için mevcut şifrenizi girmelisiniz.</p>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={formData.mevcutSifre}
                            onChange={(e) => setFormData({ ...formData, mevcutSifre: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </form>
            </div>
        </div>
    );
}
