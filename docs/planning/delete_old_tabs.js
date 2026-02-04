/**
 * DELETE OLD TABS - Run this to remove old unnumbered tabs
 * 
 * INSTRUCTIONS:
 * 1. Open Google Sheets → Extensions → Apps Script
 * 2. Paste this script in a NEW file (File → New → Script file)
 * 3. Name it "DeleteOldTabs"
 * 4. Click Run → Select "deleteOldTabs"
 * 5. Authorize when prompted
 */

function deleteOldTabs() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Old tab names to delete (without numbers)
    const oldTabNames = [
        'PPC Campaigns',
        'Ad Groups',
        'Keywords',
        'Targeting Clauses',
        'Negative Keywords',
        'Campaigns',  // In case there's one without prefix
        'Product Segments',  // Legacy
        'Competitors',  // Legacy
        'Analytics',  // Legacy
        'Tier Criteria',  // Legacy
        'Balance',  // Legacy
        'Settings'  // Legacy
    ];

    Logger.log('🗑️ Deleting old tabs...');

    let deletedCount = 0;

    oldTabNames.forEach(tabName => {
        const sheet = ss.getSheetByName(tabName);
        if (sheet) {
            // Don't delete if it's the only sheet
            if (ss.getSheets().length > 1) {
                ss.deleteSheet(sheet);
                Logger.log(`   ✅ Deleted: ${tabName}`);
                deletedCount++;
            } else {
                Logger.log(`   ⚠️  Skipped: ${tabName} (can't delete last sheet)`);
            }
        }
    });

    Logger.log(`\n✅ Cleanup complete! Deleted ${deletedCount} old tabs.`);
    Logger.log('Refresh your Google Sheets page to see changes.');
}

/**
 * Verify what tabs exist
 */
function listAllTabs() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ss.getSheets();

    Logger.log('📋 Current tabs in spreadsheet:');
    sheets.forEach((sheet, index) => {
        Logger.log(`   ${index + 1}. ${sheet.getName()}`);
    });

    Logger.log(`\nTotal: ${sheets.length} tabs`);
}
