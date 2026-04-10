import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteField } from "firebase/firestore";
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        process.env[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
    }
});

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const querySnapshot = await getDocs(collection(db, "Ogrenciler"));
    let count = 0;
    for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const tip = data.tip;
        
        if (tip === 'Personel') {
            console.log(`Personel bulundu: ${data.adSoyad}`);
            const ref = doc(db, "Ogrenciler", docSnapshot.id);
            await updateDoc(ref, {
                toplamKartUcreti: deleteField(),
                kartUcretiGecmisi: deleteField()
            });
            console.log(`${data.adSoyad} temizlendi.`);
            count++;
        }
    }
    console.log(`Bitti! Temizlenen personel sayisi: ${count}`);
    process.exit(0);
}

run().catch(console.error);
