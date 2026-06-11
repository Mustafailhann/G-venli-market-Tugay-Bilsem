// Custom hook for veli data

'use client';

import { useEffect, useState } from 'react';
import { Veli, CocukWithStatus } from '@/types';
import { getCurrentVeli, getCocuklarWithData } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';

export function useVeli() {
    const { user, loading: authLoading } = useAuth();
    const [veli, setVeli] = useState<Veli | null>(null);
    const [cocuklar, setCocuklar] = useState<CocukWithStatus[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!user) { // Expect user object instead of ID
                setLoading(false);
                return;
            }

            try {
                // Pass full user object to resolve identity
                const veliData = await getCurrentVeli(user);

                if (veliData) {
                    setVeli(veliData);
                    // Use the REAL Firestore Document ID from the record
                    const cocuklarData = await getCocuklarWithData(veliData.veliID);
                    setCocuklar(cocuklarData);
                } else {
                    setVeli(null);
                    setCocuklar([]);
                }
            } catch (error) {
                console.error('Error fetching veli data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [user]);

    const refetch = async () => {
        if (!veli) return; // Need veli loaded first
        setLoading(true);
        const cocuklarData = await getCocuklarWithData(veli.veliID);
        setCocuklar(cocuklarData);
        setLoading(false);
    };

    return { veli, cocuklar, loading, refetch };
}
