/**
 * Add Color-Coded Analysis to PPC Campaigns Sheet
 * Automatically highlights campaigns based on performance
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

// Color definitions
const COLORS = {
    RED: { red: 0.95, green: 0.76, blue: 0.76 },      // Light red - Bleeders
    ORANGE: { red: 0.98, green: 0.85, blue: 0.69 },   // Light orange - Warning
    YELLOW: { red: 1.0, green: 0.95, blue: 0.69 },    // Light yellow - Needs optimization
    GREEN: { red: 0.72, green: 0.88, blue: 0.72 },    // Light green - Winners
    WHITE: { red: 1.0, green: 1.0, blue: 1.0 }        // White - Normal
};

async function addColorCoding() {
    console.log('\n🎨 Adding color-coded analysis to PPC Campaigns...\n');

    try {
        // Get spreadsheet info
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const ppcSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'PPC Campaigns');
        const sheetId = ppcSheet.properties.sheetId;

        // Read campaign data
        const data = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'PPC Campaigns!A11:Q'  // Start after headers
        });

        const rows = data.data.values || [];
        console.log(`📊 Found ${rows.length} campaigns to analyze\n`);

        const requests = [];

        // Analyze each campaign and apply colors
        rows.forEach((row, index) => {
            const rowIndex = index + 11; // Actual row number (skip docs + headers)

            const spend = parseFloat(row[4]) || 0;
            const sales = parseFloat(row[5]) || 0;
            const orders = parseFloat(row[8]) || 0;
            const acos = parseFloat(row[11]) || 0;
            const roas = parseFloat(row[12]) || 0;
            const isBleeder = row[14] === 'YES';

            let color = COLORS.WHITE;
            let status = 'Normal';

            // Decision tree for colors
            if (isBleeder || (spend > 50 && sales === 0) || acos > 100) {
                color = COLORS.RED;
                status = '🔴 BLEEDER - Urgent';
            } else if (acos >= 50 && acos <= 100 || roas < 1.5) {
                color = COLORS.ORANGE;
                status = '🟠 Warning - Underperforming';
            } else if (acos < 30 && roas > 3.0 && orders > 5) {
                color = COLORS.GREEN;
                status = '🟢 WINNER - Scale up';
            } else if ((acos >= 30 && acos < 50) || (roas >= 1.5 && roas <= 3.0)) {
                color = COLORS.YELLOW;
                status = '🟡 Optimize';
            }

            // Add color formatting for entire row
            requests.push({
                repeatCell: {
                    range: {
                        sheetId,
                        startRowIndex: rowIndex - 1,
                        endRowIndex: rowIndex,
                        startColumnIndex: 0,
                        endColumnIndex: 17
                    },
                    cell: {
                        userEnteredFormat: {
                            backgroundColor: color
                        }
                    },
                    fields: 'userEnteredFormat.backgroundColor'
                }
            });

            if (index < 10) {  // Log first 10
                console.log(`Row ${rowIndex}: ${row[0]} - ${status}`);
            }
        });

        console.log(`\n✅ Analyzed ${rows.length} campaigns\n`);

        // Apply all formatting
        if (requests.length > 0) {
            console.log('🎨 Applying color formatting...\n');
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: { requests }
            });
            console.log('✅ Color coding applied!\n');
        }

        // Add legend to documentation section
        const legend = [
            ['🎨 COLOR LEGEND:'],
            ['🔴 RED = BLEEDER (ACOS >100% OR Spend >$50 with $0 sales) - URGENT ACTION REQUIRED'],
            ['🟠 ORANGE = WARNING (ACOS 50-100% OR ROAS <1.5) - Underperforming, optimize or pause'],
            ['🟡 YELLOW = OPTIMIZE (ACOS 30-50% OR ROAS 1.5-3.0) - Good but can improve'],
            ['🟢 GREEN = WINNER (ACOS <30% AND ROAS >3.0 AND Orders >5) - SCALE UP!'],
            ['⚪ WHITE = Normal or no data yet']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'PPC Campaigns!A6:A11',
            valueInputOption: 'RAW',
            resource: { values: legend }
        });

        console.log('✅ Legend added to doc section\n');

        console.log('═══════════════════════════════════════════');
        console.log('🎨 COLOR CODING COMPLETE!');
        console.log('═══════════════════════════════════════════\n');
        console.log('Visual Analysis Guide:');
        console.log('  🔴 Red rows = Bleeders (pause/fix immediately)');
        console.log('  🟠 Orange rows = Warning (optimize bids/targeting)');
        console.log('  🟡 Yellow rows = Can improve (tweak keywords/bids)');
        console.log('  🟢 Green rows = Winners (increase budget!)');
        console.log('  ⚪ White rows = Normal/New\n');
        console.log('💡 TIP: Sort by color to group campaigns by status!\n');
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

addColorCoding().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
