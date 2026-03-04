
import { NextResponse } from 'next/server';
import { adminAddStudent } from '@/lib/admin';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'import_data.json');
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Data file not found' }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        const results = [];

        for (const item of data) {
            // Map JSON fields to expected format
            // JSON: ogrenciAdi, babaAdi, babaTel, anneAdi, anneTel

            const studentData = {
                adSoyad: item.ogrenciAdi,
                sinif: 'Bilinmiyor', // Default class if not in data
                bakiye: 0,
            };

            const parentPhones = [];
            if (item.babaTel) parentPhones.push(item.babaTel);
            if (item.anneTel) parentPhones.push(item.anneTel);

            // We could also pass parent names to adminAddStudent if we updated it to support setting names
            // For now, adminAddStudent only sets phone number. 
            // We might want to update adminAddStudent to accept names update too.
            // But let's stick to the plan: Import first.

            const result = await adminAddStudent(studentData, parentPhones);
            results.push({ name: item.ogrenciAdi, result });
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
