/**
 * fetch-ppc-campaigns.js
 *
 * Fetches all Sponsored Products campaigns from Amazon Ads API v3
 * and syncs them to the "PPC Campaigns" sheet with live formulas.
 *
 * Sheet structure:
 *   Row 10  : Headers
 *   Row 11+ : Campaign data
 *
 * Columns A-X:
 *   A  Campaign Name      (API)
 *   B  State              (API)
 *   C  Type               (API)
 *   D  Daily Budget       (API)
 *   E  Spend 30d          (filled by fetch-ppc-metrics.js)
 *   F  Sales 30d          (filled by fetch-ppc-metrics.js)
 *   G  Impressions        (filled by fetch-ppc-metrics.js)
 *   H  Clicks             (filled by fetch-ppc-metrics.js)
 *   I  Orders             (filled by fetch-ppc-metrics.js)
 *   J  CTR%               (formula)
 *   K  CPC                (formula)
 *   L  CVR%               (formula)
 *   M  ACOS%              (formula)
 *   N  ROAS               (formula)
 *   O  VPC                (formula - core Chris Rawlings metric)
 *   P  Target ACOS        (default from env)
 *   Q  Min VPC            (default $12)
 *   R  Is Bleeder         (formula)
 *   S  Severity           (formula)
 *   T  Efficiency Score   (formula)
 *   U  Recommended Action (formula)
 *   V  Suggested Bid Δ    (formula)
 *   W  Campaign ID        (API - needed by fetch-ppc-metrics.js)
 *   X  Last Updated       (timestamp)
 */

require('dotenv').config();
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG = {
    clientId:     process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    profileId:    process.env.AMAZON_PROFILE_ID,
    sheetsId:     process.env.GOOGLE_SHEETS_ID,
    sheetName:    'PPC Campaigns',
    dataStartRow: 11,
    targetAcos:   parseFloat(process.env.TARGET_ACOS || 30),
    minVpc:       12
};

const HEADERS = [
    'Campaign Name', 'State', 'Type', 'Daily Budget ($)',
    'Spend 30d ($)', 'Sales 30d ($)', 'Impressions', 'Clicks', 'Orders',
    'CTR%', 'CPC ($)', 'CVR%', 'ACOS%', 'ROAS', 'VPC ($)',
    'Target ACOS', 'Min VPC ($)',
    'Bleeder?', 'Severity', 'Score', 'Action', 'Bid Δ ($)',
    'Campaign ID', 'Last Updated'
];

// ─── Formula builder ─────────────────────────────────────────────────────────

function buildRow(campaign, rowNum) {
    const r = rowNum;
    const budget = campaign.budget?.budget ?? campaign.budget ?? 0;
    const today = new Date().toISOString().split('T')[0];

    return [
        campaign.name,                                   // A
        campaign.state,                                  // B
        campaign.targetingType || 'MANUAL',              // C
        budget,                                          // D
        0,                                               // E  Spend (metrics script fills this)
        0,                                               // F  Sales
        0,                                               // G  Impressions
        0,                                               // H  Clicks
        0,                                               // I  Orders
        `=IFERROR(H${r}/G${r}*100,0)`,                  // J  CTR%
        `=IFERROR(E${r}/H${r},0)`,                       // K  CPC
        `=IFERROR(I${r}/H${r}*100,0)`,                  // L  CVR%
        `=IFERROR(E${r}/F${r}*100,0)`,                  // M  ACOS%
        `=IFERROR(F${r}/E${r},0)`,                       // N  ROAS
        `=IFERROR(F${r}/H${r},0)`,                       // O  VPC
        CONFIG.targetAcos,                               // P  Target ACOS
        CONFIG.minVpc,                                   // Q  Min VPC
        // R  Is Bleeder: spending + ACOS over target + VPC under threshold + enabled
        `=AND(E${r}>0,M${r}>P${r},O${r}<Q${r},B${r}="ENABLED")`,
        // S  Severity
        `=IF(R${r}=FALSE,"NONE",IF(AND(M${r}>P${r}*2,O${r}<Q${r}*0.5),"CRITICAL",IF(AND(M${r}>P${r}*1.5,O${r}<Q${r}*0.7),"HIGH",IF(M${r}>P${r}*1.2,"MEDIUM","LOW"))))`,
        // T  Efficiency Score
        `=IFERROR((N${r}*100)+IF(O${r}>Q${r},50,0)+IF(M${r}<P${r},30,0)-IF(R${r},50,0),0)`,
        // U  Recommended Action
        `=IF(R${r}=TRUE,IF(S${r}="CRITICAL","PAUSE","REDUCE_BID"),IF(AND(M${r}<P${r}*0.8,O${r}>Q${r}*1.2),"INCREASE_BID",IF(T${r}>150,"WINNER","OPTIMIZE")))`,
        // V  Suggested Bid Δ (15% of daily budget)
        `=IF(U${r}="PAUSE",0,IF(U${r}="REDUCE_BID",-(D${r}*0.15),IF(U${r}="INCREASE_BID",D${r}*0.15,0)))`,
        campaign.campaignId,                             // W  Campaign ID
        today                                            // X  Last Updated
    ];
}

