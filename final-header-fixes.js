/**
 * Final Header Fixes:
 * 1. Shorten Keywords documentation to row 12, headers at row 13
 * 2. Remove yellow background from PPC header section
 */

require('dotenv').config();
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

async function finalHeaderFixes() {
    console.log('\n🔧 Final header fixes...\n');

    try {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const keywordsSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Keywords');
        const ppcSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'PPC Campaigns');

        // ========================================
        // 1. FIX KEYWORDS - SHORTEN TO ROW 12
        // ========================================
        console.log('📊 Fixing Keywords sheet - shortening documentation...\n');

        // Read current data
        const keywordsData = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Keywords!A:Z'
        });

        const currentRows = keywordsData.data.values || [];

        // Find where actual keyword data starts (first row with a number in column A)
        let dataStartRow = 14;
        for (let i = 0; i < currentRows.length; i++) {
            const firstCell = currentRows[i][0];
            if (firstCell && !isNaN(parseFloat(firstCell)) && firstCell.toString().length < 4) {
                dataStartRow = i;
                break;
            }
        }

        console.log(`Found data starting at row ${dataStartRow + 1}\n`);

        // Preserve keyword data
        const keywordData = currentRows.slice(dataStartRow);

        // Create SHORTER documentation (rows 1-12)
        const shortenedDocs = [
            ['📊 TITAN KEYWORD OPPORTUNITIES'],
            [''],
            ['WHAT THIS SHOWS:'],
            ['All discovered keywords with search data, competition analysis, and opportunity scores. Auto-synced from Titan engine.'],
            [''],
            ['HOW TO USE:'],
            ['1. Filter by Tier (Tier 1 = best) | 2. Sort by Score (higher = better) | 3. Filter Search Volume >1000 | 4. Add top keywords to PPC campaigns'],
            [''],
            ['💡 QUICK FILTERS:'],
            ['Color Filter: Search Volume >1000 + Competition Low/Med = GREEN highlights (best opportunities)'],
            [''],
            ['═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════'],
            ['Score', 'Tier', 'Keyword', 'Search Volume', 'Competition', 'Est. CPC', 'Your Rank', 'Competitor Ranks', 'Search Freq Rank', 'Click Share %', 'Conv Share %', 'Intent', 'Match Type', 'Source', 'Status'],
            ...keywordData
        ];

        // Clear and rewrite
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Keywords!A:Z'
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Keywords!A1',
            valueInputOption: 'RAW',
            resource: { values: shortenedDocs }
        });

        console.log('✅ Keywords shortened - documentation ends at row 12, headers at row 13\n');

        // Freeze first 13 rows for Keywords
        const requests = [];

        requests.push({
            updateSheetProperties: {
                properties: {
                    sheetId: keywordsSheet.properties.sheetId,
                    gridProperties: {
                        frozenRowCount: 13
                    }
                },
                fields: 'gridProperties.frozenRowCount'
            }
        });

        console.log('❄️ Freezing first 13 rows in Keywords\n');

        // ========================================
        // 2. REMOVE YELLOW FROM PPC HEADER
        // ========================================
        console.log('🎨 Removing yellow background from PPC Campaigns header...\n');

        // Clear background color from rows 1-18 (entire header section)
        requests.push({
            repeatCell: {
                range: {
                    sheetId: ppcSheet.properties.sheetId,
                    startRowIndex: 0,
                    endRowIndex: 18,
                    startColumnIndex: 0,
                    endColumnIndex: 20
                },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: { red: 1.0, green: 1.0, blue: 1.0 }
                    }
                },
                fields: 'userEnteredFormat.backgroundColor'
            }
        });

        console.log('✅ Yellow background removed from PPC header\n');

        // Execute all requests
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: { requests }
        });

        console.log('═══════════════════════════════════════════');
        console.log('✅ FINAL FIXES COMPLETE!');
        console.log('═══════════════════════════════════════════\n');
        console.log('Keywords Sheet:');
        console.log('  Rows 1-12: Documentation');
        console.log('  Row 13: Column headers');
        console.log('  Row 14+: Keyword data');
        console.log('  Frozen: First 13 rows\n');
        console.log('PPC Campaigns Sheet:');
        console.log('  Rows 1-18: Documentation (white background)');
        console.log('  Row 19+: Campaign data (color-coded)\n');
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

finalHeaderFixes().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
