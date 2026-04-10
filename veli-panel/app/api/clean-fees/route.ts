import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const snapshot = await getDocs(collection(db, 'Ogrenciler'));
        
        const all = [];
        for (const document of snapshot.docs) {
            const data = document.data();
            all.push({ id: document.id, adSoyad: data.adSoyad, tip: data.tip });
        }
        
        return NextResponse.json({ success: true, all });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
