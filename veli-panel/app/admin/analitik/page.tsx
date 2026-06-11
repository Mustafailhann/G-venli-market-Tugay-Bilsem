'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AnalyticsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-500">Yönlendiriliyor...</p>
        </div>
    );
}
