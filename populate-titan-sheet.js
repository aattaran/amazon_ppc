/**
 * Populate Existing Titan Sheet with Template
 * This script populates an EXISTING sheet that you've already created and shared
 * 
 * Instructions:
 * 1. Create a blank Google Sheet at https://sheets.google.com
 * 2. Share it with: amazonppc@amazonppc-485401.iam.gserviceaccount.com (Editor)
 * 3. Add the Sheet ID to your .env file
 * 4. Run: node populate-titan-sheet.js
 */

require('dotenv').config();
const { google } = require('googleapis');

async function populateSheet() {
    console.log('\n🎨 Populating Titan Sheet Template...\n');

    try {
        if (!process.env.GOOGLE_SHEETS_ID) {
            console.error('❌ Please add GOOGLE_SHEETS_ID to your .env file first!');
            console.log('\n📝 Steps:');
            console.log('   1. Create a blank sheet at: https://sheets.google.com');
            console.log('   2. Share with: ' + process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
            console.log('   3. Copy the Sheet ID from the URL');
            console.log('   4. Add to .env: GOOGLE_SHEETS_ID=YOUR_SHEET_ID');
            process.exit(1);
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

        console.log('📊 Sheet ID:', spreadsheetId);
        console.log('🔗 URL: https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit\n');

        // 1. Rename first sheet and add more sheets
        console.log('📝 Creating tabs...');

        const getResponse = await sheets.spreadsheets.get({ spreadsheetId });
        const firstSheetId = getResponse.data.sheets[0].properties.sheetId;

        const requests = [
            // Rename Sheet1 to Keywords
            {
                updateSheetProperties: {
                    properties: { sheetId: firstSheetId, title: 'Keywords' },
                    fields: 'title'
                }
            },
            // Add other sheets
            { addSheet: { properties: { title: 'Campaigns', gridProperties: { frozenRowCount: 1 } } } },
            { addSheet: { properties: { title: 'Performance', gridProperties: { frozenRowCount: 1 } } } },
            { addSheet: { properties: { title: 'Settings' } } },
            { addSheet: { properties: { title: 'Competitors', gridProperties: { frozenRowCount: 1 } } } },
            { addSheet: { properties: { title: 'Analytics' } } }
        ];

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: { requests }
        });
        console.log('✅ Created 6 tabs\n');

        // 2. Populate Keywords tab
        console.log('📝 Setting up Keywords tab...');
        await populateKeywordsTab(sheets, spreadsheetId);

        // 3. Populate Campaigns tab
        console.log('📝 Setting up Campaigns tab...');
        await populateCampaignsTab(sheets, spreadsheetId);

        // 4. Populate Performance tab
        console.log('📝 Setting up Performance tab...');
        await populatePerformanceTab(sheets, spreadsheetId);

        // 5. Populate Settings tab
        console.log('📝 Setting up Settings tab...');
        await populateSettingsTab(sheets, spreadsheetId);

        // 6. Populate Competitors tab
        console.log('📝 Setting up Competitors tab...');
        await populateCompetitorsTab(sheets, spreadsheetId);

        // 7. Populate Analytics tab
        console.log('📝 Setting up Analytics tab...');
        await populateAnalyticsTab(sheets, spreadsheetId);

        // 8. Format headers
        console.log('\n🎨 Applying formatting...');
        await formatSheets(sheets, spreadsheetId);

        console.log('\n🎉 SUCCESS! Your Titan Sheet is fully configured!\n');
        console.log('📊 Open it here: https://docs.google.com/spreadsheets/d/' + spreadsheetId + '/edit\n');
        console.log('✨ Ready to sync keyword data from Titan!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.code === 404) {
            console.log('\n💡 Make sure you:');
            console.log('   1. Created the sheet');
            console.log('   2. Shared it with:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
            console.log('   3. Have the correct Sheet ID in .env');
        }
        throw error;
    }
}

async function populateKeywordsTab(sheets, spreadsheetId) {
    const data = [
        // Headers
        ['⭐', 'Score', 'Keyword', 'Search Vol', 'Competition', 'Est. CPC', 'Your Rank',
            'Comp Ranks', 'Tier', 'Match Type', 'Suggested Bid', 'Your Bid', 'TOS %', 'PP %',
            'Status', 'Campaign', 'Notes', 'Source', 'Added Date', 'Last Updated'],
        // Example row with formulas
        ['=IF(B2>=80,"🟢",IF(B2>=60,"🟡",IF(B2>=40,"🟠","⚪")))',
            85, 'dihydroberberine supplement', 2244, 0.68, 1.85, 23, '1,3,5,7',
            'Tier 1', 'EXACT', '=ROUND(F2*0.85,2)', '=K2', 200, 100, 'Ready',
            '', 'Example keyword - delete this row', 'manual', '=TODAY()', '=NOW()']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Keywords!A1:T2',
        valueInputOption: 'USER_ENTERED',
        resource: { values: data }
    });
}

