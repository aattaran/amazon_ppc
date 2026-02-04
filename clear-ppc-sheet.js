/**
 * Clear PPC Campaigns sheet and fetch fresh data
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

async function clearPPCSheet() {
    console.log('\n🗑️  Clearing PPC Campaigns sheet...\n');

    try {
        // Clear all data
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'PPC Campaigns!A:Z'
        });

        console.log('✅ Cleared all data from PPC Campaigns sheet');

        // Write simple column headers
        const headers = [[
            'Campaign Name',
            'State',
            'Type',
            'Budget',
            'Spend (30d)',
            'Sales (30d)',
            'Impressions',
            'Clicks',
            'Orders',
            'CTR %',
            'CPC $',
            'ACOS %',
            'ROAS',
            'CVR %',
            'Bleeder?',
            'Severity',
            'Recommendation'
        ]];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'PPC Campaigns!A1:Q1',
            valueInputOption: 'RAW',
            resource: { values: headers }
        });

        console.log('✅ Added column headers\n');

        // Set frozen rows to 1
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const ppcSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'PPC Campaigns');

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

        console.log('✅ Set frozen rows to 1');
        console.log('\n═══════════════════════════════════════════');
        console.log('✅ PPC CAMPAIGNS SHEET CLEARED!');
        console.log('═══════════════════════════════════════════\n');
        console.log('Ready to fetch fresh campaign data...\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

clearPPCSheet().then(() => process.exit(0));
