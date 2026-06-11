// Child Card Component

import React from 'react';
import Link from 'next/link';
import { CocukWithStatus } from '@/types';

interface CocukCardProps {
    cocuk: CocukWithStatus;
}

export default function CocukCard({ cocuk }: CocukCardProps) {
    const isApproved = cocuk.durum === 'onaylandi';
    const isPending = cocuk.durum === 'beklemede';

    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-6 flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${isApproved ? 'bg-green-50' : 'bg-amber-50'}`}>
                        {isApproved ? '🎓' : '⏳'}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">
                            {cocuk.cocukAdi}
                        </h3>
                        {cocuk.sinif && (
                            <p className="text-sm text-gray-500">Sınıf: {cocuk.sinif}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1">
                {isPending && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm">
                        <div className="font-medium text-amber-800 mb-1 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Onay Bekliyor
                        </div>
                        <p className="text-amber-700 text-xs leading-relaxed">
                            Okul yönetimi tarafından kart tanımlaması yapılması bekleniyor.
                        </p>
                    </div>
                )}

                {isApproved && cocuk.ogrenciData && (
                    <div className="space-y-4">
                        <div className={`rounded-lg p-3 ${cocuk.ogrenciData.bakiye < 0 ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <p className={`text-xs ${cocuk.ogrenciData.bakiye < 0 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>Mevcut Bakiye</p>
                                {cocuk.ogrenciData.bakiye <= -10 && (
                                    <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">LİMİT DOLDU</span>
                                )}
                            </div>
                            <p className={`text-2xl font-bold ${cocuk.ogrenciData.bakiye < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {cocuk.ogrenciData.bakiye.toFixed(2).replace('-', '- ')} ₺
                            </p>
                            {cocuk.ogrenciData.bakiye < 0 && cocuk.ogrenciData.bakiye > -10 && (
                                <p className="text-xs text-red-500 mt-2 font-medium">Dikkat: Öğrencinizin bakiyesi eksiye düşmüştür!</p>
                            )}
                            {cocuk.ogrenciData.bakiye <= -10 && (
                                <p className="text-xs text-red-600 mt-2 font-bold">Limit doldu. Daha fazla harcama yapılamaz.</p>
                            )}
                        </div>

                        {cocuk.ogrenciData.islemGecmisi.length > 0 && (
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Son işlem: {new Date(cocuk.ogrenciData.islemGecmisi[0].tarih.toDate()).toLocaleDateString('tr-TR')}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isApproved && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link
                        href={`/cocuk/${cocuk.kartID}`}
                        className="flex items-center justify-center w-full gap-2 bg-white border-2 border-blue-600 text-blue-600 font-semibold py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                        Detayları Gör
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            )}
        </div>
    );
}
