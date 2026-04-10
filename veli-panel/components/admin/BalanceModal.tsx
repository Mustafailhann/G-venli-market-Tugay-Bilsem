'use client';

import { useState } from 'react';

interface BalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => Promise<void>;
    onSetBalance: (newBalance: number) => Promise<void>;
    onKartUcreti: (tutar: number) => Promise<void>;
    studentName: string;
    currentBalance: number;
    toplamKartUcreti?: number;
    kartUcretiSayisi?: number;
}

export default function BalanceModal({
    isOpen,
    onClose,
    onConfirm,
    onSetBalance,
    onKartUcreti,
    studentName,
    currentBalance,
    toplamKartUcreti = 0,
    kartUcretiSayisi = 0,
}: BalanceModalProps) {
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<'add' | 'set'>('add');
    const [loading, setLoading] = useState(false);

    // Kart ücreti state'leri
    const [kartUcretiEditing, setKartUcretiEditing] = useState(false);
    const [kartUcretiInput, setKartUcretiInput] = useState('');
    const [kartUcretiLoading, setKartUcretiLoading] = useState(false);
    const [kartUcretiError, setKartUcretiError] = useState('');

    if (!isOpen) return null;

    const handleClose = () => {
        setAmount('');
        setMode('add');
        setKartUcretiEditing(false);
        setKartUcretiInput('');
        setKartUcretiError('');
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return;

        if (mode === 'add') {
            if (numAmount <= 0) return;
            setLoading(true);
            await onConfirm(numAmount);
        } else {
            setLoading(true);
            await onSetBalance(numAmount);
        }

        setLoading(false);
        setAmount('');
        setMode('add');
        onClose();
    };

    const handleKartUcretiOnayla = async () => {
        const tutar = parseFloat(kartUcretiInput);
        if (isNaN(tutar) || tutar <= 0) {
            setKartUcretiError('Geçerli bir tutar girin.');
            return;
        }
        setKartUcretiError('');
        setKartUcretiLoading(true);
        await onKartUcreti(tutar);
        setKartUcretiLoading(false);
        setKartUcretiEditing(false);
        setKartUcretiInput('');
    };

    const preview = mode === 'add'
        ? currentBalance + (parseFloat(amount) || 0)
        : parseFloat(amount) !== undefined && amount !== '' ? parseFloat(amount) : currentBalance;

    const kartFarki = kartUcretiInput !== ''
        ? parseFloat(kartUcretiInput)
        : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Bakiye Yönet</h3>
                    <p className="text-sm text-gray-500 mt-1">{studentName}</p>
                </div>

                <div className="px-6 pt-5 space-y-3">
                    {/* ── Kart Ücreti Bölümü ── */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                                {/* Kart ikonu */}
                                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span className="text-sm font-medium text-gray-600">
                                    Kart Ücreti
                                    {kartUcretiSayisi > 0 && (
                                        <span className="ml-1.5 text-xs text-gray-400">
                                            ({kartUcretiSayisi}. kart)
                                        </span>
                                    )}
                                </span>
                            </div>

                            {!kartUcretiEditing ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-base font-bold text-amber-600">
                                        {toplamKartUcreti.toFixed(2)} ₺
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setKartUcretiEditing(true);
                                            setKartUcretiInput('');
                                            setKartUcretiError('');
                                        }}
                                        title="Yeni kart tanımla"
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                d="M12 4v16m8-8H4" />
                                        </svg>
                                        Yeni Kart
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₺</span>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0.01"
                                            value={kartUcretiInput}
                                            onChange={(e) => {
                                                setKartUcretiInput(e.target.value);
                                                setKartUcretiError('');
                                            }}
                                            placeholder="0.00"
                                            className="w-36 pl-7 pr-3 py-1.5 text-sm font-bold bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleKartUcretiOnayla}
                                        disabled={kartUcretiLoading || kartUcretiInput === ''}
                                        className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {kartUcretiLoading ? '...' : 'Onayla'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setKartUcretiEditing(false);
                                            setKartUcretiInput('');
                                            setKartUcretiError('');
                                        }}
                                        className="px-2 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Hata mesajı */}
                        {kartUcretiError && (
                            <div className="px-4 pb-3 text-xs text-red-600 font-medium">
                                ⚠️ {kartUcretiError}
                            </div>
                        )}

                        {/* Önizleme: fark hesabı */}
                        {kartUcretiEditing && kartUcretiInput !== '' && !isNaN(parseFloat(kartUcretiInput)) && kartFarki > 0 && (
                            <div className="px-4 pb-3 flex items-center gap-2 text-xs text-amber-700">
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>
                                    <strong>{kartUcretiSayisi + 1}. Kart</strong> için{' '}
                                    <strong>{kartFarki.toFixed(2)} ₺</strong> kaydedilecek
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ── Mevcut Bakiye ── */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                        <span className="text-sm font-medium text-gray-500">Mevcut Bakiye</span>
                        <span className={`text-lg font-bold ${currentBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {currentBalance.toFixed(2)} ₺
                        </span>
                    </div>
                </div>

                {/* Mode Selector */}
                <div className="px-6 pt-4">
                    <div className="flex rounded-xl overflow-hidden border border-gray-200">
                        <button
                            type="button"
                            onClick={() => { setMode('add'); setAmount(''); }}
                            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${mode === 'add'
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            + Üstüne Yükle
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('set'); setAmount(''); }}
                            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-gray-200 ${mode === 'set'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            ✏️ Bakiyeyi Ayarla
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {mode === 'add' ? 'Yüklenecek Tutar (₺)' : 'Yeni Bakiye (₺)'}
                        </label>
                        <div className="relative flex gap-2">
                            <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₺</span>
                                <input
                                    type="number"
                                    step="any"
                                    min={mode === 'add' ? '0.01' : undefined}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-lg font-bold text-gray-900 placeholder:font-normal"
                                    placeholder={mode === 'add' ? '0.00' : currentBalance.toFixed(2)}
                                    required
                                />
                            </div>
                            {mode === 'set' && (
                                <button
                                    type="button"
                                    onClick={() => setAmount('0')}
                                    title="Bakiyeyi sıfırla"
                                    className="px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 text-sm font-semibold transition-colors whitespace-nowrap"
                                >
                                    Sıfırla
                                </button>
                            )}
                        </div>

                        {/* Preview */}
                        {amount !== '' && !isNaN(parseFloat(amount)) && (
                            <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between">
                                <span className="text-xs text-blue-600 font-medium">İşlem sonrası bakiye:</span>
                                <span className={`text-sm font-bold ${preview < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {preview.toFixed(2)} ₺
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || amount === ''}
                            className={`flex-1 text-white font-medium py-3 rounded-xl transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                                mode === 'add'
                                    ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                            }`}
                        >
                            {loading ? 'İşleniyor...' : mode === 'add' ? 'Onayla ve Yükle' : 'Bakiyeyi Güncelle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
