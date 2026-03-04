'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

interface BalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => Promise<void>;
    studentName: string;
}

export default function BalanceModal({ isOpen, onClose, onConfirm, studentName }: BalanceModalProps) {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0) return;

        setLoading(true);
        await onConfirm(numAmount);
        setLoading(false);
        setAmount('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Bakiye Yükle</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {studentName} için bakiye ekleniyor
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Yüklenecek Tutar (₺)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₺</span>
                            <input
                                type="number"
                                min="1"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-lg font-bold text-gray-900 placeholder:font-normal"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            İptal
                        </button>
                        <Button
                            type="submit"
                            disabled={loading || !amount}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-green-600/20"
                        >
                            {loading ? 'Yükleniyor...' : 'Onayla ve Yükle'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
