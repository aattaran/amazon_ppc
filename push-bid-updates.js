/**
 * push-bid-updates.js
 *
 * Reads the "PPC Campaigns" sheet recommendations and pushes them live
 * to Amazon Ads API v3.
 *
 * Reads from sheet columns:
 *   A  Campaign Name    (display only)
 *   B  State            (ENABLED / PAUSED)
 *   D  Daily Budget ($) (current)
 *   U  Recommended Action  (PAUSE / REDUCE_BID / INCREASE_BID / WINNER / OPTIMIZE)
 *   V  Suggested Bid Δ ($) (±15% of daily budget, 0 for PAUSE/OPTIMIZE/WINNER)
 *   W  Campaign ID      (required for API call)
 *
 * Actions pushed:
 *   PAUSE      → state: PAUSED  (only for ENABLED campaigns)
 *   REDUCE_BID → budget: D + V  (V is negative)
 *   INCREASE_BID → budget: D + V  (V is positive)
 *
 * Usage:
 *   node push-bid-updates.js              # Dry run — preview only, NO changes made
 *   node push-bid-updates.js --confirm    # Push live to Amazon
 *
 * Prerequisites:
 *   Run fetch-ppc-campaigns.js + fetch-ppc-metrics.js first so columns U/V have values.
 */

require('dotenv').config();
const { google } = require('googleapis');
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
    clientId:     process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    profileId:    process.env.AMAZON_PROFILE_ID,
    sheetsId:     process.env.GOOGLE_SHEETS_ID,
    sheetName:    'PPC Campaigns',
    dataStartRow: 11,
    minBudget:    1.00,   // Amazon minimum daily budget $1
    batchSize:    100     // Amazon API max items per request
};

const DRY_RUN = !process.argv.includes('--confirm');

// ─── Amazon auth ──────────────────────────────────────────────────────────────

async function getAccessToken() {
    const res = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type:    'refresh_token',
            refresh_token: CONFIG.refreshToken,
            client_id:     CONFIG.clientId,
            client_secret: CONFIG.clientSecret
        })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error_description || `Auth failed: ${res.status}`);
    return data.access_token;
}

// ─── Sheet read ───────────────────────────────────────────────────────────────

async function readRecommendations(sheets) {
    const data = await sheets.readSheet(CONFIG.sheetName);

    // Row 10 (index 9) = headers, data starts row 11 (index 10)
    const updates = [];

    data.slice(10).forEach((row, i) => {
        const rowNum      = CONFIG.dataStartRow + i;
        const name        = String(row[0]  || '').trim();
        const state       = String(row[1]  || '').trim().toUpperCase();
        const budget      = parseFloat(row[3])  || 0;   // D  Daily Budget
        const action      = String(row[20] || '').trim().toUpperCase(); // U  Recommended Action
        const bidDelta    = parseFloat(row[21]) || 0;   // V  Suggested Bid Δ
        const campaignId  = String(row[22] || '').trim(); // W  Campaign ID

        if (!campaignId || !name) return;

        if (action === 'PAUSE' && state === 'ENABLED') {
            updates.push({
                rowNum, campaignId, name, action,
                currentState:  state,
                currentBudget: budget,
                newState:      'PAUSED',
                newBudget:     budget   // budget unchanged when pausing
            });

        } else if ((action === 'REDUCE_BID' || action === 'INCREASE_BID') && bidDelta !== 0) {
            const newBudget = Math.max(CONFIG.minBudget, parseFloat((budget + bidDelta).toFixed(2)));
            updates.push({
                rowNum, campaignId, name, action,
                currentState:  state,
                currentBudget: budget,
                newState:      null,    // state unchanged
                newBudget
            });
        }
        // WINNER / OPTIMIZE / MAINTAIN → no API change needed
    });

    return updates;
}

// ─── Amazon API write ─────────────────────────────────────────────────────────

