/**
 * Simple Bulk Export Analyzer - Outputs to file
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the bulk export file
const filePath = 'bulk-a3snsjclchkfi8-20251118-20260117-1768683859196.xlsx';

console.log('Reading:', filePath);

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

console.log('Loaded rows:', data.length);

// Show first row structure
if (data.length > 0) {
    console.log('\nFirst row columns:');
    Object.keys(data[0]).forEach((key, idx) => {
        if (idx < 30) console.log(`  ${idx + 1}. ${key}`);
    });
}

// Write to JSON for inspection
const outputPath = 'bulk-export-data.json';
fs.writeFileSync(outputPath, JSON.stringify(data.slice(0, 5), null, 2));

console.log(`\nData written to: ${outputPath}`);
console.log('Total rows:', data.length);
