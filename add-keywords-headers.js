/**
 * Add Missing Column Headers to Keywords Sheet
 * Insert proper header row at row 14
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

async function addKeywordHeaders() {
    console.log('\n🔧 Adding column headers to Keywords sheet...\n');

    try {
        // Get sheet ID
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const keywordsSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Keywords');
        const sheetId = keywordsSheet.properties.sheetId;

        console.log('Found Keywords sheet (ID: ' + sheetId + ')\n');

        // Insert 1 row at position 14 (after documentation, before data)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    insertDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: 13,  // Insert at row 14 (0-indexed = 13)
                            endIndex: 14
                        }
                    }
                }]
            }
        });

        console.log('✅ Inserted new row at position 14\n');

        // Write column headers to row 14
        const headers = [[
            'Score',
            'Tier',
            'Keyword',
            'Search Volume',
            'Competition',
            'Est. CPC',
            'Your Rank',
            'Competitor Ranks',
            'Search Freq Rank',
            'Click Share %',
            'Conv Share %',
            'Intent',
            'Match Type',
            'Source',
            'Status'
        ]];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Keywords!A14:O14',
            valueInputOption: 'RAW',
            resource: { values: headers }
        });

        console.log('✅ Column headers added to row 14\n');
        console.log('Headers: Score, Tier, Keyword, Search Volume, Competition, Est. CPC, Your Rank, Competitor Ranks, etc.\n');

        // Verify structure
        const verification = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Keywords!A1:A20'
        });

        console.log('═══════════════════════════════════════════');
        console.log('✅ KEYWORDS SHEET STRUCTURE');
        console.log('═══════════════════════════════════════════\n');

        const rows = verification.data.values || [];
        rows.slice(0, 20).forEach((row, i) => {
            const rowNum = i + 1;
            const content = row[0] || '';
            if (rowNum <= 14) {
                console.log(`Row ${rowNum}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
            }
        });

        console.log('\nRow 14: Headers');
        console.log('Row 15+: Keyword data\n');
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

addKeywordHeaders().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