async function pushUpdates(accessToken, updates) {
    const results = { success: [], error: [] };

    for (let i = 0; i < updates.length; i += CONFIG.batchSize) {
        const batch = updates.slice(i, i + CONFIG.batchSize);

        const payload = {
            campaigns: batch.map(u => {
                const change = { campaignId: u.campaignId };
                if (u.newState) {
                    change.state = u.newState;
                }
                if (u.newBudget !== u.currentBudget) {
                    change.budget = { budgetType: 'DAILY', budget: u.newBudget };
                }
                return change;
            })
        };

        const res = await fetch('https://advertising-api.amazon.com/sp/campaigns', {
            method: 'PUT',
            headers: {
                'Authorization':                   `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId': CONFIG.clientId,
                'Amazon-Advertising-API-Scope':    CONFIG.profileId,
                'Content-Type':                    'application/vnd.spCampaign.v3+json',
                'Accept':                          'application/vnd.spCampaign.v3+json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API error ${res.status}: ${errText}`);
        }

        const data = await res.json();

        // v3 API returns { campaigns: { success: [...], error: [...] } }
        const successIds = new Set(
            (data.campaigns?.success || []).map(s => String(s.campaignId))
        );
        const errorMap = {};
        (data.campaigns?.error || []).forEach(e => {
            errorMap[String(e.campaignId)] = e.errorMessage || e.code || 'Unknown error';
        });

        batch.forEach(u => {
            if (successIds.has(u.campaignId) || successIds.size === batch.length) {
                // Some APIs return empty success array on full success
                results.success.push(u);
            } else if (errorMap[u.campaignId]) {
                results.error.push({ ...u, errorMessage: errorMap[u.campaignId] });
            } else {
                results.success.push(u); // Assume success if no error listed
            }
        });

        console.log(`   Batch ${Math.floor(i / CONFIG.batchSize) + 1}: ${batch.length} sent`);
    }

    return results;
}

// ─── Sheet write-back ─────────────────────────────────────────────────────────

async function writeResultsToSheet(successfulUpdates) {
    if (successfulUpdates.length === 0) return;

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key:  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheetsApi = google.sheets({ version: 'v4', auth });

    // Build batch: update column B (state) and/or column D (budget) per row
    const rangeUpdates = [];

    successfulUpdates.forEach(u => {
        // Column B = state (only update if we changed it)
        if (u.newState && u.newState !== u.currentState) {
            rangeUpdates.push({
                range:  `${CONFIG.sheetName}!B${u.rowNum}`,
                values: [[u.newState]]
            });
        }
        // Column D = budget (only update if it changed)
        if (u.newBudget !== u.currentBudget) {
            rangeUpdates.push({
                range:  `${CONFIG.sheetName}!D${u.rowNum}`,
                values: [[u.newBudget]]
            });
        }
    });

    if (rangeUpdates.length === 0) return;

    await sheetsApi.spreadsheets.values.batchUpdate({
        spreadsheetId: CONFIG.sheetsId,
        resource: {
            valueInputOption: 'USER_ENTERED',
            data: rangeUpdates
        }
    });
}

// ─── Display ──────────────────────────────────────────────────────────────────

function printPreview(updates) {
    const pauses    = updates.filter(u => u.action === 'PAUSE');
    const reduces   = updates.filter(u => u.action === 'REDUCE_BID');
    const increases = updates.filter(u => u.action === 'INCREASE_BID');

    if (pauses.length > 0) {
        console.log(`\n🛑 PAUSE (${pauses.length} campaigns)\n`);
        pauses.forEach(u => {
            console.log(`   ❌ ${u.name}`);
            console.log(`      State: ENABLED → PAUSED  |  Budget: $${u.currentBudget.toFixed(2)} (unchanged)\n`);
        });
    }

    if (reduces.length > 0) {
        console.log(`📉 REDUCE BUDGET (${reduces.length} campaigns)\n`);
        reduces.forEach(u => {
            const pct = ((u.currentBudget - u.newBudget) / u.currentBudget * 100).toFixed(1);
            console.log(`   🔻 ${u.name}`);
            console.log(`      Budget: $${u.currentBudget.toFixed(2)} → $${u.newBudget.toFixed(2)} (-${pct}%)\n`);
        });
    }

    if (increases.length > 0) {
        console.log(`📈 INCREASE BUDGET (${increases.length} campaigns)\n`);
        increases.forEach(u => {
            const pct = ((u.newBudget - u.currentBudget) / u.currentBudget * 100).toFixed(1);
            console.log(`   ✅ ${u.name}`);
            console.log(`      Budget: $${u.currentBudget.toFixed(2)} → $${u.newBudget.toFixed(2)} (+${pct}%)\n`);
        });
    }
}

function printResults(results) {
    if (results.success.length > 0) {
        console.log(`\n✅ Successfully updated ${results.success.length} campaigns`);

        const paused    = results.success.filter(u => u.newState === 'PAUSED').length;
        const budgeted  = results.success.filter(u => u.newBudget !== u.currentBudget).length;

        if (paused   > 0) console.log(`   Paused:          ${paused}`);
        if (budgeted > 0) console.log(`   Budget changed:  ${budgeted}`);
    }

    if (results.error.length > 0) {
        console.log(`\n❌ ${results.error.length} campaign(s) failed:`);
        results.error.forEach(e => {
            console.log(`   • ${e.name}: ${e.errorMessage}`);
        });
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n🚀 Push Bid Updates\n');
    console.log(DRY_RUN
        ? '⚠️  DRY RUN — No changes will be made. Add --confirm to push live.\n'
        : '🔴 LIVE MODE — Changes will be pushed to Amazon immediately.\n'
    );

    // Validate env
    const missing = ['clientId', 'clientSecret', 'refreshToken', 'profileId', 'sheetsId']
        .filter(k => !CONFIG[k]);
    if (missing.length) {
        console.error('❌ Missing env vars:', missing.map(k => k.toUpperCase()).join(', '));
        process.exit(1);
    }

    const sheets = new UnifiedSheetsService();

    // 1. Read recommendations from sheet
    console.log('📖 Reading recommendations from sheet...');
    const updates = await readRecommendations(sheets);

    if (updates.length === 0) {
        console.log('\n✅ No actionable recommendations found.');
        console.log('   Run fetch-ppc-campaigns.js + fetch-ppc-metrics.js first,');
        console.log('   then check columns U and V for PAUSE/REDUCE_BID/INCREASE_BID actions.');
        return;
    }

    console.log(`✅ Found ${updates.length} campaigns to update\n`);
    console.log('═'.repeat(55) + '\n');

    // 2. Preview what will change
    printPreview(updates);

    console.log('═'.repeat(55));

    if (DRY_RUN) {
        console.log('\n💡 To apply these changes, run:');
        console.log('   node push-bid-updates.js --confirm\n');
        return;
    }

    // 3. Authenticate and push
    console.log('\n🔐 Authenticating with Amazon...');
    const accessToken = await getAccessToken();
    console.log('✅ Authenticated\n');

    console.log(`💾 Pushing ${updates.length} updates to Amazon Ads API...\n`);
    const results = await pushUpdates(accessToken, updates);

    // 4. Print results
    printResults(results);

    // 5. Write successful changes back to sheet
    if (results.success.length > 0) {
        console.log('\n📝 Updating sheet with new values...');
        await writeResultsToSheet(results.success);
        console.log('✅ Sheet updated');
    }

    console.log('\n✅ Done!\n');
    console.log('   Run fetch-ppc-campaigns.js + fetch-ppc-metrics.js');
    console.log('   to pull the latest data from Amazon and refresh all formulas.');
}

run().catch(err => {
    console.error('\n❌', err.message);
    process.exit(1);
});
