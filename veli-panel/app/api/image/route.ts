import { NextRequest, NextResponse } from "next/server";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const path = searchParams.get("path");

        if (!path) {
            return new NextResponse("Tarih/Yol belirtilmedi", { status: 400 });
        }

        // Firebase Storage modülü üzerinden (Sunucu tarafında CORS kuralı işlemez) token'lı URL'i alalım
        const storageRef = ref(storage, path);
        const url = await getDownloadURL(storageRef);

        return NextResponse.redirect(url, 302);
    } catch (error: any) {
        console.error("API /image error:", error);
        if (error.code === 'storage/object-not-found') {
            return new NextResponse("Görsel sunucuda bulunamadı.", { status: 404 });
        }
        return new NextResponse("Görsel yüklenemedi", { status: 500 });
    }
}
