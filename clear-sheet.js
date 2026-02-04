/**
 * CLEAR GOOGLE SHEET - Utility Script
 * 
 * Purpose: Safely clear all data from the PPC Campaigns sheet
 * Use Case: When you want to start fresh before implementing the new pipeline
 * 
 * What it does:
 * - Clears ALL data from the "PPC Campaigns" sheet
 * - Includes rows 1-1000 (headers and data)
 * - Leaves the sheet structure intact
 */

require('dotenv').config();
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

const CONFIG = {
    sheetsId: process.env.GOOGLE_SHEETS_ID,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY
};

async function clearSheet() {
    console.log('🧹 GOOGLE SHEET CLEANER\n');
    console.log('Target Sheet ID:', CONFIG.sheetsId);
    console.log('Target Tab: PPC Campaigns\n');

    // Initialize Google Sheets service
    const sheets = new UnifiedSheetsService({
        serviceAccountEmail: CONFIG.serviceAccountEmail,
        privateKey: CONFIG.privateKey
    });

    try {
        console.log('⚠️  WARNING: This will clear ALL data from "PPC Campaigns" sheet!');
        console.log('   Range: A1:Z1000 (everything)\n');
        console.log('   Proceeding in 2 seconds...\n');

        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('🗑️  Clearing sheet...');

        await sheets.clearRange(
            'PPC Campaigns',
            'A1:Z1000'
        );

        console.log('✅ Sheet cleared successfully!\n');
        console.log('The "PPC Campaigns" sheet is now completely empty.');
        console.log('You can now run fetch-ppc-campaigns.js to start fresh.\n');

    } catch (error) {
        console.error('❌ Error clearing sheet:', error.message);
        console.error('\nDetails:', error);
        process.exit(1);
    }
}

// Run the cleaner
clearSheet().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
