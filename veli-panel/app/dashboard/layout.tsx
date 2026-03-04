'use client';

import { useEffect } from 'react'; // Removed useState/ChangePasswordModal import
import { useAuth } from '@/hooks/useAuth';
import { getVeli } from '@/lib/firestore';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkPasswordPolicy = async () => {
            if (!loading && user) {
                // Determine if we are on the change password page
                const isChangePasswordPage = pathname === '/dashboard/sifre-degistir';

                const veliData = await getVeli(user.uid);

                if (veliData?.sifreDegistirmeZorunlu) {
                    // Redirect to change password page if not already there
                    if (!isChangePasswordPage) {
                        router.push('/dashboard/sifre-degistir');
                    }
                } else {
                    // If policies met, but user tries to go to Change Password page manually? 
                    // Allowed. No action needed.

                    // Specific case: If they were forced but completed it, should we redirect back?
                    // Usually handled by the page itself pushing to /dashboard.
                }
            }
        };

        checkPasswordPolicy();
    }, [user, loading, pathname, router]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
    }

    return (
        <>
            {children}
        </>
    );
}
