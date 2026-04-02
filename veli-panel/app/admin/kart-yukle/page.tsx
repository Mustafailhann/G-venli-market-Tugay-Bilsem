'use client';

import { useState, useRef } from 'react';
import { bulkUpdateCardIds } from '@/lib/admin';
import * as XLSX from 'xlsx';

interface KartSatiri {
    adSoyad: string;
    kartID: string;
    ham: Record<string, any>;
}

export default function KartYuklePage() {
    const [rows, setRows] = useState<KartSatiri[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [fileName, setFileName] = useState('');
    const [logs, setLogs] = useState<{ type: 'ok' | 'warn' | 'err' | 'info'; msg: string }[]>([]);
    const [result, setResult] = useState<{
        updated: number;
        notFound: string[];
        errors: string[];
    } | null>(null);
    const [kolonlar, setKolonlar] = useState<{ isim: string; kart: string }>({
        isim: '',
        kart: '',
    });
    const [allCols, setAllCols] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addLog = (type: 'ok' | 'warn' | 'err' | 'info', msg: string) => {
        setLogs(prev => [...prev, { type, msg }]);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setLoading(true);
        setRows([]);
        setLogs([]);
        setResult(null);

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = XLSX.read(ev.target?.result, { type: 'array' });
                const ws = data.Sheets[data.SheetNames[0]];
                const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

                if (jsonData.length === 0) {
                    addLog('err', 'Dosyada hiç veri satırı bulunamadı.');
                    setLoading(false);
                    return;
                }

                const cols = Object.keys(jsonData[0]);
                setAllCols(cols);

                // Auto-detect columns (Turkish)
                const isimKolonu =
                    cols.find(c => c.toLowerCase().includes('isim') || c.toLowerCase().includes('ad')) || cols[0];
                const kartKolonu =
                    cols.find(c =>
                        c.toLowerCase().includes('kart') ||
                        c.toLowerCase().includes('numara') ||
                        c.toLowerCase().includes('id')
                    ) || cols[1];

                setKolonlar({ isim: isimKolonu, kart: kartKolonu });

                // Parse rows
                const parsed: KartSatiri[] = jsonData
                    .map((row) => ({
                        adSoyad: (row[isimKolonu] || '').toString().trim(),
                        kartID: (row[kartKolonu] || '').toString().trim(),
                        ham: row,
                    }))
                    .filter(r => r.adSoyad);

                setRows(parsed);
                addLog('ok', `"${file.name}" okundu. ${parsed.length} satır bulundu.`);

                const kartsiz = parsed.filter(r => !r.kartID).length;
                if (kartsiz > 0) {
                    addLog('warn', `${kartsiz} öğrencinin kart numarası boş — bunlar atlanacak.`);
                }
            } catch (err: any) {
                addLog('err', `Dosya okunamadı: ${err.message}`);
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

    // Re-parse when column selection changes
    const handleKolonChange = (field: 'isim' | 'kart', value: string) => {
        const newKolonlar = { ...kolonlar, [field]: value };
        setKolonlar(newKolonlar);
        if (rows.length > 0) {
            const reparsed = rows.map(r => ({
                ...r,
                adSoyad: field === 'isim' ? (r.ham[value] || '').toString().trim() : r.adSoyad,
                kartID: field === 'kart' ? (r.ham[value] || '').toString().trim() : r.kartID,
            }));
            setRows(reparsed);
        }
    };

    const startImport = async () => {
        try {
            const doluRows = rows.filter(r => r.kartID);
            if (doluRows.length === 0) {
                addLog('err', 'Güncellenecek hiç kart numarası yok.');
                return;
            }
            if (!window.confirm(`${doluRows.length} öğrencinin kart ID'si güncellenecek. Devam?`)) return;

            setImporting(true);
            setResult(null);
            addLog('info', `${doluRows.length} kart ID güncelleniyor... Lütfen bekleyin.`);

            const res = await bulkUpdateCardIds(doluRows.map(r => ({ adSoyad: r.adSoyad, kartID: r.kartID })));

            setResult({ updated: res.updated, notFound: res.notFound, errors: res.errors });

            if (res.success) {
                addLog('ok', `✓ Tamamlandı! ${res.updated} öğrenci güncellendi.`);
                if (res.notFound.length > 0) {
                    addLog('warn', `${res.notFound.length} öğrenci sistemde bulunamadı: (Bu isimlerin sistemdeki isimlerle aynı olduğuna emin olun) ${res.notFound.join(', ')}`);
                }
                if (res.errors.length > 0) {
                    res.errors.forEach(e => addLog('err', e));
                }
            } else {
                addLog('err', 'Güncelleme başarısız: ' + (res.errors.length > 0 ? res.errors.join(', ') : 'Bilinmeyen hata'));
            }
        } catch (err: any) {
            addLog('err', `Beklenmeyen bir hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
            console.error('Start import fail:', err);
        } finally {
            setImporting(false);
        }
    };

    const reset = () => {
        setRows([]);
        setFileName('');
        setLogs([]);
        setResult(null);
        setAllCols([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const doluRows = rows.filter(r => r.kartID);
    const bosRows = rows.filter(r => !r.kartID);

    return (
        <div className="container-custom py-8 px-8 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Kart ID Yükle</h1>
                <p className="text-gray-500 mt-1">
                    Excel dosyasından öğrenci kart numaralarını toplu olarak sisteme aktarın
                </p>
            </div>

            {/* Upload Area */}
            {rows.length === 0 && !loading && (
                <>
                    <div
                        className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer mb-6"
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
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Kart Numaraları Excel Dosyası</h3>
                        <p className="text-sm text-gray-500 mb-4">Dosyayı sürükleyip bırakın veya tıklayın</p>
                        <span className="inline-block bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
                            Dosya Seç
                        </span>
                        <p className="text-xs text-gray-400 mt-3">.xlsx, .xls veya .csv formatları desteklenir</p>
                    </div>

                    {/* Hint */}
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
                        <h4 className="text-sm font-semibold text-blue-800 mb-1">ℹ️ Nasıl çalışır?</h4>
                        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                            <li>Excel dosyanızda en az <strong>öğrenci adı</strong> ve <strong>kart numarası</strong> sütunları olmalıdır.</li>
                            <li>Sistem, öğrenci adlarını Firestore'daki kayıtlarla eşleştirir ve kart ID'lerini günceller.</li>
                            <li>Kart numarası boş olan satırlar atlanır.</li>
                            <li>Yanlış eşleşmeleri önizleme tablosunda görebilir, devam etmeden önce kontrol edebilirsiniz.</li>
                        </ul>
                    </div>
                </>
            )}

            {/* Loading */}
            {loading && (
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center mb-8">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Dosya okunuyor...</p>
                </div>
            )}

            {/* Preview */}
            {rows.length > 0 && (
                <div className="space-y-6">
                    {/* Column selector */}
                    {allCols.length > 2 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-wrap gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ad Soyad Sütunu</label>
                                <select
                                    value={kolonlar.isim}
                                    onChange={(e) => handleKolonChange('isim', e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kart Numarası Sütunu</label>
                                <select
                                    value={kolonlar.kart}
                                    onChange={(e) => handleKolonChange('kart', e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {allCols.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                            <div className="text-3xl font-bold text-gray-900">{rows.length}</div>
                            <div className="text-sm text-gray-500 mt-1">Toplam Satır</div>
                        </div>
                        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
                            <div className="text-3xl font-bold text-green-700">{doluRows.length}</div>
                            <div className="text-sm text-green-600 mt-1">Kart ID'li (Güncellenecek)</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
                            <div className="text-3xl font-bold text-amber-700">{bosRows.length}</div>
                            <div className="text-sm text-amber-600 mt-1">Kart Numarası Boş (Atlanacak)</div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Önizleme</h2>
                                <p className="text-sm text-gray-500">{fileName}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={reset}
                                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    Farklı Dosya
                                </button>
                                <button
                                    onClick={startImport}
                                    disabled={importing || doluRows.length === 0}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {importing ? (
                                        <>
                                            <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                            Güncelleniyor...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            {doluRows.length} Kart ID'yi Yükle
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Öğrenci Adı</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kart Numarası</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.map((row, i) => (
                                        <tr key={i} className={`hover:bg-gray-50/50 ${!row.kartID ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{row.adSoyad}</td>
                                            <td className="px-4 py-3 font-mono text-gray-700">
                                                {row.kartID || <span className="text-gray-300 italic">boş</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.kartID ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                                        ✓ Güncellenecek
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-400 text-xs font-medium rounded-full">
                                                        — Atlanacak
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Result summary */}
                    {result && (
                        <div className={`rounded-xl border p-5 ${result.errors.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <h3 className={`font-bold text-lg mb-3 ${result.errors.length > 0 ? 'text-red-800' : 'text-green-800'}`}>
                                İşlem Sonucu
                            </h3>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="bg-white rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-green-600">{result.updated}</div>
                                    <div className="text-xs text-gray-500">Güncellendi</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-amber-600">{result.notFound.length}</div>
                                    <div className="text-xs text-gray-500">Bulunamadı</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                                    <div className="text-xs text-gray-500">Hata</div>
                                </div>
                            </div>
                            {result.notFound.length > 0 && (
                                <div className="bg-white rounded-lg p-3 mb-2">
                                    <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Sistemde Bulunamayan Öğrenciler:</p>
                                    <p className="text-xs text-gray-600">{result.notFound.join(' • ')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Logs */}
            <div className="mt-6 bg-slate-900 text-slate-300 p-5 rounded-2xl text-xs font-mono max-h-64 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2 h-2 rounded-full ${importing ? 'bg-blue-400 animate-pulse' : 'bg-green-500'}`}></div>
                    <h3 className="text-white font-bold text-sm">İşlem Kayıtları</h3>
                </div>
                {logs.length === 0 ? (
                    <div className="opacity-40">Excel dosyası yükleyin...</div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className={`py-0.5 ${
                            log.type === 'err' ? 'text-red-400' :
                            log.type === 'ok' ? 'text-green-400' :
                            log.type === 'warn' ? 'text-yellow-400' :
                            'text-blue-300'
                        }`}>
                            {log.msg}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
