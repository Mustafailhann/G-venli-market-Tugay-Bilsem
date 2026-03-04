// Authentication helper functions

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    User
} from 'firebase/auth';
import {
    doc,
    setDoc,
    Timestamp,
    collection,
    query,
    where,
    getDocs,
    updateDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Veli } from '@/types';
import { getCurrentVeli } from './firestore';

export async function signUp(email: string, password: string, veliData: { telefonNo: string } & Partial<Omit<Veli, 'veliID' | 'kayitTarihi' | 'aktif'>>) {
    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const phone = email.split('@')[0];

        // Check for existing record
        const q = query(collection(db, 'veliler'), where('telefonNo', '==', phone));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // LINK to existing
            const existingDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, 'veliler', existingDoc.id), {
                authID: user.uid,
                aktif: true,
                // Ensure password change is mandatory for new link
                sifreDegistirmeZorunlu: true
            });
        } else {
            // CREATE new
            const veliDoc: Veli = {
                veliID: user.uid,
                ...veliData,
                adSoyad: veliData.adSoyad || 'İsimsiz Veli', // Set default if missing
                kayitTarihi: Timestamp.now(),
                aktif: true,
                sifreDegistirmeZorunlu: true // Force for new users
            };
            await setDoc(doc(db, 'veliler', user.uid), veliDoc);
        }

        return { success: true, user };
    } catch (error: any) {
        // Don't log expected auth errors to console to avoid alarm
        if (error.code !== 'auth/email-already-in-use') {
            console.error('Sign up error:', error);
        }
        return { success: false, error: error.message, code: error.code }; // also return code
    }
}

export async function signIn(email: string, password: string) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error: any) {
        // Don't log expected auth errors to console to avoid alarm
        if (error.code !== 'auth/invalid-credential' && error.code !== 'auth/user-not-found') {
            console.error('Sign in error:', error);
        }
        return { success: false, error: error.message, code: error.code };
    }
}

export async function signOut() {
    try {
        await firebaseSignOut(auth);
        return { success: true };
    } catch (error: any) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

export function getCurrentUser(): User | null {
    return auth.currentUser;
}

export function formatPhoneEmail(phone: string): string {
    // Basic cleanup: remove spaces, ensure it starts with something standard if needed
    // For now assuming clean input or doing basic strip
    const cleanPhone = phone.replace(/\s+/g, '');
    return `${cleanPhone}@okul.local`;
}

export async function changeUserPassword(newPassword: string, oldPassword?: string) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'Kullanıcı oturumu bulunamadı.' };

    try {
        if (oldPassword && user.email) {
            // Re-authenticate if old password is provided (good practice)
            const credential = EmailAuthProvider.credential(user.email, oldPassword);
            await reauthenticateWithCredential(user, credential);
        }

        await updatePassword(user, newPassword);

        // Update the Firestore flag.
        // CRITICAL FIX: The Firestore Doc ID might NOT be the same as user.uid.
        // We must find the correct document first.
        const veli = await getCurrentVeli(user);

        if (veli) {
            // We found the VELI document (could be phone number or whatever ID)
            await updateDoc(doc(db, 'veliler', veli.veliID), {
                sifreDegistirmeZorunlu: false
            });
        } else {
            // Fallback: If for some reason getCurrentVeli returns null but we are logged in,
            // try to update/create at user.uid just in case, though this is less likely to be the main record.
            console.warn("Veli record not found during password change, attempting fallack update at UID.");
            await setDoc(doc(db, 'veliler', user.uid), {
                sifreDegistirmeZorunlu: false
            }, { merge: true });
        }

        return { success: true };
    } catch (error: any) {
        console.error('Password change error:', error);
        return { success: false, error: error.message };
    }
}
