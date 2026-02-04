/**
 * Titan Google Sheets Template Generator
 * Creates a fully pre-configured Google Sheet with all tabs, formulas, and formatting
 * 
 * Run: node create-titan-sheet.js
 */

require('dotenv').config();
const { google } = require('googleapis');

async function createTitanSheet() {
    console.log('\n🚀 Creating Titan Keyword Master Sheet...\n');

    try {
        // 1. Set up authentication with BOTH Drive and Sheets scopes
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            },
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',  // For editing sheets
                'https://www.googleapis.com/auth/drive'          // For creating sheets (full access)
            ]
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // 2. Create the spreadsheet
        console.log('📊 Creating spreadsheet...');
        const spreadsheet = await sheets.spreadsheets.create({
            resource: {
                properties: {
                    title: 'Titan Keyword Master',
                    locale: 'en_US',
                    timeZone: 'America/Chicago'
                },
                sheets: [
                    { properties: { title: 'Keywords', gridProperties: { frozenRowCount: 1 } } },
                    { properties: { title: 'Campaigns', gridProperties: { frozenRowCount: 1 } } },
                    { properties: { title: 'Performance', gridProperties: { frozenRowCount: 1 } } },
                    { properties: { title: 'Settings', gridProperties: { frozenRowCount: 1 } } },
                    { properties: { title: 'Competitors', gridProperties: { frozenRowCount: 1 } } },
                    { properties: { title: 'Analytics', gridProperties: { frozenRowCount: 1 } } }
                ]
            }
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId;
        console.log('✅ Spreadsheet created!');
        console.log('   ID:', spreadsheetId);
        console.log('   URL:', `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);

        // 3. Set up Keywords tab
        console.log('\n📝 Setting up Keywords tab...');
        await setupKeywordsTab(sheets, spreadsheetId);

        // 4. Set up Campaigns tab
        console.log('📝 Setting up Campaigns tab...');
        await setupCampaignsTab(sheets, spreadsheetId);

        // 5. Set up Performance tab
        console.log('📝 Setting up Performance tab...');
        await setupPerformanceTab(sheets, spreadsheetId);

        // 6. Set up Settings tab
        console.log('📝 Setting up Settings tab...');
        await setupSettingsTab(sheets, spreadsheetId);

        // 7. Set up Competitors tab
        console.log('📝 Setting up Competitors tab...');
        await setupCompetitorsTab(sheets, spreadsheetId);

        // 8. Set up Analytics tab
        console.log('📝 Setting up Analytics tab...');
        await setupAnalyticsTab(sheets, spreadsheetId);

        // 9. Apply formatting
        console.log('\n🎨 Applying formatting...');
        await applyFormatting(sheets, spreadsheetId);

        // 10. Update .env file
        console.log('\n📝 Updating .env file...');
        await updateEnvFile(spreadsheetId);

        console.log('\n🎉 SUCCESS! Your Titan Sheet is ready!\n');
        console.log('📊 Sheet URL: https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit');
        console.log('\n📋 Next Steps:');
        console.log('   1. Open the sheet (link above)');
        console.log('   2. Click "Share" and add your email (optional)');
        console.log('   3. Review all tabs and settings');
        console.log('   4. Run: node test-google-sheets.js (to verify)\n');

        return spreadsheetId;

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

// Set up Keywords tab with headers and formulas
async function setupKeywordsTab(sheets, spreadsheetId) {
    const headers = [
        ['⭐', 'Score', 'Keyword', 'Search Vol', 'Competition', 'Est. CPC', 'Your Rank',
            'Comp Ranks', 'Tier', 'Match Type', 'Suggested Bid', 'Your Bid', 'TOS %', 'PP %',
            'Status', 'Campaign', 'Notes', 'Source', 'Added Date', 'Last Updated']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Keywords!A1:T1',
        valueInputOption: 'RAW',
        resource: { values: headers }
    });

    // Add formulas for row 2 (example row)
    const formulas = [
        ['=IF(B2>=80,"🟢",IF(B2>=60,"🟡",IF(B2>=40,"🟠","⚪")))', // Icon
            85, // Score (example)
            'dihydroberberine supplement', // Keyword
            2244, // Search Vol
            0.68, // Competition
            1.85, // Est. CPC
            23, // Your Rank
            '1,3,5,7', // Comp Ranks
            'Tier 1', // Tier
            'EXACT', // Match Type
            '=ROUND(F2*0.85,2)', // Suggested Bid
            '=K2', // Your Bid (defaults to suggested)
            200, // TOS %
            100, // PP %
            'Ready', // Status
            '', // Campaign
            'Example keyword', // Notes
            'manual', // Source
            '=TODAY()', // Added Date
            '=NOW()'] // Last Updated
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Keywords!A2:T2',
        valueInputOption: 'USER_ENTERED',
        resource: { values: formulas }
    });
}

// Set up Campaigns tab
async function setupCampaignsTab(sheets, spreadsheetId) {
    const headers = [
        ['Status', 'Campaign Name', 'Tier', 'Daily Budget', 'Keywords Count', 'Avg Bid',
            'Est Daily Spend', 'Target ROAS', 'Deploy Status', 'Start Date', 'Notes']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Campaigns!A1:K1',
        valueInputOption: 'RAW',
        resource: { values: headers }
    });

    // Example campaign
    const example = [
        ['🟡', '[Tier 1] Blood Sugar - Conquest', 'Tier 1', 50,
            '=COUNTIF(Keywords!P:P,B2)', '=AVERAGEIF(Keywords!P:P,B2,Keywords!L:L)',
            '=SUMIF(Keywords!P:P,B2,Keywords!L:L)*10', 3.0, 'Ready', '=TODAY()',
            'Example conquest campaign']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Campaigns!A2:K2',
        valueInputOption: 'USER_ENTERED',
        resource: { values: example }
    });
}

// Set up Performance tab
async function setupPerformanceTab(sheets, spreadsheetId) {
    const headers = [
        ['Keyword', 'Impressions', 'Clicks', 'CTR', 'Orders', 'CVR', 'Spend', 'Sales',
            'ROAS', 'ACoS', 'Status', 'Action']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Performance!A1:L1',
        valueInputOption: 'RAW',
        resource: { values: headers }
    });

    // Example with formulas
    const example = [
        ['dihydroberberine supplement', 892, 14, '=C2/B2', 2, '=E2/C2', 21.98, 238.40,
            '=H2/G2', '=G2/H2', '=IF(I2>=4,"🟢",IF(I2>=3,"🟡",IF(I2>=2,"🟠","🔴")))',
            '=IF(I2>=4,"INCREASE BID",IF(I2<2,"PAUSE","MAINTAIN"))']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Performance!A2:L2',
        valueInputOption: 'USER_ENTERED',
        resource: { values: example }
    });
}

// Set up Settings tab
async function setupSettingsTab(sheets, spreadsheetId) {
    const settings = [
        ['TITAN SETTINGS', ''],
        ['', ''],
        ['Target CPA', 15.00],
        ['Target ROAS', 3.0],
        ['Min Clicks for Decision', 10],
        ['Auto-Deploy Tier 1', 'Yes'],
        ['Auto-Pause Threshold', '2.0'],
        ['DataForSEO Enabled', 'Yes'],
        ['Sync Frequency', 'Hourly'],
        ['', ''],
        ['TIER BUDGETS', ''],
        ['Tier 1 Monthly', 1500],
        ['Tier 2 Monthly', 900],
        ['Tier 3 Monthly', 450],
        ['Tier 4 Monthly', 150],
        ['', ''],
        ['BID MULTIPLIERS', ''],
        ['Aggressive TOS %', 200],
        ['Aggressive PP %', 100],
        ['Moderate TOS %', 150],
        ['Moderate PP %', 75],
        ['Conservative TOS %', 100],
        ['Conservative PP %', 50]
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Settings!A1:B23',
        valueInputOption: 'USER_ENTERED',
        resource: { values: settings }
    });
}

// Set up Competitors tab
async function setupCompetitorsTab(sheets, spreadsheetId) {
    const headers = [
        ['ASIN', 'Brand', 'Product', 'Your Rank', 'Their Rank', 'Keywords Count', 'Threat Level']
    ];

    const examples = [
        ['B0CNS2PBHX', 'Double Wood', 'DHB 200mg', 23, 1, 1847, '🔴 High Threat'],
        ['B0CWC6F56X', "Nature's Fusion", 'Berberine 500mg', 18, 3, 923, '🟡 Watch'],
        ['B095JCB9B9', 'Peak Performance', 'DHB Capsules', 12, 5, 634, '🟢 Low Threat']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Competitors!A1:G1',
        valueInputOption: 'RAW',
        resource: { values: headers }
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Competitors!A2:G4',
        valueInputOption: 'RAW',
        resource: { values: examples }
    });
}

// Set up Analytics tab
async function setupAnalyticsTab(sheets, spreadsheetId) {
    const content = [
        ['TITAN ANALYTICS DASHBOARD', '', '', ''],
        ['', '', '', ''],
        ['Metrics Summary', '', '', ''],
        ['Total Keywords', '=COUNTA(Keywords!C:C)-1', '', ''],
        ['Active Campaigns', '=COUNTIF(Campaigns!I:I,"Live")', '', ''],
        ['Avg Opportunity Score', '=AVERAGE(Keywords!B:B)', '', ''],
        ['', '', '', ''],
        ['Keywords by Tier', '', '', ''],
        ['Tier 1', '=COUNTIF(Keywords!I:I,"Tier 1")', '', ''],
        ['Tier 2', '=COUNTIF(Keywords!I:I,"Tier 2")', '', ''],
        ['Tier 3', '=COUNTIF(Keywords!I:I,"Tier 3")', '', ''],
        ['Tier 4', '=COUNTIF(Keywords!I:I,"Tier 4")', '', ''],
        ['Tier 5', '=COUNTIF(Keywords!I:I,"Tier 5")', '', ''],
        ['', '', '', ''],
        ['Performance Metrics', '', '', ''],
        ['Total Spend', '=SUM(Performance!G:G)', '', ''],
        ['Total Revenue', '=SUM(Performance!H:H)', '', ''],
        ['Overall ROAS', '=B17/B16', '', '']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Analytics!A1:D18',
        valueInputOption: 'USER_ENTERED',
        resource: { values: content }
    });
}

// Apply formatting (colors, bold headers, etc.)
async function applyFormatting(sheets, spreadsheetId) {
    const requests = [
        // Bold all header rows
        {
            repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                cell: { userEnteredFormat: { textFormat: { bold: true } } },
                fields: 'userEnteredFormat.textFormat.bold'
            }
        },
        // Set column widths for Keywords tab
        {
            updateDimensionProperties: {
                range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 },
                properties: { pixelSize: 250 },
                fields: 'pixelSize'
            }
        }
    ];

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests }
    });
}

// Update .env file with new Sheet ID
async function updateEnvFile(spreadsheetId) {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');

    let envContent = fs.readFileSync(envPath, 'utf8');

    // Replace the GOOGLE_SHEETS_ID line
    if (envContent.includes('GOOGLE_SHEETS_ID=')) {
        envContent = envContent.replace(
            /GOOGLE_SHEETS_ID=.*/,
            `GOOGLE_SHEETS_ID=${spreadsheetId}`
        );
    } else {
        envContent += `\nGOOGLE_SHEETS_ID=${spreadsheetId}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Sheet ID added to .env');
}

// Run the script
createTitanSheet()
    .then(spreadsheetId => {
        console.log('✨ All done! Sheet ID:', spreadsheetId);
        process.exit(0);
    })
    .catch(error => {
        console.error('Failed to create sheet:', error);
        process.exit(1);
    });
