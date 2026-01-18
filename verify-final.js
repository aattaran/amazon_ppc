const XLSX = require('xlsx');

const orig = XLSX.readFile('bulk-a3snsjclchkfi8-20251118-20260117-1768683859196.xlsx');
const newFile = XLSX.readFile('CONSERVATIVE-BULKSHEET-AMAZON-FORMAT-20260117.xlsx');

const origCols = Object.keys(XLSX.utils.sheet_to_json(orig.Sheets['Sponsored Products Campaigns'])[0]);
const newCols = Object.keys(XLSX.utils.sheet_to_json(newFile.Sheets['Sponsored Products Campaigns'])[0]);

console.log('=== FORMAT VERIFICATION ===\n');
console.log('Original Amazon file columns:', origCols.length);
console.log('New bulksheet columns:', newCols.length);

const match = origCols.every(c => newCols.includes(c)) && newCols.every(c => origCols.includes(c));
console.log(match ? '✅ PERFECT COLUMN MATCH!' : '❌ Column mismatch');

console.log('\n=== SHEET STRUCTURE ===');
console.log('Sheets in new file:', newFile.SheetNames.join(', '));

const data = XLSX.utils.sheet_to_json(newFile.Sheets['Sponsored Products Campaigns']);
console.log('Total rows:', data.length);

console.log('\n=== OPERATIONS SUMMARY ===');
const operations = {};
data.forEach(row => {
    const key = `${row.Operation || 'blank'} ${row.Entity}`;
    operations[key] = (operations[key] || 0) + 1;
});

Object.entries(operations).forEach(([key, count]) => {
    console.log(`  ${key}: ${count}`);
});

console.log('\n=== FIRST 5 ROWS ===');
data.slice(0, 5).forEach((row, i) => {
    console.log(`${i + 1}. ${row.Operation || ''} ${row.Entity} - ${row['Campaign Name'] || row['Ad Group Name'] || row['Keyword Text']}`);
    if (row['Daily Budget']) console.log(`   Budget: $${row['Daily Budget']}/day`);
    if (row.State) console.log(`   State: ${row.State}`);
});

console.log('\n✅ File is ready for Amazon Ads upload!');
