/**
 * Remove PPC Campaigns Header Documentation
 * Just delete rows 1-9 (all documentation) and keep only column headers + data
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

async function removeHeaders() {
    console.log('\n🗑️  Removing PPC Campaigns documentation section...\n');

    try {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const ppcSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'PPC Campaigns');

        // Delete rows 1-9 (all documentation)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: ppcSheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: 0,  // Row 1
                            endIndex: 9     // Through row 9
                        }
                    }
                }]
            }
        });

        console.log('✅ Deleted rows 1-9 (documentation section)');

        // Now row 10 (column headers) becomes row 1
        // Data starts at row 2

        // Set frozen rows to 1 (just the header)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    updateSheetProperties: {
                        properties: {
                            sheetId: ppcSheet.properties.sheetId,
                            gridProperties: { frozenRowCount: 1 }
                        },
                        fields: 'gridProperties.frozenRowCount'
                    }
                }]
            }
        });

        console.log('✅ Set frozen rows to 1 (just column headers)\n');
        console.log('═══════════════════════════════════════════');
        console.log('✅ PPC CAMPAIGNS SHEET SIMPLIFIED!');
        console.log('═══════════════════════════════════════════\n');
        console.log('New structure:');
        console.log('  Row 1: Column headers');
        console.log('  Row 2+: Campaign data');
        console.log('  Frozen: Just row 1\n');
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

removeHeaders().then(() => process.exit(0));
