'use client';

import { useState } from 'react';

interface BalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => Promise<void>;
    onSetBalance: (newBalance: number) => Promise<void>;
    studentName: string;
    currentBalance: number;
}

export default function BalanceModal({
    isOpen,
    onClose,
    onConfirm,
    onSetBalance,
    studentName,
    currentBalance
}: BalanceModalProps) {
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<'add' | 'set'>('add');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        setAmount('');
        setMode('add');
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
            // set mode - can be any value including 0 or negative
            setLoading(true);
            await onSetBalance(numAmount);
        }

        setLoading(false);
        setAmount('');
        setMode('add');
        onClose();
    };

    const preview = mode === 'add'
        ? currentBalance + (parseFloat(amount) || 0)
        : parseFloat(amount) !== undefined && amount !== '' ? parseFloat(amount) : currentBalance;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Bakiye Yönet</h3>
                    <p className="text-sm text-gray-500 mt-1">{studentName}</p>
                </div>

                {/* Current Balance Display */}
                <div className="px-6 pt-5">
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
