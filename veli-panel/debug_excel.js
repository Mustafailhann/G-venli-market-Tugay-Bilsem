const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'import_data.xlsx');
console.log('Checking file:', filePath);

try {
    if (fs.existsSync(filePath)) {
        console.log('File exists.');
        try {
            const fd = fs.openSync(filePath, 'r');
            console.log('File can be opened (read permission OK).');
            fs.closeSync(fd);
        } catch (e) {
            console.error('File exists but CANNOT be opened:', e.message);
            console.error('POSSIBLE CAUSE: File might be open in Excel. Please close it.');
        }
    } else {
        console.error('File does NOT exist at this path.');
    }
} catch (e) {
    console.error('General error:', e);
}
