/**
 * Remove orange background from ARCHIVED campaigns
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

async function removeArchivedColors() {
    console.log('\n🎨 Removing colors from ARCHIVED campaigns...\n');

    try {
        // Get sheet info
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const ppcSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'PPC Campaigns');
        const sheetId = ppcSheet.properties.sheetId;

        // Read all campaign data
        const data = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'PPC Campaigns!A2:Q200'
        });

        const rows = data.data.values || [];
        const requests = [];

        // Find ARCHIVED campaigns and clear their background
        let archivedCount = 0;
        rows.forEach((row, i) => {
            const state = row[1]; // Column B - State
            if (state === 'ARCHIVED') {
                const rowIndex = i + 1; // 0-indexed to 1-indexed (row 2 = index 1)

                // Clear background color for this entire row
                requests.push({
                    repeatCell: {
                        range: {
                            sheetId: sheetId,
                            startRowIndex: rowIndex,
                            endRowIndex: rowIndex + 1,
                            startColumnIndex: 0,
                            endColumnIndex: 17 // All columns A-Q
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 1.0, green: 1.0, blue: 1.0 } // White
                            }
                        },
                        fields: 'userEnteredFormat.backgroundColor'
                    }
                });
                archivedCount++;
            }
        });

        if (requests.length > 0) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: { requests }
            });
            console.log(`✅ Removed colors from ${archivedCount} ARCHIVED campaigns\n`);
        } else {
            console.log('ℹ️  No ARCHIVED campaigns found\n');
        }

        console.log('═══════════════════════════════════════════');
        console.log('✅ COLORS REMOVED!');
        console.log('═══════════════════════════════════════════\n');
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

removeArchivedColors().then(() => process.exit(0));
