'use client';

import { useState, useEffect } from 'react';
import { getAllStudents } from '@/lib/admin';
import { getProducts } from '@/lib/products';
import AnalyticsCharts from '@/components/admin/AnalyticsCharts';
import { Ogrenci, Urun, isHarcama } from '@/types';
import { Timestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalBalance: 0,
        dailyRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        weeklySales: [] as { name: string; value: number }[],
        monthlySales: [] as { name: string; value: number }[],
        revenueTrend: [] as { date: string; amount: number }[],
        lowStockProducts: [] as Urun[],
        negativeBalanceStudents: [] as Ogrenci[],
        allSales: [] as { tarih: string; ogrenci: string; urun: string; adet: number; tutar: number }[],
    });
    const [products, setProducts] = useState<Urun[]>([]);
    const [loading, setLoading] = useState(true);
    const [adminInfo, setAdminInfo] = useState<{ adSoyad: string; unvan?: string } | null>(null);

    // Date formatting helper
    const currentDate = new Date().toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    useEffect(() => {
        // Giriş yapan adminin bilgilerini çek
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) return;
            try {
                // Önce UID ile dene
                const directRef = doc(db, 'veliler', user.uid);
                const directSnap = await getDoc(directRef);
                if (directSnap.exists()) {
                    const data = directSnap.data();
                    setAdminInfo({ adSoyad: data.adSoyad || '', unvan: data.unvan });
                    return;
                }
                // Email'den telefon numarasını çıkar ve ara
                if (user.email) {
                    const phone = user.email.split('@')[0];
                    const q = query(collection(db, 'veliler'), where('telefonNo', '==', phone));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const data = snap.docs[0].data();
                        setAdminInfo({ adSoyad: data.adSoyad || '', unvan: data.unvan });
                    }
                }
            } catch (e) { /* sessizce geç */ }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [students, productList] = await Promise.all([getAllStudents(), getProducts()]);
            setProducts(productList);

            // Calculate Stats
            const totalStudents = students.length;
            const totalBalance = students.reduce((sum, s) => sum + (s.bakiye || 0), 0);

            // Low stock products (stok <= 15)
            const lowStockProducts = productList.filter(p => p.stok <= 15);

            // Calculate Sales & Revenue
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const weeklyProducts: Record<string, number> = {};
            const monthlyProducts: Record<string, number> = {};
            const dailyRevenue: Record<string, number> = {};

            let dailyRevenueTotal = 0;
            let weeklyRevenueTotal = 0;
            let monthlyRevenueTotal = 0;

            const allSales: { tarih: string; ogrenci: string; urun: string; adet: number; tutar: number }[] = [];

            // Initialize last 7 days for revenue trend
            for (let i = 6; i >= 0; i--) {
                const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                const dayKey = day.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                dailyRevenue[dayKey] = 0;
            }

            students.forEach(student => {
                if (student.islemGecmisi) {
                    student.islemGecmisi.forEach(islem => {
                        // Convert Timestamp to Date
                        const islemDate = islem.tarih instanceof Timestamp ? islem.tarih.toDate() : new Date(islem.tarih);

                        if (isHarcama(islem.tip, islem.tutar)) {
                            const amount = Math.abs(islem.tutar);

                            // Daily revenue
                            if (islemDate >= todayStart) {
                                dailyRevenueTotal += amount;
                            }
                            // Weekly revenue
                            if (islemDate >= oneWeekAgo) {
                                weeklyRevenueTotal += amount;
                            }
                            // Monthly revenue
                            if (islemDate >= oneMonthAgo) {
                                monthlyRevenueTotal += amount;
                            }

                            // Calculate Daily Revenue for chart
                            if (islemDate >= oneWeekAgo) {
                                const dayKey = islemDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                                if (dailyRevenue[dayKey] !== undefined) {
                                    dailyRevenue[dayKey] += amount;
                                }
                            }


                            // Calculate Product Sales
                            if (islem.urunler) {
                                islem.urunler.forEach(urun => {
                                    let name = urun;
                                    let qty = 1;

                                    const match = urun.match(/^(.*?) \(x(\d+)\)$/);
                                    if (match) {
                                        name = match[1].trim();
                                        qty = parseInt(match[2], 10);
                                    }

                                    // Collect all sales for Excel export
                                    allSales.push({
                                        tarih: islemDate.toLocaleString('tr-TR'),
                                        ogrenci: student.adSoyad,
                                        urun: name,
                                        adet: qty,
                                        tutar: amount
                                    });

                                    if (islemDate >= oneWeekAgo) {
                                        weeklyProducts[name] = (weeklyProducts[name] || 0) + qty;
                                    }
                                    if (islemDate >= oneMonthAgo) {
                                        monthlyProducts[name] = (monthlyProducts[name] || 0) + qty;
                                    }
                                });
                            }
                        }
                    });
                }
            });

            const formatData = (data: Record<string, number>) => {
                return Object.entries(data)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value);
            };

            const formattedRevenueTrend = Object.entries(dailyRevenue).map(([date, amount]) => ({
                date,
                amount
            }));

            const negativeBalanceStudents = students
                .filter(s => (s.bakiye || 0) < 0)
                .sort((a, b) => (a.bakiye || 0) - (b.bakiye || 0));

            setStats({
                totalStudents,
                totalBalance,
                dailyRevenue: dailyRevenueTotal,
                weeklyRevenue: weeklyRevenueTotal,
                monthlyRevenue: monthlyRevenueTotal,
                weeklySales: formatData(weeklyProducts),
                monthlySales: formatData(monthlyProducts),
                revenueTrend: formattedRevenueTrend,
                lowStockProducts,
                negativeBalanceStudents,
                allSales
            });
            setLoading(false);
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Excel export: Satılan Ürünler
    const exportSalesExcel = () => {
        const data = stats.allSales.map(s => ({
            'Tarih': s.tarih,
            'Öğrenci': s.ogrenci,
            'Ürün': s.urun,
            'Adet': s.adet,
            'Tutar (₺)': s.tutar
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Satılan Ürünler');
        // Sütun genişlikleri
        ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 8 }, { wch: 12 }];
        XLSX.writeFile(wb, `Satilan_Urunler_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    };

    // Excel export: Stok Durumu
    const exportStockExcel = () => {
        const data = products.map(p => ({
            'Ürün Adı': p.ad,
            'Kategori': p.kategori || '-',
            'Fiyat (₺)': p.fiyat,
            'Stok Adedi': p.stok,
            'Durum': p.stok <= 15 ? '⚠️ Düşük Stok' : '✅ Normal'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Stok Durumu');
        ws['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];
        XLSX.writeFile(wb, `Stok_Durumu_${new Date().toLocaleDateString('tr-TR')}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-12">
            <div className="container-custom py-10 px-8">
                {/* Header Section */}
                <header className="mb-10">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">TUGAY BİLSEM ADMIN PANELİ</h1>
                            <p className="text-slate-500 mt-2 text-lg">
                                {adminInfo?.adSoyad
                                    ? adminInfo.unvan
                                        ? `Sayın ${adminInfo.unvan}ım ${adminInfo.adSoyad}, hoş geldiniz.`
                                        : `Hoş geldiniz, ${adminInfo.adSoyad}.`
                                    : 'Hoş geldiniz, sistem durumu stabil.'}
                            </p>
                        </div>
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl inline-block shadow-sm">
                                {currentDate}
                            </p>
                        </div>
                    </div>
                </header>

                {/* Quick Stats Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {/* Students Card - Premium Gradient */}
                    <div className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-lg shadow-indigo-100/50 border border-white group hover:translate-y-[-2px] transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-24 h-24 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Toplam Öğrenci</p>
                            <h2 className="text-4xl font-bold text-slate-800 tracking-tight">{stats.totalStudents}</h2>
                        </div>
                    </div>

                    {/* Balance Card - Premium Gradient */}
                    <div className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-lg shadow-emerald-100/50 border border-white group hover:translate-y-[-2px] transition-all duration-300 lg:col-span-1">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <svg className="w-24 h-24 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                            </svg>
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Toplam Bakiye</p>
                            <h2 className="text-4xl font-bold text-slate-800 tracking-tight">{stats.totalBalance.toFixed(2)} ₺</h2>
                        </div>
                    </div>

                    {/* Placeholder for future stats - e.g Active Users */}
                    <div className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-lg shadow-amber-100/50 border border-white group hover:translate-y-[-2px] transition-all duration-300">
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30 mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Günlük Ciro</p>
                            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{stats.dailyRevenue.toFixed(2)} ₺</h2>
                        </div>
                    </div>

                    {/* Warnings Card */}
                    <div className={`relative overflow-hidden bg-white p-6 rounded-3xl shadow-lg shadow-rose-100/50 border ${stats.lowStockProducts.length > 0 ? 'border-rose-200' : 'border-white'} group hover:translate-y-[-2px] transition-all duration-300`}>
                        <div className="relative z-10">
                            <div className={`w-12 h-12 bg-gradient-to-br ${stats.lowStockProducts.length > 0 ? 'from-rose-400 to-red-500 animate-pulse' : 'from-rose-400 to-pink-500'} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/30 mb-4`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-slate-500 mb-1">Stok Uyarıları</p>
                            <h2 className={`text-4xl font-bold tracking-tight ${stats.lowStockProducts.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{stats.lowStockProducts.length}</h2>
                        </div>
                    </div>
                </div>

                {/* Revenue Summary Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl shadow-lg text-white">
                        <p className="text-sm font-medium text-blue-100 mb-1">Günlük Ciro</p>
                        <h2 className="text-3xl font-bold">{stats.dailyRevenue.toFixed(2)} ₺</h2>
                        <p className="text-xs text-blue-200 mt-2">Bugün</p>
                    </div>
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-6 rounded-3xl shadow-lg text-white">
                        <p className="text-sm font-medium text-violet-100 mb-1">Haftalık Ciro</p>
                        <h2 className="text-3xl font-bold">{stats.weeklyRevenue.toFixed(2)} ₺</h2>
                        <p className="text-xs text-violet-200 mt-2">Son 7 gün</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-3xl shadow-lg text-white">
                        <p className="text-sm font-medium text-emerald-100 mb-1">Aylık Ciro</p>
                        <h2 className="text-3xl font-bold">{stats.monthlyRevenue.toFixed(2)} ₺</h2>
                        <p className="text-xs text-emerald-200 mt-2">Son 30 gün</p>
                    </div>
                </div>

                {/* Low Stock Warning */}
                {stats.lowStockProducts.length > 0 && (
                    <div className="mb-10 bg-rose-50 border border-rose-200 rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-rose-800">Düşük Stok Uyarısı</h3>
                                <p className="text-sm text-rose-600">Aşağıdaki ürünlerde stok 15 veya altına düşmüştür!</p>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {stats.lowStockProducts.map(p => (
                                <div key={p.id} className="bg-white border border-rose-100 rounded-xl p-4 flex items-center gap-3">
                                    {p.resimURL ? (
                                        <img src={p.resimURL} alt={p.ad} className="w-10 h-10 rounded-lg object-contain bg-gray-50" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">?</div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{p.ad}</p>
                                        <p className={`text-xs font-bold ${p.stok === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                                            {p.stok === 0 ? 'Stok Tükendi!' : `${p.stok} adet kaldı`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Negative Balance Warning */}
                {stats.negativeBalanceStudents.length > 0 && (
                    <div className="mb-10 bg-red-50 border border-red-200 rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-red-800">Eksik Bakiyeli Öğrenciler (0 ₺ Altı)</h3>
                                <p className="text-sm text-red-600">Bakiyesi eksiye düşmüş olan öğrencilerin listesi.</p>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {stats.negativeBalanceStudents.map(s => (
                                <div key={s.kartID} className={`bg-white border rounded-xl p-4 flex flex-col gap-1 ${s.bakiye && s.bakiye <= -10 ? 'border-red-400 shadow-sm' : 'border-red-100'}`}>
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-semibold text-slate-800 truncate" title={s.adSoyad}>{s.adSoyad}</p>
                                        {s.bakiye && s.bakiye <= -10 && (
                                            <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded leading-tight flex items-center h-5">LİMİT DOLDU</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-end mt-1">
                                        <p className="text-xs text-slate-500">{s.sinif || '-'}</p>
                                        <p className="text-sm font-bold text-red-600">
                                            {s.bakiye?.toFixed(2).replace('-', '- ')} ₺
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}


                {/* Excel Export Buttons */}
                <div className="flex flex-wrap gap-4 mb-10">
                    <button
                        onClick={exportSalesExcel}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-lg shadow-emerald-200 transition-all hover:translate-y-[-1px]"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Satılan Ürünler Excel
                    </button>
                    <button
                        onClick={exportStockExcel}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl shadow-lg shadow-indigo-200 transition-all hover:translate-y-[-1px]"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Stok Durumu Excel
                    </button>
                </div>

                {/* Analytics Charts */}
                <AnalyticsCharts
                    weeklyData={stats.weeklySales}
                    monthlyData={stats.monthlySales}
                    revenueTrend={stats.revenueTrend}
                />
            </div>
        </div>
    );
}