async function populateCampaignsTab(sheets, spreadsheetId) {
    const data = [
        ['Status', 'Campaign Name', 'Tier', 'Daily Budget', 'Keywords Count', 'Avg Bid',
            'Est Daily Spend', 'Target ROAS', 'Deploy Status', 'Start Date', 'Notes'],
        ['🟡', '[Tier 1] Blood Sugar - Conquest', 'Tier 1', 50,
            '=COUNTIF(Keywords!P:P,B2)', '=AVERAGEIF(Keywords!P:P,B2,Keywords!L:L)',
            '=SUMIF(Keywords!P:P,B2,Keywords!L:L)*10', 3.0, 'Ready', '=TODAY()',
            'Example campaign - delete this row']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Campaigns!A1:K2',
        valueInputOption: 'USER_ENTERED',
        resource: { values: data }
    });
}

async function populatePerformanceTab(sheets, spreadsheetId) {
    const data = [
        ['Keyword', 'Impressions', 'Clicks', 'CTR', 'Orders', 'CVR', 'Spend', 'Sales',
            'ROAS', 'ACoS', 'Status', 'Action'],
        ['dihydroberberine supplement', 892, 14, '=C2/B2', 2, '=E2/C2', 21.98, 238.40,
            '=H2/G2', '=G2/H2',
            '=IF(I2>=4,"🟢",IF(I2>=3,"🟡",IF(I2>=2,"🟠","🔴")))',
            '=IF(I2>=4,"INCREASE BID",IF(I2<2,"PAUSE","MAINTAIN"))']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Performance!A1:L2',
        valueInputOption: 'USER_ENTERED',
        resource: { values: data }
    });
}

async function populateSettingsTab(sheets, spreadsheetId) {
    const data = [
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
        resource: { values: data }
    });
}

async function populateCompetitorsTab(sheets, spreadsheetId) {
    const data = [
        ['ASIN', 'Brand', 'Product', 'Your Rank', 'Their Rank', 'Keywords Count', 'Threat Level'],
        ['B0CNS2PBHX', 'Double Wood', 'DHB 200mg', 23, 1, 1847, '🔴 High Threat'],
        ['B0CWC6F56X', "Nature's Fusion", 'Berberine 500mg', 18, 3, 923, '🟡 Watch'],
        ['B095JCB9B9', 'Peak Performance', 'DHB Capsules', 12, 5, 634, '🟢 Low Threat']
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Competitors!A1:G4',
        valueInputOption: 'RAW',
        resource: { values: data }
    });
}

async function populateAnalyticsTab(sheets, spreadsheetId) {
    const data = [
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
        resource: { values: data }
    });
}

async function formatSheets(sheets, spreadsheetId) {
    // Get all sheet IDs
    const getResponse = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetIds = {};
    getResponse.data.sheets.forEach(sheet => {
        sheetIds[sheet.properties.title] = sheet.properties.sheetId;
    });

    const requests = [
        // Bold all header rows across all sheets
        ...Object.values(sheetIds).map(sheetId => ({
            repeatCell: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                cell: { userEnteredFormat: { textFormat: { bold: true, fontSize: 11 }, backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 } } },
                fields: 'userEnteredFormat(textFormat,backgroundColor)'
            }
        })),
        // Freeze header rows
        ...Object.values(sheetIds).slice(0, 5).map(sheetId => ({
            updateSheetProperties: {
                properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
                fields: 'gridProperties.frozenRowCount'
            }
        })),
        // Set column widths for Keywords
        {
            updateDimensionProperties: {
                range: { sheetId: sheetIds['Keywords'], dimension: 'COLUMNS', startIndex: 2, endIndex: 3 },
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

// Run the script
populateSheet()
    .then(() => {
        console.log('✨ Complete! Your sheet is ready to use.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Failed:', error);
        process.exit(1);
    });
