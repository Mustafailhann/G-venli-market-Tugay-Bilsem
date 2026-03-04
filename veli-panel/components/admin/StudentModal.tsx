'use client';

import { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import { Ogrenci, Veli } from '@/types';
import { getParentsByIds } from '@/lib/admin';

interface ParentData {
    veliID?: string;
    name: string;
    phone: string;
    label: string; // 'Anne' or 'Baba'
}

interface StudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (
        studentData: Partial<Ogrenci>,
        parents: { phone: string; name: string; veliID?: string }[],
        photoFile?: File | null
    ) => Promise<void>;
    onDelete?: (studentId: string) => Promise<void>;
    initialData?: Ogrenci | null;
}

export default function StudentModal({ isOpen, onClose, onConfirm, onDelete, initialData }: StudentModalProps) {
    const [formData, setFormData] = useState({
        adSoyad: '',
        sinif: '',
        kartID: ''
    });

    const [parents, setParents] = useState<ParentData[]>([
        { name: '', phone: '', label: 'Anne' },
        { name: '', phone: '', label: 'Baba' }
    ]);

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingParents, setLoadingParents] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setPhotoFile(null);

            if (initialData) {
                setFormData({
                    adSoyad: initialData.adSoyad || '',
                    sinif: initialData.sinif || '',
                    kartID: initialData.kartID || ''
                });
                setPhotoPreview(initialData.resimURL || null);

                // Fetch parents for editing
                if (initialData.veliIDleri && initialData.veliIDleri.length > 0) {
                    setLoadingParents(true);
                    getParentsByIds(initialData.veliIDleri).then((veliler) => {
                        const parentData: ParentData[] = [
                            { name: '', phone: '', label: 'Anne' },
                            { name: '', phone: '', label: 'Baba' }
                        ];
                        veliler.forEach((veli, index) => {
                            if (index < 2) {
                                parentData[index] = {
                                    veliID: veli.veliID,
                                    name: veli.adSoyad || '',
                                    phone: veli.telefonNo || '',
                                    label: index === 0 ? 'Anne' : 'Baba'
                                };
                            }
                        });
                        setParents(parentData);
                        setLoadingParents(false);
                    });
                } else {
                    setParents([
                        { name: '', phone: '', label: 'Anne' },
                        { name: '', phone: '', label: 'Baba' }
                    ]);
                }
            } else {
                setFormData({ adSoyad: '', sinif: '', kartID: '' });
                setPhotoPreview(null);
                setParents([
                    { name: '', phone: '', label: 'Anne' },
                    { name: '', phone: '', label: 'Baba' }
                ]);
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const validParents = parents.filter(p => p.phone).map(p => ({
            phone: p.phone,
            name: p.name,
            veliID: p.veliID
        }));
        await onConfirm(formData, validParents, photoFile);
        setLoading(false);
        onClose();
    };

    const handleParentChange = (index: number, field: 'name' | 'phone', value: string) => {
        const newParents = [...parents];
        newParents[index] = { ...newParents[index], [field]: value };
        setParents(newParents);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const isEditMode = !!initialData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">
                        {isEditMode ? 'Öğrenci Düzenle' : 'Yeni Öğrenci Ekle'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center gap-3">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all overflow-hidden"
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Öğrenci" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center">
                                    <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <span className="text-[10px] text-gray-400">Fotoğraf</span>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                        />
                        {photoPreview && (
                            <button
                                type="button"
                                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                                className="text-xs text-red-500 hover:text-red-700"
                            >
                                Fotoğrafı Kaldır
                            </button>
                        )}
                    </div>

                    {/* Student Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                            <input
                                type="text"
                                value={formData.adSoyad}
                                onChange={(e) => setFormData({ ...formData, adSoyad: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sınıf</label>
                            <input
                                type="text"
                                value={formData.sinif}
                                onChange={(e) => setFormData({ ...formData, sinif: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Kart ID (Opsiyonel)</label>
                            <input
                                type="text"
                                value={formData.kartID}
                                onChange={(e) => setFormData({ ...formData, kartID: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                placeholder="Kart okutunuz"
                            />
                        </div>
                    </div>

                    {/* Parents Section - Always visible */}
                    <div className="border-t border-gray-100 pt-4">
                        <label className="block text-sm font-medium text-gray-900 mb-3">Veli Bilgileri</label>

                        {loadingParents ? (
                            <div className="text-center py-4 text-sm text-gray-500">Veli bilgileri yükleniyor...</div>
                        ) : (
                            <div className="space-y-3">
                                {parents.map((parent, index) => (
                                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                        <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                                            {parent.label}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <input
                                                    type="text"
                                                    value={parent.name}
                                                    onChange={(e) => handleParentChange(index, 'name', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
                                                    placeholder={`${parent.label} Adı Soyadı`}
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="tel"
                                                    value={parent.phone}
                                                    onChange={(e) => handleParentChange(index, 'phone', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm"
                                                    placeholder="Telefon (555...)"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            * Telefon numarası sistemde kayıtlıysa otomatik eşleşir. Değilse yeni veli oluşturulur.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        {isEditMode && onDelete && initialData?.id && (
                            <button
                                type="button"
                                onClick={async () => {
                                    if (confirm('Bu öğrenciyi silmek istediğinize emin misiniz?')) {
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
                            {loading ? 'İşleniyor...' : (isEditMode ? 'Güncelle' : 'Kaydet')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
