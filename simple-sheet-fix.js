/**
 * SIMPLE SHEET FIX - Final Version
 * Just fix the structure without detection - we know where data is!
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

async function simpleFix() {
    console.log('\n🔧 Simple sheet structure fix...\n');

    try {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const keywordsSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Keywords');
        const ppcSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'PPC Campaigns');

        const requests = [];

        // ========================================
        // KEYWORDS: Fix structure
        // Currently: Row 1 has docs, Row 2+ has data
        // Goal: Rows 1-12 docs, Row 13 headers, Row 14+ data
        // ========================================
        console.log('📊 Fixing Keywords sheet...\n');

        // Insert 12 rows at the top
        requests.push({
            insertDimension: {
                range: {
                    sheetId: keywordsSheet.properties.sheetId,
                    dimension: 'ROWS',
                    startIndex: 0,
                    endIndex: 12
                }
            }
        });
        console.log('  Inserting 12 documentation rows at top');

        // Set frozen rows to 13
        requests.push({
            updateSheetProperties: {
                properties: {
                    sheetId: keywordsSheet.properties.sheetId,
                    gridProperties: { frozenRowCount: 13 }
                },
                fields: 'gridProperties.frozenRowCount'
            }
        });
        console.log('  Setting frozen rows to 13\n');

        // ========================================
        // PPC: Just set frozen rows
        // Don't touch the data!
        // ========================================
        console.log('📊 Fixing PPC Campaigns sheet...\n');

        requests.push({
            updateSheetProperties: {
                properties: {
                    sheetId: ppcSheet.properties.sheetId,
                    gridProperties: { frozenRowCount: 10 }
                },
                fields: 'gridProperties.frozenRowCount'
            }
        });
        console.log('  Setting frozen rows to 10\n');

        // Execute
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: { requests }
        });

        console.log('✅ Structure fixed!\n');

        // Write documentation
        const docs = [
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
            ['═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Keywords!A1:A12',
            valueInputOption: 'RAW',
            resource: { values: docs }
        });

        console.log('✅ Documentation written\n');
        console.log('═══════════════════════════════════════════');
        console.log('🎉 SHEETS FIXED!');
        console.log('═══════════════════════════════════════════\n');
        console.log('Keywords:');
        console.log('  Rows 1-12: Documentation');
        console.log('  Row 13: Original header (now visible)');
        console.log('  Row 14+: Keyword data');
        console.log('  Frozen: 13 rows\n');
        console.log('PPC Campaigns:');
        console.log('  Frozen: 10 rows\n');
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

simpleFix().then(() => process.exit(0));
