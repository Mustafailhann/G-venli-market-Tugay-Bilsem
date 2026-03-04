
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    writeBatch,
    increment,
    arrayUnion,
    deleteDoc,
    getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { formatPhoneEmail } from './auth';
import { Ogrenci, Veli, Islem } from '@/types';
import { Timestamp } from 'firebase/firestore';

// NOTE: Creating Auth users requires Firebase Admin SDK or Cloud Functions if running from Client.
// Since we are running on Client, we can only create the current user via signUp.
// However, the requirement is "Admin adds new Parent".
// This typically requires a Secondary Auth App instance or a Cloud Function.
// For this MVP/Hybrid solution, check if we can simulate it or if we should just create the Firestore records 
// and let the parent "Claim" the account or Register with that phone number.
//
// STRATEGY: 
// 1. Admin creates Firestore "Veli" record with `telefonNo`.
// 2. Parent "Registers" using valid Phone. System checks if Phone matches a Veli record.
//
// OR (User Prompt implies Admin does full registration):
// "Yönetici, sisteme yeni veli kaydı yapabilir."
// If we want actual Auth user creation, we need Cloud Functions.
// assuming we can't spin up CF right now easily without backend code.
//
// ALTERNATIVE: Use a secondary Firebase App instance initialized with Admin credentials? 
// No, that's unsafe on client.
//
// PRACTICAL APPROACH:
// Admin creates the Firestore entries.
// Parent creates their own Auth account using "Sign Up" page, 
// BUT the Sign Up is only allowed if the Phone Number exists in the "Pre-approved Parents" list 
// OR Admin creates a temporary fake auth? 
// 
// Let's stick to: Admin creates Firestore Data. 
// Parent "Login" flow:
// If Auth User doesn't exist => "Account not found".
// Actually, maybe Admin can creates the Auth user if we provide a temporary password?
// But Client SDK cannot create *another* user without logging out the current Admin.
//
// SOLUTION: Admin creates the DATA (Student + Parent info).
// We'll implement a "Register" page that verifies the Phone Number against the stored Data.
// If match found => Create Auth User (link UID to existing Veli Doc).

export async function adminAddStudent(
    studentData: Partial<Ogrenci>,
    parents: { phone: string; name: string }[]
) {
    try {
        // 1. Resolve Parents
        const parentIds: string[] = [];
        const parentPhones: string[] = [];
        const batch = writeBatch(db);

        // Ensure student has an ID (if not provided, auto-gen)
        const studentRef = doc(collection(db, 'ogrenciler'));
        const studentId = studentData.kartID || studentRef.id; // Use provided ID (TC) or auto-gen

        // Check/Create Parents
        for (const parent of parents) {
            const phone = parent.phone;
            if (!phone) continue;

            parentPhones.push(phone);
            const q = query(collection(db, 'veliler'), where('telefonNo', '==', phone));
            const querySnapshot = await getDocs(q);

            let parentId = '';

            if (!querySnapshot.empty) {
                // Parent exists
                const pDoc = querySnapshot.docs[0];
                parentId = pDoc.id;
                // Optional: Update name if missing?
            } else {
                // Create New Parent
                const newParentRef = doc(collection(db, 'veliler'));
                parentId = newParentRef.id;
                batch.set(newParentRef, {
                    veliID: parentId,
                    telefonNo: phone,
                    adSoyad: parent.name || '',
                    aktif: true,
                    sifreDegistirmeZorunlu: true,
                    kayitTarihi: Timestamp.now()
                });
            }
            parentIds.push(parentId);
        }

        // 2. Create Student
        const newStudentData = {
            ...studentData,
            kartID: studentId,
            veliIDleri: parentIds,
            veliTelefonlari: parentPhones,
            islemGecmisi: [],
            bakiye: 0
        };

        batch.set(studentRef, newStudentData);

        await batch.commit();
        return { success: true, studentId };

    } catch (error: any) {
        console.error("Error adding student:", error);
        return { success: false, error: error.message };
    }
}

