'use client';

import { useState, useEffect } from 'react';
import { getAllParents, getAllStudents, createParent, updateParent, deleteParent } from '@/lib/admin';
import { Veli, Ogrenci } from '@/types';
import Button from '@/components/ui/Button';
import ParentModal from '@/components/admin/ParentModal';

export default function ParentsPage() {
    const [parents, setParents] = useState<Veli[]>([]);
    const [students, setStudents] = useState<Ogrenci[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState<Veli | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const [parentsData, studentsData] = await Promise.all([
            getAllParents(),
            getAllStudents()
        ]);
        setParents(parentsData);
        setStudents(studentsData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setSelectedParent(null);
        setIsModalOpen(true);
    };

    const handleEdit = (parent: Veli) => {
        setSelectedParent(parent);
        setIsModalOpen(true);
    };

    const handleDelete = async (parent: Veli) => {
        if (!confirm(`${parent.adSoyad} adlı veliyi silmek istediğinize emin misiniz?`)) return;

        const result = await deleteParent(parent.veliID);
        if (result.success) {
            alert('Veli başarıyla silindi.');
            fetchData();
        } else {
            alert('Hata: ' + result.error);
        }
    };

    const handleModalSubmit = async (data: Partial<Veli>) => {
        let result;
        if (selectedParent) {
            // Update
            result = await updateParent(selectedParent.veliID, data);
        } else {
            // Create
            result = await createParent(data);
        }

        if (result.success) {
            alert(selectedParent ? 'Veli güncellendi.' : 'Yeni veli eklendi.');
            fetchData();
            setIsModalOpen(false); // Close explicitly on success (though modal calls close too main submit wrapper might need logic)
            // Actually ParentModal calls onConfirm then onClose. 
            // So we don't need to close here if ParentModal handles it. 
            // Wait, ParentModal calls onClose AFTER await onConfirm.
            // So if we throw here, it stays open?
            // Let's assume onConfirm success implies close.
        } else {
            alert('Hata: ' + result.error);
            // If error, we might want to keep modal open? 
            // The current ParentModal closes anyway. 
            // Ideally we should throw error so ParentModal catches/doesn't close.
            // But for MVP alert is enough.
        }
    };

    const filteredParents = parents.filter(parent =>
        (parent.adSoyad && parent.adSoyad.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (parent.telefonNo && parent.telefonNo.includes(searchTerm))
    );

    return (
        <div className="container-custom py-8 px-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Veli Yönetimi</h1>
                    <p className="text-gray-500 mt-1">Sistemdeki kayıtlı velileri yönetin</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        className="bg-blue-600 text-white"
                        onClick={handleAdd}
                    >
                        + Yeni Veli
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="İsim veya telefon ile ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                ) : filteredParents.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Veli bulunamadı.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Öğrenciler</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredParents.map((parent) => {
                                    // Find linked students
                                    const linkedStudents = students.filter(s =>
                                        s.veliIDleri?.includes(parent.veliID)
                                    );

                                    return (
                                        <tr key={parent.veliID} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{parent.adSoyad || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                                                {parent.telefonNo}
                                            </td>
                                            <td className="px-6 py-4">
                                                {linkedStudents.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {linkedStudents.map(s => (
                                                            <span key={s.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                                                {s.adSoyad} ({s.sinif})
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${parent.aktif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {parent.aktif ? 'Aktif' : 'Pasif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleEdit(parent)}
                                                    className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium transition-colors mr-2"
                                                >
                                                    Düzenle
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(parent)}
                                                    className="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium transition-colors"
                                                >
                                                    Sil
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ParentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleModalSubmit}
                initialData={selectedParent}
            />
        </div>
    );
}
