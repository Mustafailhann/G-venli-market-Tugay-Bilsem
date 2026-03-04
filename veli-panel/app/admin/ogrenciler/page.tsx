'use client';

import { useState, useEffect } from 'react';
import { getAllStudents, addStudentBalance, adminAddStudent, updateStudent, deleteStudent, uploadStudentPhoto, updateStudentWithParents, getParentsByIds } from '@/lib/admin';
import { useRouter } from 'next/navigation';
import { Ogrenci, Veli } from '@/types';
import BalanceModal from '@/components/admin/BalanceModal';
import StudentModal from '@/components/admin/StudentModal';
import Button from '@/components/ui/Button';

export default function StudentsPage() {
    const [students, setStudents] = useState<Ogrenci[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [parentMap, setParentMap] = useState<Record<string, Veli>>({});

    // Balance Modal State
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Ogrenci | null>(null);

    // Student Edit/Add Modal State
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Ogrenci | null>(null);

    const fetchStudents = async () => {
        setLoading(true);
        const data = await getAllStudents();
        setStudents(data);

        // Fetch all parent data
        const allVeliIds = new Set<string>();
        data.forEach(s => s.veliIDleri?.forEach(id => allVeliIds.add(id)));
        if (allVeliIds.size > 0) {
            const parents = await getParentsByIds(Array.from(allVeliIds));
            const map: Record<string, Veli> = {};
            parents.forEach(p => { map[p.veliID] = p; });
            setParentMap(map);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleAddBalance = (student: Ogrenci) => {
        setSelectedStudent(student);
        setIsBalanceModalOpen(true);
    };

    const confirmAddBalance = async (amount: number) => {
        if (!selectedStudent) return;

        const result = await addStudentBalance(selectedStudent.id, amount);
        if (result.success) {
            alert('Bakiye başarıyla yüklendi.');
            fetchStudents(); // Refresh list to show new balance
        } else {
            alert('Hata: ' + result.error);
        }
    };

    // --- Student CRUD Handlers ---

    const router = useRouter(); // Initialize router

    const handleAddStudent = () => {
        setEditingStudent(null);
        setIsStudentModalOpen(true);
    };

    const handleEdit = (student: Ogrenci) => {
        setEditingStudent(student);
        setIsStudentModalOpen(true);
    };

    const handleDetail = (student: Ogrenci) => {
        router.push(`/admin/ogrenciler/${student.id}`);
    };

    const handleStudentSubmit = async (
        data: Partial<Ogrenci>,
        parents: { phone: string; name: string; veliID?: string }[],
        photoFile?: File | null
    ) => {
        let result;

        // Upload photo if provided
        let resimURL: string | undefined;
        if (photoFile) {
            const url = await uploadStudentPhoto(photoFile);
            if (url) {
                resimURL = url;
            }
        }

        if (editingStudent) {
            // Update Existing - with parents
            const studentData = { ...data };
            if (resimURL) {
                studentData.resimURL = resimURL;
            }
            result = await updateStudentWithParents(editingStudent.id, studentData, parents);
        } else {
            // Create New
            const studentData = { ...data };
            if (resimURL) {
                studentData.resimURL = resimURL;
            }
            result = await adminAddStudent(studentData, parents);
        }

        if (result.success) {
            alert(editingStudent ? 'Öğrenci güncellendi.' : 'Yeni öğrenci eklendi.');
            fetchStudents();
            setIsStudentModalOpen(false);
        } else {
            alert('Hata: ' + result.error);
        }
    };

    const filteredStudents = students.filter(student =>
        student.adSoyad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.sinif.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.kartID.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (studentId: string) => {
        const result = await deleteStudent(studentId);
        if (result.success) {
            alert('Öğrenci silindi.');
            fetchStudents();
            setIsStudentModalOpen(false);
        } else {
            alert('Hata: ' + result.error);
        }
    };

    return (
        <div className="container-custom py-8 px-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Öğrenci Yönetimi</h1>
                    <p className="text-gray-500 mt-1">Tüm öğrencileri ve bakiyelerini yönetin</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        className="bg-blue-600 text-white"
                        onClick={handleAddStudent}
                    >
                        + Yeni Öğrenci
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <input
                        type="text"
                        placeholder="İsim, sınıf veya kart ID ile ara..."
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
                ) : filteredStudents.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Öğrenci bulunamadı.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Öğrenci</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sınıf</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Veli</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bakiye</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{student.adSoyad}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                                                {student.sinif}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {student.veliIDleri && student.veliIDleri.length > 0 ? (
                                                <div className="space-y-1">
                                                    {student.veliIDleri.map((veliID, idx) => {
                                                        const veli = parentMap[veliID];
                                                        return (
                                                            <div key={veliID} className="text-sm">
                                                                <div className="font-medium text-gray-800">
                                                                    {veli?.adSoyad || 'Bilinmiyor'}
                                                                </div>
                                                                <div className="text-gray-400 text-xs">
                                                                    {veli?.telefonNo || student.veliTelefonlari?.[idx] || '-'}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`font-bold ${student.bakiye < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                {student.bakiye.toFixed(2)} ₺
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleAddBalance(student)}
                                                className="text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 font-medium transition-colors mr-2"
                                            >
                                                + Bakiye
                                            </button>
                                            <button
                                                onClick={() => handleDetail(student)}
                                                className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium transition-colors mr-2"
                                            >
                                                Detay
                                            </button>
                                            <button
                                                onClick={() => handleEdit(student)}
                                                className="text-sm bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                                            >
                                                Düzenle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <BalanceModal
                isOpen={isBalanceModalOpen}
                onClose={() => setIsBalanceModalOpen(false)}
                onConfirm={confirmAddBalance}
                studentName={selectedStudent?.adSoyad || ''}
            />

            <StudentModal
                isOpen={isStudentModalOpen}
                onClose={() => setIsStudentModalOpen(false)}
                onConfirm={handleStudentSubmit}
                onDelete={handleDelete}
                initialData={editingStudent}
            />
        </div>
    );
}
