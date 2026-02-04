const { google } = require('googleapis');
require('dotenv').config();

(async () => {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const data = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: 'PPC Campaigns!A11:C200'
    });

    const rows = data.data.values || [];

    console.log('\n═══════════════════════════════════════════');
    console.log('📊 CAMPAIGN STATE ANALYSIS');
    console.log('═══════════════════════════════════════════\n');

    const states = {
        ENABLED: [],
        PAUSED: [],
        ARCHIVED: []
    };

    rows.forEach((row, i) => {
        const name = row[0];
        const state = row[1];
        if (state && states[state]) {
            states[state].push({ row: i + 11, name });
        }
    });

    console.log(`Total campaigns: ${rows.length}`);
    console.log(`  ENABLED: ${states.ENABLED.length}`);
    console.log(`  PAUSED: ${states.PAUSED.length}`);
    console.log(`  ARCHIVED: ${states.ARCHIVED.length}\n`);

    if (states.ENABLED.length > 0) {
        console.log('✅ ENABLED campaigns:');
        states.ENABLED.forEach((c, i) => {
            if (i < 20) console.log(`  ${i + 1}. Row ${c.row}: ${c.name}`);
        });
    } else {
        console.log('⚠️  NO ENABLED CAMPAIGNS FOUND!');
        console.log('\nAll campaigns are archived. This likely means:');
        console.log('  1. You paused/archived all campaigns in Amazon Ads');
        console.log('  2. OR the API only fetched archived campaigns\n');
    }

    if (states.PAUSED.length > 0) {
        console.log('\n⏸️  PAUSED campaigns:');
        states.PAUSED.forEach((c, i) => {
            if (i < 10) console.log(`  ${i + 1}. Row ${c.row}: ${c.name}`);
        });
    }
})();
