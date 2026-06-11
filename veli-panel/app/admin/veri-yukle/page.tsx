'use client';

import { useState, useRef } from 'react';
import { bulkUpsertStudents } from '@/lib/admin';
import * as XLSX from 'xlsx';

export default function ImportPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setLoading(true);
        setData([]);
        setLogs([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const arrayBuffer = event.target?.result;
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
                setData(jsonData);
                setLogs([`✓ "${file.name}" başarıyla okundu. ${jsonData.length} kayıt bulundu.`]);
            } catch (err: any) {
                setLogs([`✗ Dosya okunamadı: ${err.message}`]);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        const dt = new DataTransfer();
        dt.items.add(file);
        if (fileInputRef.current) {
            fileInputRef.current.files = dt.files;
            fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    const startImport = async () => {
        if (!window.confirm(`${data.length} kayıt sisteme eklenecek veya güncellenecek. Devam etmek istiyor musunuz?`)) return;

        setImporting(true);
        setLogs([`Veriler işleniyor, lütfen bekleyin...`]);

        const parsedStudents = data.map((row, index) => {
            // Dinamik Sütun Eşleştirici
            const getVal = (possibleKeys: string[]) => {
                for (const k of possibleKeys) {
                    if (row[k] !== undefined && row[k] !== '') {
                        return String(row[k]).trim();
                    }
                }
                return '';
            };

            const studentName = getVal(['İSİM', 'Öğrencinin Adı Soyadı', 'AD SOYAD', 'ADSOYAD']);
            const cardID = getVal(['KANTİN KART NUMARASI', 'Öğrencinin T.C. Kimlik Numarası', 'KART ID', 'KART NUMARASI']);
            const className = getVal(['SINIF', 'Öğrencinin Sınıfı', 'Sınıf']);
            const babaAd = getVal(['BABA ADI', 'Öğrencinin Baba Adı']);
            const babaTel = getVal(['BABA TELEFON', 'Öğrencinin Baba Cep Telefonu']);
            const anneAd = getVal(['ANNE ADI', 'Öğrencinin Anne Adı']);
            const anneTel = getVal(['ANNE TELEFON', 'Öğrencinin Anne Cep Telefonu']);

            const parents = [];
            if (babaTel) parents.push({ name: babaAd || 'Baba', phone: babaTel });
            if (anneTel) parents.push({ name: anneAd || 'Anne', phone: anneTel });

            return {
                adSoyad: studentName,
                kartID: cardID,
                sinif: className || 'Belirsiz',
                parents
            };
        }).filter(s => s.adSoyad && s.adSoyad.trim().length > 0);

        if (parsedStudents.length === 0) {
            setLogs(prev => [...prev, `✗ Geçerli hiçbir kayıt bulunamadı. Lütfen Excel sütun başlıklarını kontrol edin.`]);
            setImporting(false);
            return;
        }

        try {
            const result = await bulkUpsertStudents(parsedStudents);
            if (result.success) {
                setLogs(prev => [
                    ...prev, 
                    `✓ İşlem tamamlandı!`,
                    `✦ Eklenen Yeni Öğrenci: ${result.inserted}`,
                    `✦ Güncellenen Eski Öğrenci: ${result.updated}`,
                    ...(result.errors.length > 0 ? ['⚠ Hatalar:', ...result.errors] : [])
                ]);
            } else {
                setLogs(prev => [...prev, `✗ İşlem başarısız oldu. Hatalar:`, ...result.errors]);
            }
        } catch (err: any) {
            setLogs(prev => [...prev, `✗ Beklenmeyen Hata: ${err.message}`]);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="container-custom py-8 px-8 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Öğrenci Veritabanını Güncelle / İçe Aktar (Excel)</h1>
                <p className="text-gray-500 mt-1">Excel dosyasından öğrenci ve veli bilgilerini sisteme aktarın veya mevcutları güncelleyin</p>
            </div>

            {/* Upload Area */}
            {data.length === 0 && !loading && (
                <div
                    className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer mb-8"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">Excel Dosyası Yükleyin</h3>
                    <p className="text-sm text-gray-500 mb-4">Dosyayı sürükleyip bırakın veya tıklayarak seçin</p>
                    <span className="inline-block bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors">
                        Dosya Seç
                    </span>
                    <p className="text-xs text-gray-400 mt-3">.xlsx, .xls veya .csv formatları desteklenir</p>
                </div>
            )}

            {/* Required Format Warning */}
            {data.length === 0 && !loading && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-amber-800 mb-2">Excel dosyanız aşağıdaki sütun formatında olmalıdır:</h4>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                {[
                                    'Öğrencinin Adı Soyadı',
                                    'Öğrencinin T.C. Kimlik Numarası',
                                    'Öğrencinin Sınıfı',
                                    'Öğrencinin Baba Adı',
                                    'Öğrencinin Baba Cep Telefonu',
                                    'Öğrencinin Anne Adı',
                                    'Öğrencinin Anne Cep Telefonu'
                                ].map((col) => (
                                    <span key={col} className="bg-white text-amber-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 text-center">
                                        {col}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center mb-8">
                    <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Dosya okunuyor...</p>
                </div>
            )}

            {/* Preview */}
            {data.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Veri Önizleme</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-sm text-gray-500">{fileName}</span>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-sm font-medium text-indigo-600">{data.length} kayıt</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setData([]);
                                        setFileName('');
                                        setLogs([]);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    Farklı Dosya Seç
                                </button>
                                <button
                                    onClick={startImport}
                                    disabled={importing}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {importing ? (
                                        <>
                                            <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                            İşleniyor...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            Verileri Aktarmayı Başlat
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Progress Bar removed since bulk update is single call */}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto max-h-[450px]">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Öğrenci Adı</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">TC/KART ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.map((row, i) => {
                                    const getVal = (possibleKeys: string[]) => {
                                        for (const k of possibleKeys) {
                                            if (row[k] !== undefined && row[k] !== '') {
                                                return String(row[k]).trim();
                                            }
                                        }
                                        return '-';
                                    };
                                    const studentName = getVal(['İSİM', 'Öğrencinin Adı Soyadı', 'AD SOYAD', 'ADSOYAD']);
                                    const cardID = getVal(['KANTİN KART NUMARASI', 'Öğrencinin T.C. Kimlik Numarası', 'KART ID', 'KART NUMARASI']);

                                    return (
                                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{studentName}</td>
                                            <td className="px-4 py-3 text-gray-600 font-mono">{cardID}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Logs */}
            <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl text-xs font-mono max-h-60 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-slate-900 pb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <h3 className="text-white font-bold text-sm">İşlem Kayıtları</h3>
                </div>
                {logs.length === 0 ? (
                    <div className="opacity-40">Excel dosyası yükleyin ve aktarma işlemini başlatın...</div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className={`py-0.5 ${log.startsWith('✗') ? 'text-red-400' : log.startsWith('✓') ? 'text-green-400' : log.startsWith('⚠') ? 'text-yellow-400' : ''}`}>
                            {log}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
