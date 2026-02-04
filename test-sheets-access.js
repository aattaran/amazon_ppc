/**
 * Test Google Sheets Connection
 * Verifies we can read/write to the PPC Campaigns sheet
 */

require('dotenv').config();
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

async function testSheetAccess() {
    const sheets = new UnifiedSheetsService();
    const sheetName = 'PPC Campaigns';

    console.log('\n🧪 Testing Google Sheets Access...\n');
    console.log(`Spreadsheet ID: ${process.env.GOOGLE_SHEETS_ID}`);
    console.log(`Sheet Name: ${sheetName}\n`);

    try {
        // Test 1: Read existing data
        console.log('📖 Test 1: Reading current sheet data...');
        const currentData = await sheets.readSheet(sheetName);
        console.log(`   Found ${currentData.length} existing rows`);
        if (currentData.length > 0) {
            console.log(`   First row:`, currentData[0]);
            console.log(`   Last row:`, currentData[currentData.length - 1]);
        }

        // Test 2: Write a test row
        console.log('\n✍️  Test 2: Writing test row to A11...');
        const testRow = [['TEST', 'ENABLED', 'AUTO', 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'NO', 'NONE', 'Test row']];
        await sheets.writeRows(sheetName, testRow, 'A11');
        console.log('   ✅ Test row written');

        // Test 3: Read it back
        console.log('\n📖 Test 3: Reading back row 11...');
        const readBack = await sheets.readSheet(sheetName);
        if (readBack.length >= 11) {
            console.log(`   Row 11 data:`, readBack[10]); // 0-indexed
        } else {
            console.log(`   ⚠️  Only found ${readBack.length} rows total`);
        }

        console.log('\n✅ All tests complete!\n');
        console.log('🔗 Check manually: https://docs.google.com/spreadsheets/d/' + process.env.GOOGLE_SHEETS_ID);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

testSheetAccess();
