/**
 * Fix BOTH Sheet Headers Properly
 * - PPC Campaigns: Restore full documentation + add color legend
 * - Keywords: Add complete documentation section
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

async function fixBothHeaders() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  🔧 FIXING BOTH SHEET HEADERS              ║');
    console.log('╚════════════════════════════════════════════╝\n');

    try {
        // Get sheet info
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const keywordsSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Keywords');
        const ppcSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'PPC Campaigns');

        // ========================================
        // 1. FIX KEYWORDS SHEET
        // ========================================
        console.log('📊 Fixing Keywords sheet headers...\n');

        // Read current data to preserve keywords
        const keywordsData = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Keywords!A:Z'
        });

        const currentRows = keywordsData.data.values || [];

        // Find where actual data starts (look for "Score" header or first numeric score)
        let dataStartRow = 1;
        for (let i = 0; i < currentRows.length; i++) {
            if (currentRows[i][0] && (currentRows[i][0].toString().includes('Score') || !isNaN(parseFloat(currentRows[i][0])))) {
                dataStartRow = i;
                break;
            }
        }

        console.log(`Found keyword data starting at row ${dataStartRow + 1}\n`);

        // Preserve all data from dataStartRow onwards
        const preservedData = currentRows.slice(dataStartRow);

        // Create proper documentation structure for Keywords
        const keywordsDocumentation = [
            ['📊 TITAN KEYWORD OPPORTUNITIES'],
            [''],
            ['WHAT THIS SHOWS:'],
            ['All discovered keywords with search data, competition analysis, and opportunity scores. Auto-synced from Titan engine.'],
            [''],
            ['HOW TO USE:'],
            ['1. Filter by Tier (Tier 1 = best) | 2. Sort by Opportunity Score (higher = better) | 3. Filter Search Volume >1000 | 4. Filter Competition = Low or Medium | 5. Add top keywords to PPC campaigns'],
            [''],
            ['💡 QUICK FILTERS:'],
            ['Color Filter: Search Volume >1000 + Competition Low/Med = GREEN highlights (best opportunities)'],
            [''],
            ['═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════'],
            [''],
            ...preservedData
        ];

        // Clear and rewrite Keywords sheet
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Keywords!A:Z'
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Keywords!A1',
            valueInputOption: 'RAW',
            resource: { values: keywordsDocumentation }
        });

        console.log('✅ Keywords sheet fixed with complete documentation\n');

        // Freeze rows for Keywords (first 14 rows)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    updateSheetProperties: {
                        properties: {
                            sheetId: keywordsSheet.properties.sheetId,
                            gridProperties: {
                                frozenRowCount: 14
                            }
                        },
                        fields: 'gridProperties.frozenRowCount'
                    }
                }]
            }
        });

        console.log('❄️ Froze first 14 rows in Keywords sheet\n');

        // ========================================
        // 2. FIX PPC CAMPAIGNS SHEET
        // ========================================
        console.log('📊 Fixing PPC Campaigns sheet headers...\n');

        // Read current PPC data
        const ppcData = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'PPC Campaigns!A:Z'
        });

        const ppcRows = ppcData.data.values || [];

        // Find where campaign data starts (after any existing headers)
        let ppcDataStart = 1;
        for (let i = 0; i < ppcRows.length; i++) {
            const row = ppcRows[i];
            // Look for actual campaign names (not documentation or headers)
            if (row[0] && row[0].toString().includes('berberine') && !row[0].toString().includes('CAMPAIGN')) {
                ppcDataStart = i;
                break;
            }
        }

        console.log(`Found campaign data starting at row ${ppcDataStart + 1}\n`);

        // Preserve campaign data
        const preservedCampaigns = ppcRows.slice(ppcDataStart);

        // Create proper documentation structure for PPC Campaigns
        const ppcDocumentation = [
            ['📊 ACTIVE PPC CAMPAIGNS & BLEEDERS'],
            [''],
            ['WHAT THIS SHOWS:'],
            ['Live campaign data from Amazon Ads - spend, sales, ACOS, and "bleeders" losing money'],
            [''],
            ['HOW TO USE:'],
            ['1) Filter Bleeder=YES  2) Check Severity (HIGH=urgent)  3) Follow Recommendations  4) Pause/optimize'],
            [''],
            ['🎨 COLOR LEGEND:'],
            ['🔴 RED = BLEEDER (ACOS >100% OR Spend >$50 with $0 sales) → PAUSE immediately'],
            ['🟠 ORANGE = WARNING (ACOS 50-100% OR ROAS <1.5) → Reduce budget 50%, optimize'],
            ['🟡 YELLOW = OPTIMIZE (ACOS 30-50% OR ROAS 1.5-3.0) → Fine-tune bids and keywords'],
            ['🟢 GREEN = WINNER (ACOS <30% AND ROAS >3.0 AND Orders >5) → SCALE UP!'],
            ['⚪ WHITE = Normal or no data yet'],
            [''],
            ['═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════'],
            [''],
            ['Campaign Name', 'State', 'Type', 'Budget', 'Spend (30d)', 'Sales (30d)', 'Impressions', 'Clicks', 'Orders', 'CTR %', 'CPC $', 'ACOS %', 'ROAS', 'CVR %', 'Bleeder?', 'Severity', 'Recommendation'],
            ...preservedCampaigns
        ];

        // Clear and rewrite PPC Campaigns sheet
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'PPC Campaigns!A:Z'
        });

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'PPC Campaigns!A1',
            valueInputOption: 'RAW',
            resource: { values: ppcDocumentation }
        });

        console.log('✅ PPC Campaigns sheet fixed with full documentation + color legend\n');

        // Freeze rows for PPC Campaigns (first 18 rows - docs + headers)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [{
                    updateSheetProperties: {
                        properties: {
                            sheetId: ppcSheet.properties.sheetId,
                            gridProperties: {
                                frozenRowCount: 18
                            }
                        },
                        fields: 'gridProperties.frozenRowCount'
                    }
                }]
            }
        });

        console.log('❄️ Froze first 18 rows in PPC Campaigns sheet\n');

        console.log('═══════════════════════════════════════════');
        console.log('✅ BOTH SHEETS FIXED!');
        console.log('═══════════════════════════════════════════\n');
        console.log('Keywords Sheet Structure:');
        console.log('  Rows 1-13: Documentation (WHAT THIS SHOWS, HOW TO USE, QUICK FILTERS)');
        console.log('  Row 14: Column headers');
        console.log('  Row 15+: Keyword data\n');
        console.log('PPC Campaigns Sheet Structure:');
        console.log('  Rows 1-16: Documentation + Color Legend');
        console.log('  Row 17: Separator');
        console.log('  Row 18: Column headers');
        console.log('  Row 19+: Campaign data\n');
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

fixBothHeaders().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
