const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join('..', '2025-2026 EĞİTİM ÖĞRETİM YILI KAYIT GÜNCELLEME VE DERS PROGRAMI FORMU (Yanıtlar).xlsx');

console.log('Reading file:', filePath);

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Get headers (first row)
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = jsonData[0];

    console.log('Headers found:', headers);

    // Show first data row to confirm
    if (jsonData.length > 1) {
        console.log('Sample Row 1:', jsonData[1]);
    }
} catch (error) {
    console.error('Error reading file:', error.message);
}
