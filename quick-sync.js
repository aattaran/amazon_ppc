/**
 * Quick Sync - Push keywords from database to Google Sheets
 */

require('dotenv').config();
const KeywordDatabase = require('./src/titan/database/keywords-db');
const SheetsPushService = require('./src/titan/sync/sheets-push');

async function quickSync() {
    console.log('\n🔄 Syncing keywords to Google Sheets...\n');

    try {
        const db = new KeywordDatabase();
        const push = new SheetsPushService();

        const keywords = db.getAllKeywords();
        console.log(`📊 Found ${keywords.length} keywords in database\n`);

        await push.pushKeywords(keywords);

        console.log('\n✅ Sync complete!\n');
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

quickSync().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
