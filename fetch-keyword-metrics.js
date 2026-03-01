/**
 * fetch-keyword-metrics.js
 *
 * Fetches 30-day keyword-level performance from Amazon Reporting API v3,
 * identifies winners / good / marginal / bleeders, and writes results to
 * the "Keyword Performance" sheet tab.
 *
 * Columns written (A–Q):
 *   A  Keyword Text
 *   B  Match Type       (EXACT / PHRASE / BROAD)
 *   C  Campaign Name
 *   D  State            (ENABLED / PAUSED)
 *   E  Current Bid ($)
 *   F  Spend 30d ($)
 *   G  Sales 30d ($)
 *   H  Clicks
 *   I  Impressions
 *   J  Orders
 *   K  CTR%             (formula)
 *   L  CPC ($)          (formula)
 *   M  ACOS%            (formula)
 *   N  CVR%             (formula)
 *   O  ROAS             (formula)
 *   P  VPC ($)          (formula)
 *   Q  Tag              (formula: WINNER / GOOD / MARGINAL / BLEEDER / NO DATA)
 *
 * Usage:
 *   node fetch-keyword-metrics.js
 */

require('dotenv').config();
const zlib = require('zlib');
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
    clientId:        process.env.AMAZON_CLIENT_ID,
    clientSecret:    process.env.AMAZON_CLIENT_SECRET,
    refreshToken:    process.env.AMAZON_REFRESH_TOKEN,
    profileId:       process.env.AMAZON_PROFILE_ID,
    sheetName:       'Keyword Performance',
    dataStartRow:    2,
    reportDays:      30,
    pollIntervalMs:  15000,
    maxPollAttempts: 60,          // 60 × 15s = 15 min max
    targetAcos:      parseFloat(process.env.TARGET_ACOS || 30),
    bleederClicks:   30           // clicks with $0 sales = bleeder
};

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

// ─── Fetch keyword structure ──────────────────────────────────────────────────

