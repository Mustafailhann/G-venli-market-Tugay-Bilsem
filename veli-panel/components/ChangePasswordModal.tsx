
'use client';

import { useState } from 'react';
import { changeUserPassword } from '@/lib/auth';
import Button from '@/components/ui/Button';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose?: () => void; // Optional because this might be forced (no close)
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Şifreler eşleşmiyor.');
            return;
        }

        setLoading(true);
        try {
            const result = await changeUserPassword(newPassword);
            if (result.success) {
                setSuccess(true);
                // Wait a bit then close (or refresh page)
                setTimeout(() => {
                    if (onClose) onClose();
                    else window.location.reload(); // Reload to refresh auth state/user data
                }, 1500);
            } else {
                setError(result.error || 'Şifre değiştirilemedi.');
            }
        } catch (err) {
            setError('Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Şifre Değişikliği Gerekli</h2>
                    <p className="text-gray-500 mt-2">
                        Güvenliğiniz için lütfen ilk girişinizde şifrenizi değiştirin.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm font-medium">
                        Şifreniz başarıyla güncellendi! Yönlendiriliyorsunuz...
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Şifre</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Yeni şifrenizi girin"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Şifre Tekrar</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Şifrenizi tekrar girin"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading || success}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] mt-2"
                    >
                        {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