// ─── Amazon API ───────────────────────────────────────────────────────────────

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

async function fetchAllCampaigns(accessToken) {
    const campaigns = [];
    let nextToken = null;
    let page = 1;

    do {
        const body = {
            maxResults: 100,
            stateFilter: { include: ['ENABLED', 'PAUSED', 'ARCHIVED'] }
        };
        if (nextToken) body.nextToken = nextToken;

        const res = await fetch('https://advertising-api.amazon.com/sp/campaigns/list', {
            method: 'POST',
            headers: {
                'Authorization':                     `Bearer ${accessToken}`,
                'Amazon-Advertising-API-ClientId':   CONFIG.clientId,
                'Amazon-Advertising-API-Scope':      CONFIG.profileId,
                'Content-Type':                      'application/vnd.spcampaign.v3+json',
                'Accept':                            'application/vnd.spcampaign.v3+json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Campaigns API error ${res.status}: ${err}`);
        }

        const data = await res.json();
        const batch = data.campaigns || [];
        campaigns.push(...batch);
        nextToken = data.nextToken || null;

        console.log(`  Page ${page}: ${batch.length} campaigns (total: ${campaigns.length})`);
        page++;
    } while (nextToken);

    return campaigns;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n🚀 Fetch PPC Campaigns\n');

    // Validate env
    const missing = ['clientId', 'clientSecret', 'refreshToken', 'profileId', 'sheetsId']
        .filter(k => !CONFIG[k]);
    if (missing.length) {
        console.error('❌ Missing env vars:', missing.map(k => k.toUpperCase()).join(', '));
        process.exit(1);
    }

    const sheets = new UnifiedSheetsService();

    // 1. Authenticate
    console.log('🔐 Authenticating with Amazon...');
    const accessToken = await getAccessToken();
    console.log('✅ Authenticated\n');

    // 2. Fetch campaigns
    console.log('📦 Fetching campaigns (all pages)...');
    const campaigns = await fetchAllCampaigns(accessToken);
    console.log(`✅ ${campaigns.length} campaigns fetched\n`);

    // 3. Ensure sheet tab exists
    await sheets.ensureSheet(CONFIG.sheetName);

    // 4. Write headers to row 10
    console.log('📝 Writing headers to row 10...');
    await sheets.writeRows(CONFIG.sheetName, [HEADERS], 'A10');

    // 5. Clear previous data rows
    console.log('🧹 Clearing old data...');
    await sheets.clearRange(CONFIG.sheetName, 'A11:X2000');

    // 6. Build and write data rows with live formulas
    const rows = campaigns.map((c, i) => buildRow(c, CONFIG.dataStartRow + i));
    console.log(`✍️  Writing ${rows.length} rows with live formulas...`);
    await sheets.writeRows(CONFIG.sheetName, rows, `A${CONFIG.dataStartRow}`);

    console.log(`\n✅ Done!`);
    console.log(`   ${campaigns.length} campaigns → "${CONFIG.sheetName}" (rows 11-${10 + campaigns.length})`);
    console.log(`   Columns J–V are live Google Sheets formulas`);
    console.log(`   Column W has Campaign IDs (needed for fetch-ppc-metrics.js)`);
    console.log(`\n   Next step: node fetch-ppc-metrics.js`);
}

run().catch(err => {
    console.error('\n❌', err.message);
    process.exit(1);
});
