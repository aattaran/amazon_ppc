/**
 * fetch-ppc-metrics.js
 *
 * Fetches 30-day performance metrics from Amazon Ads Reporting API v3
 * and writes them into the "PPC Campaigns" sheet (columns E-I).
 *
 * Requires fetch-ppc-campaigns.js to have run first (Campaign IDs in column W).
 *
 * Columns updated:
 *   E  Spend 30d ($)
 *   F  Sales 30d ($)
 *   G  Impressions
 *   H  Clicks
 *   I  Orders
 *
 * Columns J-V (CTR, CPC, CVR, ACOS, ROAS, VPC, Bleeder, etc.)
 * recalculate automatically as they are Google Sheets formulas.
 */

require('dotenv').config();
const zlib = require('zlib');
const { google } = require('googleapis');
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG = {
    clientId:        process.env.AMAZON_CLIENT_ID,
    clientSecret:    process.env.AMAZON_CLIENT_SECRET,
    refreshToken:    process.env.AMAZON_REFRESH_TOKEN,
    profileId:       process.env.AMAZON_PROFILE_ID,
    sheetsId:        process.env.GOOGLE_SHEETS_ID,
    sheetName:       'PPC Campaigns',
    dataStartRow:    11,
    reportDays:      30,
    pollIntervalMs:  15000,
    maxPollAttempts: 60   // 60 × 15s = 15 minutes max
};

// ─── Amazon API helpers ───────────────────────────────────────────────────────

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

function getDateRange(days) {
    const end   = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const fmt = d => d.toISOString().split('T')[0];
    return { startDate: fmt(start), endDate: fmt(end) };
}

