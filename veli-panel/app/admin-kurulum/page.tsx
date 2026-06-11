'use client';

import { useState } from 'react';
import { signUp } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function AdminSetupPage() {
    const [status, setStatus] = useState('');
    const router = useRouter();

    const createAdmin = async () => {
        setStatus('Oluşturuluyor...');
        try {
            // Admin Credentials
            const phone = '5550000000';
            const email = `${phone}@okul.local`;
            const password = 'admin123';

            // Using existing signUp helper which creates a Veli doc. 
            // We might want to mark this Veli as "Admin" or just rely on the phone number access.
            // Ideally we should have a role system, but for now let's just create the auth user.

            // Note: signUp function in lib/auth.ts creates a Veli document too. 
            // We can leverage that or bypass it. Let's use it to safe.
            const res = await signUp(email, password, {
                adSoyad: 'Sistem Yöneticisi',
                telefonNo: phone,
                sifreDegistirmeZorunlu: false
            });

            if (res.success) {
                setStatus('Admin hesabı oluşturuldu! Giriş sayfasına yönlendiriliyorsunuz...');
                setTimeout(() => router.push('/giris'), 2000);
            } else {
                setStatus('Hata: ' + res.error);
            }
        } catch (e: any) {
            setStatus('Hata: ' + e.message);
        }
    };

    return (
        <div className="p-10 flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Admin Hesabı Kurulumu</h1>
            <p className="mb-4">Bu sayfa "555 000 00 00 / admin123" hesabını oluşturur.</p>
            <button
                onClick={createAdmin}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
                Admin Hesabını Oluştur
            </button>
            <p className="mt-4 font-mono">{status}</p>
        </div>
    );
}
