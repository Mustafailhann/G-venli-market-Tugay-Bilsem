'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Veli } from '@/types';

interface ParentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Partial<Veli>) => Promise<void>;
    initialData?: Veli | null;
}

export default function ParentModal({ isOpen, onClose, onConfirm, initialData }: ParentModalProps) {
    const [formData, setFormData] = useState({
        adSoyad: '',
        telefonNo: '',
        aktif: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    adSoyad: initialData.adSoyad || '',
                    telefonNo: initialData.telefonNo || '',
                    aktif: initialData.aktif
                });
            } else {
                // Reset for new entry
                setFormData({
                    adSoyad: '',
                    telefonNo: '',
                    aktif: true
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onConfirm(formData);
        setLoading(false);
        onClose();
    };

    const isEditMode = !!initialData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">
                        {isEditMode ? 'Veli Düzenle' : 'Yeni Veli Ekle'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {isEditMode ? 'Veli bilgilerini güncelleyin' : 'Sisteme yeni bir veli kaydedin'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                        <input
                            type="text"
                            value={formData.adSoyad}
                            onChange={(e) => setFormData({ ...formData, adSoyad: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="Örn: Ahmet Yılmaz"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Telefon Numarası</label>
                        <input
                            type="tel"
                            value={formData.telefonNo}
                            onChange={(e) => setFormData({ ...formData, telefonNo: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="5551234567"
                            required
                        />
                    </div>

                    {isEditMode && (
                        <div className="flex items-center gap-3 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.aktif}
                                    onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-sm font-medium text-gray-700">Hesap Aktif</span>
                            </label>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            İptal
                        </button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl transition-colors"
                        >
                            {loading ? 'İşleniyor...' : (isEditMode ? 'Güncelle' : 'Kaydet')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
