'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Urun } from '@/types';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Omit<Urun, 'id' | 'olusturmaTarihi'>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    initialData?: Urun | null;
}

export default function ProductModal({ isOpen, onClose, onConfirm, onDelete, initialData }: ProductModalProps) {
    const [formData, setFormData] = useState({
        ad: '',
        fiyat: '',
        resimURL: '',
        kategori: '',
        stok: '0'
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ad: initialData.ad,
                    fiyat: initialData.fiyat.toString(),
                    resimURL: initialData.resimURL || '',
                    kategori: initialData.kategori || '',
                    stok: initialData.stok.toString()
                });
            } else {
                setFormData({
                    ad: '',
                    fiyat: '',
                    resimURL: '',
                    kategori: '',
                    stok: '0'
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        await onConfirm({
            ad: formData.ad,
            fiyat: parseFloat(formData.fiyat),
            resimURL: formData.resimURL,
            kategori: formData.kategori,
            stok: parseInt(formData.stok) || 0
        });

        setLoading(false);
        onClose();
    };

    const isEditMode = !!initialData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">
                        {isEditMode ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ürün Adı</label>
                        <input
                            type="text"
                            value={formData.ad}
                            onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="Örn: Tost"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Fiyat (₺)</label>
                            <input
                                type="number"
                                step="0.5"
                                value={formData.fiyat}
                                onChange={(e) => setFormData({ ...formData, fiyat: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Stok</label>
                            <input
                                type="number"
                                value={formData.stok}
                                onChange={(e) => setFormData({ ...formData, stok: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kategori (Opsiyonel)</label>
                        <input
                            type="text"
                            value={formData.kategori}
                            onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="Yiyecek, İçecek vb."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resim URL (Opsiyonel)</label>
                        <input
                            type="url"
                            value={formData.resimURL}
                            onChange={(e) => setFormData({ ...formData, resimURL: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="https://..."
                        />
                        {formData.resimURL && (
                            <div className="mt-2 text-xs text-gray-500">
                                Önizleme: <img src={formData.resimURL} alt="Önizleme" className="h-10 w-10 object-cover inline-block ml-2 rounded border" onError={(e) => (e.currentTarget.src = '')} />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                        {isEditMode && onDelete && initialData?.id && (
                            <button
                                type="button"
                                onClick={async () => {
                                    if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
                                        setLoading(true);
                                        await onDelete(initialData.id);
                                        setLoading(false);
                                        onClose();
                                    }
                                }}
                                className="px-4 py-2 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors mr-auto"
                            >
                                Sil
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className={`py-2 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors ${!isEditMode || !onDelete ? 'flex-1' : ''}`}
                        >
                            İptal
                        </button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className={`${(!isEditMode || !onDelete) ? 'flex-1' : ''} bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl transition-colors px-6`}
                        >
                            {loading ? 'Kaydediliyor...' : (isEditMode ? 'Güncelle' : 'Kaydet')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