export async function adminUpdateParentPhone(veliId: string, newPhone: string) {
    try {
        // Update Firestore
        // Note: Auth Email change (phone@okul.local) requires Auth API which needs User Credential.
        // Admin cannot easily change another user's Auth Email from Client SDK.
        // This effectively "Deactivates" the old Auth login if we rely on email link.
        // We might need to instruct Parent to re-register or use Cloud Function.

        // For now, update Firestore.
        await updateDoc(doc(db, 'veliler', veliId), {
            telefonNo: newPhone
        });

        // Also update all linked students
        // Queries are needed... costly.
        // Maybe just keep it loose for now.

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAllStudents() {
    try {
        const q = query(collection(db, 'ogrenciler'));
        const querySnapshot = await getDocs(q);
        const students: Ogrenci[] = [];
        querySnapshot.forEach((doc) => {
            students.push({ id: doc.id, ...doc.data() } as any);
        });
        return students;
    } catch (error) {
        console.error("Error fetching students:", error);
        return [];
    }
}

export async function addStudentBalance(studentId: string, amount: number) {
    try {
        const studentRef = doc(db, 'ogrenciler', studentId);

        const newTransaction: Islem = {
            tarih: Timestamp.now(),
            tip: 'Bakiye Yükleme',
            tutar: amount,
            aciklama: 'Admin tarafından yüklendi',
            urunler: []
        };

        await updateDoc(studentRef, {
            bakiye: increment(amount),
            islemGecmisi: arrayUnion(newTransaction)
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error adding balance:", error);
        return { success: false, error: error.message };
    }
}

export async function getAllParents() {
    try {
        const q = query(collection(db, 'veliler'));
        const querySnapshot = await getDocs(q);
        const parents: Veli[] = [];
        querySnapshot.forEach((doc) => {
            parents.push({ veliID: doc.id, ...doc.data() } as any);
        });
        return parents;
    } catch (error) {
        console.error("Error fetching parents:", error);
        return [];
    }
}

// --- Parent (Veli) Operations ---

export async function createParent(data: Partial<Veli>) {
    try {
        // Check if phone already exists
        const q = query(collection(db, 'veliler'), where('telefonNo', '==', data.telefonNo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { success: false, error: 'Bu telefon numarası ile kayıtlı bir veli zaten var.' };
        }

        const newRef = doc(collection(db, 'veliler'));
        const newVeli: Veli = {
            veliID: newRef.id,
            adSoyad: data.adSoyad || '',
            telefonNo: data.telefonNo || '',
            aktif: true,
            sifreDegistirmeZorunlu: true, // Default for new admin-created users
            kayitTarihi: Timestamp.now(),
            ...data
        } as Veli;

        await batchInit().set(newRef, newVeli).commit();
        return { success: true, veliID: newRef.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateParent(veliID: string, data: Partial<Veli>) {
    try {
        await updateDoc(doc(db, 'veliler', veliID), data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteParent(veliID: string) {
    try {
        await deleteDoc(doc(db, 'veliler', veliID));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- Student Operations ---

export async function deleteStudent(cardID: string) {
    try {
        await deleteDoc(doc(db, 'ogrenciler', cardID));
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting student:", error);
        return { success: false, error: error.message };
    }
}

export async function updateStudent(cardID: string, data: Partial<Ogrenci>) {
    try {
        await updateDoc(doc(db, 'ogrenciler', cardID), data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Helper to avoid circular deps if needed, otherwise just use standard batch
function batchInit() {
    return writeBatch(db);
}

// --- Student Photo Upload ---

export async function uploadStudentPhoto(file: File): Promise<string | null> {
    try {
        const { compressImage } = await import('./imageUtils');
        // Resmi 400x400'e küçültüp JPEG olarak sıkıştır, base64 data URL döner
        const dataURL = await compressImage(file, 400, 400, 0.7);
        return dataURL;
    } catch (error) {
        console.error('Error processing student photo:', error);
        return null;
    }
}

// --- Get Parents by IDs (Batch) ---

export async function getParentsByIds(veliIDleri: string[]): Promise<Veli[]> {
    try {
        if (veliIDleri.length === 0) return [];
        const parents: Veli[] = [];

        // Firestore 'in' query supports max 30 items, batch accordingly
        const batchSize = 30;
        for (let i = 0; i < veliIDleri.length; i += batchSize) {
            const batch = veliIDleri.slice(i, i + batchSize);
            const q = query(
                collection(db, 'veliler'),
                where('__name__', 'in', batch)
            );
            const snapshot = await getDocs(q);
            snapshot.forEach((docSnap) => {
                parents.push({ veliID: docSnap.id, ...docSnap.data() } as Veli);
            });
        }

        return parents;
    } catch (error) {
        console.error('Error fetching parents by IDs:', error);
        return [];
    }
}

// --- Update Student with Parents ---

export async function updateStudentWithParents(
    cardID: string,
    studentData: Partial<Ogrenci>,
    parents: { phone: string; name: string; veliID?: string }[]
) {
    try {
        const batch = writeBatch(db);
        const parentIds: string[] = [];
        const parentPhones: string[] = [];

        for (const parent of parents) {
            const phone = parent.phone;
            if (!phone) continue;

            parentPhones.push(phone);

            if (parent.veliID) {
                // Update existing parent
                const parentRef = doc(db, 'veliler', parent.veliID);
                batch.update(parentRef, {
                    adSoyad: parent.name || '',
                    telefonNo: phone
                });
                parentIds.push(parent.veliID);
            } else {
                // Check if parent exists by phone
                const q = query(collection(db, 'veliler'), where('telefonNo', '==', phone));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const pDoc = querySnapshot.docs[0];
                    parentIds.push(pDoc.id);
                    // Update name if provided
                    if (parent.name) {
                        batch.update(doc(db, 'veliler', pDoc.id), { adSoyad: parent.name });
                    }
                } else {
                    // Create new parent
                    const newParentRef = doc(collection(db, 'veliler'));
                    parentIds.push(newParentRef.id);
                    batch.set(newParentRef, {
                        veliID: newParentRef.id,
                        telefonNo: phone,
                        adSoyad: parent.name || '',
                        aktif: true,
                        sifreDegistirmeZorunlu: true,
                        kayitTarihi: Timestamp.now()
                    });
                }
            }
        }

        // Update student
        const studentRef = doc(db, 'ogrenciler', cardID);
        batch.update(studentRef, {
            ...studentData,
            veliIDleri: parentIds,
            veliTelefonlari: parentPhones
        });

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error('Error updating student with parents:', error);
        return { success: false, error: error.message };
    }
}
