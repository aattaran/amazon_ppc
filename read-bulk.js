const XLSX = require('xlsx');
const fs = require('fs');

// Read the bulk file
const workbook = XLSX.readFile('bulk-a3snsjclchkfi8-20251118-20260117-1768683859196.xlsx');

console.log('=== SHEET NAMES ===');
console.log(workbook.SheetNames);

// Read first sheet
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

console.log('\n=== FIRST 30 ROWS ===');
data.slice(0, 30).forEach((row, i) => {
    console.log(`Row ${i}:`, row);
});

// Save as JSON for easier analysis
const jsonData = {};
workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    jsonData[sheetName] = XLSX.utils.sheet_to_json(sheet);
});

fs.writeFileSync('bulk-analysis.json', JSON.stringify(jsonData, null, 2));
console.log('\n=== SAVED TO bulk-analysis.json ===');
