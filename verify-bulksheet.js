const XLSX = require('xlsx');

// Check generated file
const wb = XLSX.readFile('CONSERVATIVE-BULKSHEET-20260117.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

console.log('=== COLUMNS IN GENERATED FILE ===');
if (data[0]) {
    const cols = Object.keys(data[0]);
    console.log(cols.join('\n'));
    console.log(`\nTotal columns: ${cols.length}`);
}

console.log('\n=== FIRST 3 ROWS ===');
data.slice(0, 3).forEach((row, i) => {
    console.log(`\nRow ${i}: ${row.Entity} - ${row.Operation}`);
    console.log(`  Campaign: ${row['Campaign Name']}`);
    console.log(`  State: ${row.State}`);
    if (row['Daily Budget']) console.log(`  Budget: $${row['Daily Budget']}`);
});

// Check original file columns
const origWb = XLSX.readFile('bulk-a3snsjclchkfi8-20251118-20260117-1768683859196.xlsx');
const origWs = origWb.Sheets[origWb.SheetNames[1]]; // Sponsored Products sheet
const origData = XLSX.utils.sheet_to_json(origWs);

console.log('\n\n=== COLUMNS IN ORIGINAL AMAZON FILE ===');
if (origData[0]) {
    const origCols = Object.keys(origData[0]);
    console.log(origCols.join('\n'));
    console.log(`\nTotal columns: ${origCols.length}`);
}

// Compare
console.log('\n=== COMPARISON ===');
const generatedCols = data[0] ? Object.keys(data[0]) : [];
const originalCols = origData[0] ? Object.keys(origData[0]) : [];

const missing = originalCols.filter(c => !generatedCols.includes(c));
const extra = generatedCols.filter(c => !originalCols.includes(c));

if (missing.length > 0) {
    console.log('\n⚠️ MISSING COLUMNS (in original but not generated):');
    missing.forEach(c => console.log(`  - ${c}`));
}

if (extra.length > 0) {
    console.log('\n⚠️ EXTRA COLUMNS (in generated but not original):');
    extra.forEach(c => console.log(`  - ${c}`));
}

if (missing.length === 0 && extra.length === 0) {
    console.log('\n✅ ALL COLUMNS MATCH!');
}
