import {
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    Timestamp,
    query,
    orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { Urun } from '@/types';

const COLLECTION_NAME = 'urunler';

export async function uploadProductImage(file: File): Promise<string | null> {
    try {
        const { compressImage } = await import('./imageUtils');
        // Resmi 400x400'e küçültüp JPEG olarak sıkıştır, base64 data URL döner
        const dataURL = await compressImage(file, 400, 400, 0.7);
        return dataURL;
    } catch (error) {
        console.error('Error processing product image:', error);
        return null;
    }
}

export async function getProducts(): Promise<Urun[]> {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('ad'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Urun));
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

export async function addProduct(data: Omit<Urun, 'id' | 'olusturmaTarihi'>) {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...data,
            olusturmaTarihi: Timestamp.now()
        });
        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('Error adding product:', error);
        return { success: false, error: error.message };
    }
}

export async function updateProduct(id: string, data: Partial<Urun>) {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, data);
        return { success: true };
    } catch (error: any) {
        console.error('Error updating product:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteProduct(id: string) {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting product:', error);
        return { success: false, error: error.message };
    }
}
