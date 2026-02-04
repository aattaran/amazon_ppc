/**
 * Manual Sync Script
 * Run this anytime to manually sync Titan with Google Sheets
 * 
 * Usage:
 *   node sync-now.js
 *   node sync-now.js --push-only
 *   node sync-now.js --pull-only
 */

require('dotenv').config();
const SyncCoordinator = require('./src/titan/sync/sync-coordinator');
const KeywordDatabase = require('./src/titan/database/keywords-db');

async function main() {
    const args = process.argv.slice(2);
    const pushOnly = args.includes('--push-only');
    const pullOnly = args.includes('--pull-only');

    console.log('\n═══════════════════════════════════════════');
    console.log('  🚀 TITAN × GOOGLE SHEETS SYNC');
    console.log('═══════════════════════════════════════════\n');

    // Check environment variables
    if (!process.env.GOOGLE_SHEETS_ID) {
        console.error('❌ GOOGLE_SHEETS_ID not set in .env file');
        process.exit(1);
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        console.error('❌ GOOGLE_SERVICE_ACCOUNT_EMAIL not set in .env file');
        process.exit(1);
    }

    console.log('✅ Sheet ID:', process.env.GOOGLE_SHEETS_ID);
    console.log('✅ Service Account:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.log('🔗 Sheet URL: https://docs.google.com/spreadsheets/d/' + process.env.GOOGLE_SHEETS_ID + '/edit\n');

    try {
        // Initialize with real database
        const titanDB = new KeywordDatabase();
        const coordinator = new SyncCoordinator(titanDB);

        // Run sync
        if (pushOnly) {
            console.log('📤 Running PUSH only (Titan → Sheets)...\n');
            await coordinator.pushToSheets();
        } else if (pullOnly) {
            console.log('📥 Running PULL only (Sheets → Titan)...\n');
            await coordinator.pullFromSheets();
        } else {
            console.log('🔄 Running FULL bidirectional sync...\n');
            await coordinator.fullSync();
        }

        console.log('\n═══════════════════════════════════════════');
        console.log('  ✅ SYNC COMPLETE!');
        console.log('═══════════════════════════════════════════\n');
        console.log('📊 Check your Google Sheet:');
        console.log('   https://docs.google.com/spreadsheets/d/' + process.env.GOOGLE_SHEETS_ID + '/edit\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Sync failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

main();