async function fetchAllKeywords(token) {
    const keywords = [];
    let nextToken  = null;

    do {
        const body = {
            maxResults:  100,
            stateFilter: { include: ['ENABLED', 'PAUSED'] }
        };
        if (nextToken) body.nextToken = nextToken;

        const res = await fetch('https://advertising-api.amazon.com/sp/keywords/list', {
            method: 'POST',
            headers: {
                'Authorization':                   `Bearer ${token}`,
                'Amazon-Advertising-API-ClientId': CONFIG.clientId,
                'Amazon-Advertising-API-Scope':    CONFIG.profileId,
                'Content-Type':                    'application/vnd.spKeyword.v3+json',
                'Accept':                          'application/vnd.spKeyword.v3+json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error(`Keywords API ${res.status}: ${await res.text()}`);

        const data = await res.json();
        keywords.push(...(data.keywords || []));
        nextToken = data.nextToken || null;

    } while (nextToken);

    return keywords;
}

async function fetchAllCampaigns(token) {
    const campaigns = [];
    let nextToken   = null;

    do {
        const body = { maxResults: 100, stateFilter: { include: ['ENABLED', 'PAUSED', 'ARCHIVED'] } };
        if (nextToken) body.nextToken = nextToken;

        const res = await fetch('https://advertising-api.amazon.com/sp/campaigns/list', {
            method: 'POST',
            headers: {
                'Authorization':                   `Bearer ${token}`,
                'Amazon-Advertising-API-ClientId': CONFIG.clientId,
                'Amazon-Advertising-API-Scope':    CONFIG.profileId,
                'Content-Type':                    'application/vnd.spcampaign.v3+json',
                'Accept':                          'application/vnd.spcampaign.v3+json'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error(`Campaigns API ${res.status}: ${await res.text()}`);

        const data  = await res.json();
        campaigns.push(...(data.campaigns || []));
        nextToken = data.nextToken || null;

    } while (nextToken);

    return campaigns;
}

// ─── Report request / poll / download ────────────────────────────────────────

function getDateRange(days) {
    const end   = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const fmt = d => d.toISOString().split('T')[0];
    return { startDate: fmt(start), endDate: fmt(end) };
}

async function requestReport(token) {
    const { startDate, endDate } = getDateRange(CONFIG.reportDays);
    console.log(`   Date range: ${startDate} → ${endDate}`);

    const res = await fetch('https://advertising-api.amazon.com/reporting/reports', {
        method: 'POST',
        headers: {
            'Authorization':                   `Bearer ${token}`,
            'Amazon-Advertising-API-ClientId': CONFIG.clientId,
            'Amazon-Advertising-API-Scope':    CONFIG.profileId,
            'Content-Type':                    'application/json',
            'Accept':                          'application/json'
        },
        body: JSON.stringify({
            name:      `Keyword Metrics ${startDate}`,
            startDate,
            endDate,
            configuration: {
                adProduct:    'SPONSORED_PRODUCTS',
                groupBy:      ['targeting'],
                columns:      [
                    'campaignId',
                    'campaignName',
                    'adGroupId',
                    'adGroupName',
                    'keywordId',
                    'keyword',
                    'keywordType',
                    'matchType',
                    'impressions',
                    'clicks',
                    'cost',
                    'purchases14d',
                    'sales14d'
                ],
                reportTypeId: 'spTargeting',
                timeUnit:     'SUMMARY',
                format:       'GZIP_JSON'
            }
        })
    });

    if (!res.ok) throw new Error(`Report request ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.reportId) throw new Error('No reportId: ' + JSON.stringify(data));
    return data.reportId;
}

async function pollReport(token, reportId) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (let attempt = 1; attempt <= CONFIG.maxPollAttempts; attempt++) {
        const res = await fetch(`https://advertising-api.amazon.com/reporting/reports/${reportId}`, {
            headers: {
                'Authorization':                   `Bearer ${token}`,
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

    throw new Error('Report timed out after 15 minutes');
}

async function downloadReport(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const text   = zlib.gunzipSync(buffer).toString('utf8').trim();

    if (text.startsWith('[')) return JSON.parse(text);

    return text
        .split('\n')
        .filter(l => l.trim())
        .map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(Boolean);
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function tag(spend, clicks, sales, orders) {
    if (clicks === 0) return 'NO DATA';
    if (clicks >= CONFIG.bleederClicks && sales === 0) return 'BLEEDER';
    if (spend === 0) return 'NO DATA';
    const acos = (spend / sales) * 100;
    if (acos < CONFIG.targetAcos * 0.5)  return 'WINNER';    // ACOS < 15%
    if (acos <= CONFIG.targetAcos)        return 'GOOD';      // ACOS 15-30%
    if (acos <= CONFIG.targetAcos * 1.5)  return 'MARGINAL';  // ACOS 30-45%
    return 'BLEEDER';
}

function printConsoleReport(merged) {
    const withSpend = merged.filter(k => k.spend > 0);
    const winners   = withSpend.filter(k => k.acos < CONFIG.targetAcos * 0.5).sort((a, b) => a.acos - b.acos);
    const good      = withSpend.filter(k => k.acos >= CONFIG.targetAcos * 0.5 && k.acos <= CONFIG.targetAcos).sort((a, b) => a.acos - b.acos);
    const marginal  = withSpend.filter(k => k.acos > CONFIG.targetAcos && k.acos <= CONFIG.targetAcos * 1.5).sort((a, b) => a.acos - b.acos);
    const bleeders  = merged.filter(k => k.clicks >= CONFIG.bleederClicks && k.sales === 0);

    const totalSpend  = withSpend.reduce((s, k) => s + k.spend, 0);
    const totalSales  = withSpend.reduce((s, k) => s + k.sales, 0);
    const overallAcos = totalSpend > 0 ? (totalSpend / totalSales) * 100 : 0;

    console.log('\n═'.repeat(60));
    console.log('  KEYWORD PERFORMANCE SUMMARY  (30 days)');
    console.log('═'.repeat(60));
    console.log(`  Total keywords with spend:  ${withSpend.length}`);
    console.log(`  Overall spend:              $${totalSpend.toFixed(2)}`);
    console.log(`  Overall sales:              $${totalSales.toFixed(2)}`);
    console.log(`  Overall ACOS:               ${overallAcos.toFixed(1)}%`);
    console.log(`  Target ACOS:                ${CONFIG.targetAcos}%`);
    console.log('─'.repeat(60));
    console.log(`  🏆 Winners  (ACOS < ${(CONFIG.targetAcos * 0.5).toFixed(0)}%):   ${winners.length}`);
    console.log(`  ✅ Good     (ACOS ${(CONFIG.targetAcos * 0.5).toFixed(0)}-${CONFIG.targetAcos}%):  ${good.length}`);
    console.log(`  ⚠️  Marginal (ACOS ${CONFIG.targetAcos}-${(CONFIG.targetAcos * 1.5).toFixed(0)}%): ${marginal.length}`);
    console.log(`  ❌ Bleeders (30+ clicks, $0 sales): ${bleeders.length}`);
    console.log('═'.repeat(60));

    if (winners.length > 0) {
        console.log('\n🏆 WINNERS — Scale these up (INCREASE_BID)\n');
        winners.slice(0, 20).forEach((k, i) => {
            console.log(`  ${i + 1}. "${k.keyword}" [${k.matchType}]`);
            console.log(`     ${k.campaignName}`);
            console.log(`     ACOS: ${k.acos.toFixed(1)}%  |  Spend: $${k.spend.toFixed(2)}  |  Sales: $${k.sales.toFixed(2)}  |  Orders: ${k.orders}  |  Bid: $${k.bid.toFixed(2)}`);
        });
    }

    if (good.length > 0) {
        console.log('\n✅ GOOD PERFORMERS — Keep bidding\n');
        good.slice(0, 20).forEach((k, i) => {
            console.log(`  ${i + 1}. "${k.keyword}" [${k.matchType}]`);
            console.log(`     ${k.campaignName}`);
            console.log(`     ACOS: ${k.acos.toFixed(1)}%  |  Spend: $${k.spend.toFixed(2)}  |  Sales: $${k.sales.toFixed(2)}  |  Orders: ${k.orders}`);
        });
    }

    if (bleeders.length > 0) {
        console.log('\n❌ BLEEDERS — Consider pausing or reducing bid\n');
        bleeders.slice(0, 20).sort((a, b) => b.clicks - a.clicks).forEach((k, i) => {
            console.log(`  ${i + 1}. "${k.keyword}" [${k.matchType}]`);
            console.log(`     ${k.campaignName}`);
            console.log(`     Clicks: ${k.clicks}  |  Spend: $${k.spend.toFixed(2)}  |  Sales: $0  |  Bid: $${k.bid.toFixed(2)}`);
        });
    }

    console.log('\n' + '═'.repeat(60));
}

// ─── Sheet write ──────────────────────────────────────────────────────────────

const HEADERS = [
    'Keyword', 'Match Type', 'Campaign', 'State', 'Bid ($)',
    'Spend 30d ($)', 'Sales 30d ($)', 'Clicks', 'Impressions', 'Orders',
    'CTR%', 'CPC ($)', 'ACOS%', 'CVR%', 'ROAS', 'VPC ($)', 'Tag'
];

function buildSheetRow(k, rowNum) {
    const r = rowNum;
    return [
        k.keyword,                                        // A  Keyword
        k.matchType,                                      // B  Match Type
        k.campaignName,                                   // C  Campaign
        k.state,                                          // D  State
        k.bid,                                            // E  Bid
        parseFloat(k.spend.toFixed(2)),                   // F  Spend
        parseFloat(k.sales.toFixed(2)),                   // G  Sales
        k.clicks,                                         // H  Clicks
        k.impressions,                                    // I  Impressions
        k.orders,                                         // J  Orders
        `=IFERROR(H${r}/I${r}*100,0)`,                   // K  CTR%
        `=IFERROR(F${r}/H${r},0)`,                       // L  CPC
        `=IFERROR(F${r}/G${r}*100,0)`,                   // M  ACOS%
        `=IFERROR(J${r}/H${r}*100,0)`,                   // N  CVR%
        `=IFERROR(G${r}/F${r},0)`,                       // O  ROAS
        `=IFERROR(G${r}/H${r},0)`,                       // P  VPC
        // Q  Tag (WINNER / GOOD / MARGINAL / BLEEDER / NO DATA)
        `=IF(H${r}=0,"NO DATA",IF(AND(H${r}>=${CONFIG.bleederClicks},G${r}=0),"BLEEDER",` +
        `IF(F${r}=0,"NO DATA",IF(M${r}<${CONFIG.targetAcos * 0.5},"WINNER",` +
        `IF(M${r}<=${CONFIG.targetAcos},"GOOD",IF(M${r}<=${CONFIG.targetAcos * 1.5},"MARGINAL","BLEEDER"))))))`
    ];
}

async function writeToSheet(sheets, merged) {
    await sheets.ensureSheet(CONFIG.sheetName);

    // Headers in row 1
    await sheets.writeRows(CONFIG.sheetName, [HEADERS], 'A1');

    // Clear old data
    const clearEnd = Math.max(merged.length + 10, 500);
    await sheets.clearRange(CONFIG.sheetName, `A${CONFIG.dataStartRow}:Q${clearEnd}`);

    if (merged.length === 0) return;

    // Sort: winners first, then good, then marginal, then bleeders, then no data
    const order = { WINNER: 0, GOOD: 1, MARGINAL: 2, BLEEDER: 3, 'NO DATA': 4 };
    merged.sort((a, b) => {
        const ta = order[a.tagLabel] ?? 4;
        const tb = order[b.tagLabel] ?? 4;
        if (ta !== tb) return ta - tb;
        // Within same tag, sort by ACOS ascending (or clicks descending for bleeders)
        if (a.tagLabel === 'BLEEDER') return b.clicks - a.clicks;
        return a.acos - b.acos;
    });

    const rows = merged.map((k, i) => buildSheetRow(k, CONFIG.dataStartRow + i));
    await sheets.writeRows(CONFIG.sheetName, rows, `A${CONFIG.dataStartRow}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n🔍 Fetch Keyword Metrics (30-day analysis)\n');

    const missing = ['clientId', 'clientSecret', 'refreshToken', 'profileId']
        .filter(k => !CONFIG[k]);
    if (missing.length) {
        console.error('❌ Missing env vars:', missing.map(k => k.toUpperCase()).join(', '));
        process.exit(1);
    }

    const sheets = new UnifiedSheetsService();

    // 1. Auth
    console.log('🔐 Authenticating...');
    const token = await getAccessToken();
    console.log('✅ Authenticated\n');

    // 2. Fetch keyword structure + campaign names (parallel)
    console.log('📦 Fetching keyword list and campaign names...');
    const [keywords, campaigns] = await Promise.all([
        fetchAllKeywords(token),
        fetchAllCampaigns(token)
    ]);

    const campaignNames = new Map(campaigns.map(c => [String(c.campaignId), c.name]));
    console.log(`✅ ${keywords.length} keywords  |  ${campaigns.length} campaigns\n`);

    if (keywords.length === 0) {
        console.log('⚠️  No keywords found. Run fetch-ppc-campaigns.js to check campaign status.');
        return;
    }

    // 3. Request keyword metrics report
    console.log('📋 Requesting 30-day keyword metrics report...');
    const reportId = await requestReport(token);
    console.log(`   Report ID: ${reportId}\n`);

    // 4. Poll
    console.log('⏳ Waiting for report... (this takes ~10-15 min)');
    const downloadUrl = await pollReport(token, reportId);
    console.log('');

    // 5. Download
    console.log('📥 Downloading...');
    const metricsRaw = await downloadReport(downloadUrl);
    console.log(`✅ ${metricsRaw.length} keyword metric records\n`);

    // 6. Merge keyword structure + metrics by keywordId
    const metricsMap = new Map(
        metricsRaw
            .filter(m => m.keywordId)
            .map(m => [String(m.keywordId), m])
    );

    const merged = keywords.map(kw => {
        const m    = metricsMap.get(String(kw.keywordId)) || {};
        const spend = parseFloat(m.cost         || 0);
        const sales = parseFloat(m.sales14d     || 0);
        const clicks = parseInt(m.clicks        || 0, 10);
        const acos  = spend > 0 && sales > 0 ? (spend / sales) * 100 : 0;

        const tagLabel = tag(spend, clicks, sales, parseInt(m.purchases14d || 0, 10));

        return {
            keyword:      kw.keywordText || (m.keyword || ''),
            matchType:    kw.matchType   || (m.matchType || ''),
            campaignName: campaignNames.get(String(kw.campaignId)) || m.campaignName || '',
            state:        kw.state       || 'UNKNOWN',
            bid:          parseFloat(kw.bid || 0),
            spend,
            sales,
            clicks,
            impressions:  parseInt(m.impressions  || 0, 10),
            orders:       parseInt(m.purchases14d || 0, 10),
            acos,
            tagLabel
        };
    });

    // 7. Console analysis
    printConsoleReport(merged);

    // 8. Write to sheet
    if (process.env.GOOGLE_SHEETS_ID) {
        console.log(`\n💾 Writing ${merged.length} keywords to "${CONFIG.sheetName}" sheet...`);
        await writeToSheet(sheets, merged);
        console.log('✅ Sheet updated');
        console.log('   Keywords sorted: Winners first → Good → Marginal → Bleeders\n');
    }
}

run().catch(err => {
    console.error('\n❌', err.message);
    process.exit(1);
});
