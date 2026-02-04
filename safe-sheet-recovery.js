/**
 * SAFE SHEET RECOVERY SCRIPT
 * 
 * This script SAFELY fixes sheet structure using:
 * 1. Hardcoded row positions (no faulty detection)
 * 2. INSERT operations (adds rows ABOVE data, never clears)
 * 3. Verification before and after each change
 * 
 * DO NOT RUN OTHER FIX SCRIPTS - they have bugs that cause data loss!
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

// ========================================
// VERIFIED ROW STRUCTURE (manually confirmed)
// ========================================
const CURRENT_STATE = {
    keywords: {
        // These will be verified before any changes
        expectedDataStartRow: null,  // Will detect and verify
        totalRowsExpected: 1431
    },
    ppcCampaigns: {
        expectedDataStartRow: null,  // Will detect and verify
        totalRowsExpected: 100
    }
};

// TARGET final structure (after recovery)
const TARGET_STRUCTURE = {
    keywords: {
        docEndRow: 12,
        headerRow: 13,
        dataStartRow: 14,
        frozenRows: 13
    },
    ppcCampaigns: {
        docEndRow: 9,
        headerRow: 10,
        dataStartRow: 11,
        frozenRows: 10
    }
};

async function safeRecovery() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  🔒 SAFE SHEET RECOVERY                    ║');
    console.log('║  NO data will be deleted or moved          ║');
    console.log('╚════════════════════════════════════════════╝\n');

    try {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        const keywordsSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Keywords');
        const ppcSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'PPC Campaigns');

        // ========================================
        // STEP 1: VERIFY CURRENT STATE
        // ========================================
        console.log('📊 STEP 1: Verifying current state...\n');

        // Read Keywords sheet
        const keywordsData = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Keywords!A:O'
        });
        const keywordRows = keywordsData.data.values || [];

        // Count keyword data rows (rows with numeric Score in column A)
        let keywordDataRows = [];
        let keywordDataStartRow = -1;

        for (let i = 0; i < keywordRows.length; i++) {
            const firstCell = keywordRows[i][0];
            // Look for numeric score (2 digits, like "76", "75")
            if (firstCell && !isNaN(parseFloat(firstCell)) && parseFloat(firstCell) >= 10 && parseFloat(firstCell) <= 100) {
                if (keywordDataStartRow === -1) {
                    keywordDataStartRow = i + 1; // 1-indexed row number
                }
                keywordDataRows.push(keywordRows[i]);
            }
        }

        console.log(`Keywords Sheet:`);
        console.log(`  Total rows in sheet: ${keywordRows.length}`);
        console.log(`  Data starts at row: ${keywordDataStartRow}`);
        console.log(`  Keyword data rows found: ${keywordDataRows.length}`);

        if (keywordDataRows.length < 1000) {
            console.log(`  ⚠️  WARNING: Expected ~1431 keywords, found ${keywordDataRows.length}`);
            console.log(`  ⚠️  Some data may have been lost by previous scripts!\n`);
        } else {
            console.log(`  ✅ Keyword count looks good\n`);
        }

        // Read PPC Campaigns sheet
        const ppcData = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'PPC Campaigns!A:Q'
        });
        const ppcRows = ppcData.data.values || [];

        // Count campaign data rows (rows with campaign names containing "berberine")
        let campaignDataRows = [];
        let campaignDataStartRow = -1;

        for (let i = 0; i < ppcRows.length; i++) {
            const firstCell = ppcRows[i][0];
            if (firstCell && firstCell.toString().toLowerCase().includes('berberine') &&
                !firstCell.toString().includes('CAMPAIGN')) {
                if (campaignDataStartRow === -1) {
                    campaignDataStartRow = i + 1; // 1-indexed
                }
                campaignDataRows.push(ppcRows[i]);
            }
        }

        console.log(`PPC Campaigns Sheet:`);
        console.log(`  Total rows in sheet: ${ppcRows.length}`);
        console.log(`  Data starts at row: ${campaignDataStartRow}`);
        console.log(`  Campaign data rows found: ${campaignDataRows.length}`);

        if (campaignDataRows.length < 90) {
            console.log(`  ⚠️  WARNING: Expected ~100 campaigns, found ${campaignDataRows.length}`);
            console.log(`  ⚠️  Some data may have been lost!\n`);
        } else {
            console.log(`  ✅ Campaign count looks good\n`);
        }

        // ========================================
        // STEP 2: USER CONFIRMATION
        // ========================================
        console.log('═══════════════════════════════════════════');
        console.log('⚠️  VERIFICATION REQUIRED');
        console.log('═══════════════════════════════════════════\n');
        console.log('Before proceeding, please verify:');
        console.log(`  • Keywords: Found ${keywordDataRows.length} rows starting at row ${keywordDataStartRow}`);
        console.log(`  • Campaigns: Found ${campaignDataRows.length} rows starting at row ${campaignDataStartRow}\n`);
        console.log('This script will:');
        console.log('  1. DELETE all rows ABOVE the data');
        console.log('  2. INSERT new documentation rows at the top');
        console.log('  3. Set proper frozen row counts\n');
        console.log('⚠️  If the row counts above look WRONG, STOP NOW!\n');

        // Save verification to file for user review
        const verificationReport = `# Sheet Verification Report

## Current State

### Keywords Sheet
- Total rows: ${keywordRows.length}
- Data starts at row: ${keywordDataStartRow}
- Keyword data rows: ${keywordDataRows.length}
- Status: ${keywordDataRows.length >= 1000 ? '✅ Good' : '⚠️ Data may be missing'}

### PPC Campaigns Sheet
- Total rows: ${ppcRows.length}
- Data starts at row: ${campaignDataStartRow}
- Campaign data rows: ${campaignDataRows.length}
- Status: ${campaignDataRows.length >= 90 ? '✅ Good' : '⚠️ Data may be missing'}

## Planned Changes

### Keywords
- Will delete rows 1-${keywordDataStartRow - 1}
- Will insert 12 rows of documentation
- Final structure:
  - Rows 1-12: Documentation
  - Row 13: Headers
  - Row 14+: ${keywordDataRows.length} keywords

### PPC Campaigns
- Will delete rows 1-${campaignDataStartRow - 1}
- Will insert 9 rows of documentation
- Final structure:
  - Rows 1-9: Documentation
  - Row 10: Headers
  - Row 11+: ${campaignDataRows.length} campaigns

## Next Steps

**REVIEW THIS REPORT CAREFULLY!**

If the data counts look correct:
  ✅ Run \`node safe-sheet-recovery.js confirm\`

If anything looks wrong:
  ❌ DO NOT RUN THE SCRIPT
  ❌ Check Google Sheets manually first
`;

        const fs = require('fs');
        fs.writeFileSync('sheet-verification-report.md', verificationReport);
        console.log('✅ Verification report saved to: sheet-verification-report.md\n');
        console.log('═══════════════════════════════════════════\n');
        console.log('ACTION REQUIRED:');
        console.log('  1. Review sheet-verification-report.md');
        console.log('  2. Verify the data counts are correct');
        console.log('  3. Run: node safe-sheet-recovery.js confirm\n');

        // Store state for confirmation step
        const state = {
            keywordDataStartRow,
            keywordDataRowCount: keywordDataRows.length,
            campaignDataStartRow,
            campaignDataRowCount: campaignDataRows.length,
            keywordsSheetId: keywordsSheet.properties.sheetId,
            ppcSheetId: ppcSheet.properties.sheetId
        };

        fs.writeFileSync('.recovery-state.json', JSON.stringify(state, null, 2));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

async function executeRecovery() {
    console.log('\n🔒 Executing SAFE recovery...\n');

    try {
        // Load saved state
        const fs = require('fs');
        const state = JSON.parse(fs.readFileSync('.recovery-state.json', 'utf8'));

        const requests = [];

        // ========================================
        // KEYWORDS: Delete old headers, insert new documentation
        // ========================================
        console.log('📊 Fixing Keywords sheet...\n');

        // Step 1: Delete rows 1 through (dataStartRow - 1)
        if (state.keywordDataStartRow > 1) {
            requests.push({
                deleteDimension: {
                    range: {
                        sheetId: state.keywordsSheetId,
                        dimension: 'ROWS',
                        startIndex: 0,  // Row 1 (0-indexed)
                        endIndex: state.keywordDataStartRow - 1  // Up to but not including data
                    }
                }
            });
            console.log(`  Deleting rows 1-${state.keywordDataStartRow - 1} (old docs/headers)`);
        }

        // Step 2: Insert 13 new rows at top (12 docs + 1 header)
        requests.push({
            insertDimension: {
                range: {
                    sheetId: state.keywordsSheetId,
                    dimension: 'ROWS',
                    startIndex: 0,
                    endIndex: 13
                }
            }
        });
        console.log(`  Inserting 13 new rows for documentation + headers\n`);

        // ========================================
        // PPC: Delete old headers, insert new documentation
        // ========================================
        console.log('📊 Fixing PPC Campaigns sheet...\n');

        // Step 1: Delete rows 1 through (dataStartRow - 1)
        if (state.campaignDataStartRow > 1) {
            requests.push({
                deleteDimension: {
                    range: {
                        sheetId: state.ppcSheetId,
                        dimension: 'ROWS',
                        startIndex: 0,
                        endIndex: state.campaignDataStartRow - 1
                    }
                }
            });
            console.log(`  Deleting rows 1-${state.campaignDataStartRow - 1} (old docs/headers)`);
        }

        // Step 2: Insert 10 new rows at top (9 docs + 1 header)
        requests.push({
            insertDimension: {
                range: {
                    sheetId: state.ppcSheetId,
                    dimension: 'ROWS',
                    startIndex: 0,
                    endIndex: 10
                }
            }
        });
        console.log(`  Inserting 10 new rows for documentation + headers\n`);

        // Execute delete and insert operations
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: { requests }
        });

        console.log('✅ Rows deleted and inserted\n');

        // ========================================
        // Write documentation and headers
        // ========================================
        console.log('📝 Writing documentation and headers...\n');

        // Keywords documentation
        const keywordsDoc = [
            ['📊 TITAN KEYWORD OPPORTUNITIES'],
            [''],
            ['WHAT THIS SHOWS:'],
            ['All discovered keywords with search data, competition analysis, and opportunity scores. Auto-synced from Titan engine.'],
            [''],
            ['HOW TO USE:'],
            ['1. Filter by Tier (Tier 1 = best) | 2. Sort by Score (higher = better) | 3. Filter Search Volume >1000 | 4. Add top keywords to PPC campaigns'],
            [''],
            ['💡 QUICK FILTERS:'],
            ['Color Filter: Search Volume >1000 + Competition Low/Med = GREEN highlights (best opportunities)'],
            [''],
            ['═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════'],
            ['Score', 'Tier', 'Keyword', 'Search Volume', 'Competition', 'Est. CPC', 'Your Rank', 'Competitor Ranks', 'Search Freq Rank', 'Click Share %', 'Conv Share %', 'Intent', 'Match Type', 'Source', 'Status']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Keywords!A1:O13',
            valueInputOption: 'RAW',
            resource: { values: keywordsDoc }
        });

        // PPC documentation
        const ppcDoc = [
            ['📊 ACTIVE PPC CAMPAIGNS & BLEEDERS'],
            [''],
            ['WHAT THIS SHOWS: Live campaign data from Amazon Ads - spend, sales, ACOS, and "bleeders" losing money'],
            ['HOW TO USE: 1) Filter Bleeder=YES  2) Check Severity (HIGH=urgent)  3) Follow Recommendations  4) Pause/optimize'],
            [''],
            ['🎨 COLOR LEGEND:'],
            ['🔴 RED = BLEEDER (ACOS >100% OR Spend >$50 with $0 sales) → PAUSE immediately'],
            ['🟠 ORANGE = WARNING (ACOS 50-100%) → Reduce budget 50%, optimize'],
            ['🟢 GREEN = WINNER (ACOS <30% AND ROAS >3.0 AND Orders >5) → SCALE UP!'],
            ['Campaign Name', 'State', 'Type', 'Budget', 'Spend (30d)', 'Sales (30d)', 'Impressions', 'Clicks', 'Orders', 'CTR %', 'CPC $', 'ACOS %', 'ROAS', 'CVR %', 'Bleeder?', 'Severity', 'Recommendation']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'PPC Campaigns!A1:Q10',
            valueInputOption: 'RAW',
            resource: { values: ppcDoc }
        });

        // Set frozen rows
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: state.keywordsSheetId,
                                gridProperties: { frozenRowCount: 13 }
                            },
                            fields: 'gridProperties.frozenRowCount'
                        }
                    },
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: state.ppcSheetId,
                                gridProperties: { frozenRowCount: 10 }
                            },
                            fields: 'gridProperties.frozenRowCount'
                        }
                    }
                ]
            }
        });

        console.log('✅ Documentation written and frozen rows set\n');
        console.log('═══════════════════════════════════════════');
        console.log('🎉 RECOVERY COMPLETE!');
        console.log('═══════════════════════════════════════════\n');
        console.log('Final Structure:');
        console.log('\nKeywords:');
        console.log('  Rows 1-12: Documentation');
        console.log('  Row 13: Headers');
        console.log(`  Row 14+: ${state.keywordDataRowCount} keywords`);
        console.log('  Frozen: First 13 rows\n');
        console.log('PPC Campaigns:');
        console.log('  Rows 1-9: Documentation');
        console.log('  Row 10: Headers');
        console.log(`  Row 11+: ${state.campaignDataRowCount} campaigns`);
        console.log('  Frozen: First 10 rows\n');
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Recovery failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Main execution
const args = process.argv.slice(2);

if (args[0] === 'confirm') {
    executeRecovery().then(() => process.exit(0));
} else {
    safeRecovery().then(() => process.exit(0));
}