async function requestReport(accessToken) {
    const { startDate, endDate } = getDateRange(CONFIG.reportDays);
    console.log(`   Date range: ${startDate} → ${endDate}`);

    const res = await fetch('https://advertising-api.amazon.com/reporting/reports', {
        method: 'POST',
        headers: {
            'Authorization':                     `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId':   CONFIG.clientId,
            'Amazon-Advertising-API-Scope':      CONFIG.profileId,
            'Content-Type':                      'application/json',
            'Accept':                            'application/json'
        },
        body: JSON.stringify({
            name:      `Campaign Metrics ${startDate}`,
            startDate,
            endDate,
            configuration: {
                adProduct:    'SPONSORED_PRODUCTS',
                groupBy:      ['campaign'],
                columns:      [
                    'campaignId',
                    'campaignName',
                    'impressions',
                    'clicks',
                    'cost',
                    'purchases14d',
                    'sales14d'
                ],
                reportTypeId: 'spCampaigns',
                timeUnit:     'SUMMARY',
                format:       'GZIP_JSON'
            }
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Report request failed ${res.status}: ${err}`);
    }

    const data = await res.json();
    if (!data.reportId) throw new Error('No reportId returned: ' + JSON.stringify(data));
    return data.reportId;
}

async function pollReport(accessToken, reportId) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (let attempt = 1; attempt <= CONFIG.maxPollAttempts; attempt++) {
        const res = await fetch(`https://advertising-api.amazon.com/reporting/reports/${reportId}`, {
            headers: {
                'Authorization':                   `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId': CONFIG.clientId,
                'Amazon-Advertising-API-Scope':    CONFIG.profileId,
                'Accept':                          'application/json'
            }
        });

        if (!res.ok) {
            console.warn(`   Poll ${attempt}: HTTP ${res.status}, retrying...`);
            await sleep(CONFIG.pollIntervalMs);
            continue;
        }

        const data = await res.json();

        if (data.status === 'COMPLETED') {
            console.log(`   ✅ Report ready (attempt ${attempt})`);
            return data.url;
        }

        if (data.status === 'FAILED') {
            throw new Error(`Report failed: ${JSON.stringify(data.failureReason || data)}`);
        }

        console.log(`   Attempt ${attempt}/${CONFIG.maxPollAttempts}: ${data.status}...`);
        await sleep(CONFIG.pollIntervalMs);
    }

    throw new Error('Report timed out');
}

async function downloadReport(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const text = zlib.gunzipSync(buffer).toString('utf8').trim();

    // Amazon returns either a JSON array [...] or newline-delimited JSON
    if (text.startsWith('[')) return JSON.parse(text);

    return text
        .split('\n')
        .filter(l => l.trim())
        .map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(Boolean);
}

// ─── Sheet helpers ────────────────────────────────────────────────────────────

async function readCampaignIndex(sheets) {
    const data = await sheets.readSheet(CONFIG.sheetName);

    // Row 10 (index 9) = headers, data starts at row 11 (index 10)
    const index = {};
    data.slice(10).forEach((row, i) => {
        const campaignId = row[22]; // Column W (0-indexed)
        if (campaignId) {
            index[String(campaignId)] = CONFIG.dataStartRow + i;
        }
    });

    return index;
}

async function writeMetrics(rowUpdates) {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key:  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheetsApi = google.sheets({ version: 'v4', auth });

    const data = rowUpdates.map(({ rowNum, spend, sales, impressions, clicks, orders }) => ({
        range:  `${CONFIG.sheetName}!E${rowNum}:I${rowNum}`,
        values: [[
            parseFloat(spend.toFixed(2)),
            parseFloat(sales.toFixed(2)),
            impressions,
            clicks,
            orders
        ]]
    }));

    await sheetsApi.spreadsheets.values.batchUpdate({
        spreadsheetId: CONFIG.sheetsId,
        resource: {
            valueInputOption: 'USER_ENTERED',
            data
        }
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n📊 Fetch PPC Metrics (Reporting API v3)\n');

    const missing = ['clientId', 'clientSecret', 'refreshToken', 'profileId', 'sheetsId']
        .filter(k => !CONFIG[k]);
    if (missing.length) {
        console.error('❌ Missing env vars:', missing.map(k => k.toUpperCase()).join(', '));
        process.exit(1);
    }

    const sheets = new UnifiedSheetsService();

    // 1. Authenticate
    console.log('🔐 Authenticating...');
    const accessToken = await getAccessToken();
    console.log('✅ Authenticated\n');

    // 2. Read campaign index (ID → sheet row number)
    console.log('📖 Reading campaign IDs from sheet (column W)...');
    const campaignIndex = await readCampaignIndex(sheets);
    const indexedCount = Object.keys(campaignIndex).length;
    console.log(`✅ ${indexedCount} campaigns indexed\n`);

    if (indexedCount === 0) {
        console.error('❌ No campaign IDs found in column W.');
        console.error('   Run: node fetch-ppc-campaigns.js first.');
        process.exit(1);
    }

    // 3. Request report
    console.log('📋 Requesting 30-day performance report...');
    const reportId = await requestReport(accessToken);
    console.log(`   Report ID: ${reportId}\n`);

    // 4. Poll until ready
    console.log('⏳ Waiting for report to complete...');
    const downloadUrl = await pollReport(accessToken, reportId);
    console.log('');

    // 5. Download and parse
    console.log('📥 Downloading report data...');
    const metrics = await downloadReport(downloadUrl);
    console.log(`✅ ${metrics.length} records in report\n`);

    // 6. Match metrics to sheet rows
    const rowUpdates = [];
    let matched = 0;
    let unmatched = 0;

    for (const m of metrics) {
        const rowNum = campaignIndex[String(m.campaignId)];
        if (!rowNum) { unmatched++; continue; }

        rowUpdates.push({
            rowNum,
            spend:       parseFloat(m.cost || 0),
            sales:       parseFloat(m.sales14d || 0),
            impressions: parseInt(m.impressions || 0),
            clicks:      parseInt(m.clicks || 0),
            orders:      parseInt(m.purchases14d || 0)
        });
        matched++;
    }

    console.log(`   Matched:   ${matched} campaigns`);
    if (unmatched > 0) console.log(`   Unmatched: ${unmatched} (not yet in sheet)`);
    console.log('');

    if (rowUpdates.length === 0) {
        console.log('⚠️  No rows to update (no spend data in the last 30 days).');
        return;
    }

    // 7. Write to sheet (batch update, single API call)
    console.log(`💾 Writing metrics to ${rowUpdates.length} rows (columns E-I)...`);
    await writeMetrics(rowUpdates);

    console.log('\n✅ Done!');
    console.log('   Columns E-I updated with real 30-day performance data.');
    console.log('   Columns J-V (CTR, ACOS, VPC, Bleeder detection) auto-recalculated.');
}

run().catch(err => {
    console.error('\n❌', err.message);
    process.exit(1);
});
