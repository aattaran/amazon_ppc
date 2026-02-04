/**
 * Fix Duplicate Headers - Remove the duplicate and fix structure
 */

require('dotenv').config();
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

async function fixDuplicateHeaders() {
    console.log('\n🔧 Fixing duplicate headers in Keywords sheet...\n');

    const sheets = new UnifiedSheetsService();

    try {
        // Read current data
        const currentData = await sheets.readSheet('Keywords');

        // Find where the REAL data starts (has "Score" column header)
        let dataStartIndex = -1;
        for (let i = 0; i < currentData.length; i++) {
            const row = currentData[i];
            if (row && row[0] && row[0].toString().includes('Score') &&
                row[1] && row[1].toString().includes('Keyword')) {
                dataStartIndex = i;
                console.log(`✅ Found data header at row ${i + 1}\n`);
                break;
            }
        }

        if (dataStartIndex === -1) {
            console.log('❌ Could not find data headers (Score, Keyword)\n');
            return;
        }

        // Keep only the data from dataStartIndex onwards
        const dataToKeep = currentData.slice(dataStartIndex);

        // Create proper structure:
        // 1. Title
        // 2. Blank
        // 3-10. Documentation
        // 11. Separator
        // 12. Blank
        // 13+. Data (headers + rows)

        const properStructure = [
            ['📊 TITAN KEYWORD OPPORTUNITIES'],
            [''],
            ['WHAT THIS SHOWS:'],
            ['All discovered keywords with search data, competition analysis, and opportunity scores. Auto-synced from Titan engine.'],
            [''],
            ['HOW TO USE:'],
            ['1. Filter by Tier (Tier 1 = best) | 2. Sort by Score (higher = better) | 3. Filter Search Volume >1000 | 4. Filter Competition = Low or Medium | 5. Add top keywords to PPC campaigns'],
            [''],
            ['💡 QUICK FILTERS:'],
            ['Color Filter: Search Volume >1000 + Competition Low/Med = GREEN highlights (best opportunities)'],
            [''],
            ['═══════════════════════════════════════════════════════════════════════════════════════════════════'],
            [''],
            ...dataToKeep
        ];

        console.log('📝 Clearing sheet and writing correct structure...\n');

        // Clear entire sheet
        await sheets.clearSheet('Keywords');

        // Write proper structure
        await sheets.writeRows('Keywords', properStructure, 'A1');

        console.log('✅ Headers fixed!\n');
        console.log('Sheet structure:');
        console.log('  Row 1: Title');
        console.log('  Rows 3-10: Documentation');
        console.log('  Row 12: Separator');
        console.log('  Row 14+: Data headers + keywords\n');
        console.log(`  Total keywords: ${dataToKeep.length - 1}\n`);
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

fixDuplicateHeaders().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
