import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';

import fs from 'fs';

export async function GET() {
    try {
        // Path to the excel file in the project root
        // Normalized path
        const filePath = path.join(process.cwd(), 'import_data.xlsx');

        // Read file buffer directly using fs (proven to work)
        const fileBuffer = fs.readFileSync(filePath);

        // Parse buffer with XLSX
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        return NextResponse.json({ success: true, data: jsonData });
    } catch (error: any) {
        console.error('Excel read error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
