/**
 * Simple Fix: Just delete first 13 rows (duplicate docs) and keep everything else
 */

require('dotenv').config();
const { google } = require('googleapis');

async function simpleFix() {
    console.log('\n🔧 Simple fix: Deleting duplicate header rows...\n');

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    try {
        // Get the sheet ID first
        const response = await sheets.spreadsheets.get({
            spreadsheetId
        });

        const keywordsSheet = response.data.sheets.find(s => s.properties.title === 'Keywords');
        const sheetId = keywordsSheet.properties.sheetId;

        console.log('✅ Found Keywords sheet (ID: ' + sheetId + ')\n');
        console.log('📝 Deleting rows 1-13 (duplicate documentation)...\n');

        // Delete rows 1-13
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: 0,  // Row 1
                            endIndex: 13    // Up to row 13
                        }
                    }
                }]
            }
        });

        console.log('✅ Deleted duplicate headers!\n');
        console.log('The sheet now starts with the proper header structure.\n');
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

simpleFix().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
