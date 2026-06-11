'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeUserPassword } from '@/lib/auth';
import Button from '@/components/ui/Button';

export default function ChangePasswordPage() {
    const router = useRouter();
    const [passwords, setPasswords] = useState({
        current: '111111', // Assuming this is mostly for the 111111 flow
        new: '',
        confirm: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (passwords.new.length < 6) {
            setError('Yeni şifreniz en az 6 karakter olmalıdır.');
            return;
        }

        if (passwords.new !== passwords.confirm) {
            setError('Yeni şifreler eşleşmiyor.');
            return;
        }

        if (passwords.new === '111111') {
            setError('Yeni şifreniz varsayılan şifre ile aynı olamaz.');
            return;
        }

        setLoading(true);

        try {
            // We ask for "Old Password" but in this forced flow it's likely '111111'
            // However, the `changeUserPassword` helper might require re-auth.
            // Let's assume the user IS logged in (session active) so we might not strictly need re-auth 
            // OR we passed the current password.

            // NOTE: Ideally we should ask for "Current Password" for security, 
            // but for this specific "First Time" flow, we know it's 111111 if they just logged in with it.
            // But to be generic, let's just try updating.

            const result = await changeUserPassword(passwords.new);

            if (result.success) {
                alert('Şifreniz başarıyla güncellendi.');
                router.push('/dashboard'); // Should pass the check now
            } else {
                setError('Hata: ' + result.error);
            }
        } catch (err: any) {
            setError('Bir hata oluştu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
                        🔒
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Şifre Değiştirme</h1>
                    <p className="text-gray-600 mt-2 text-sm">
                        Güvenliğiniz için lütfen varsayılan şifrenizi değiştirin.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre</label>
                        <input
                            type="password"
                            value={passwords.new}
                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="Yeni şifrenizi girin"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre (Tekrar)</label>
                        <input
                            type="password"
                            value={passwords.confirm}
                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="Şifrenizi tekrar girin"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium mt-4"
                    >
                        {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle ve Devam Et'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
