/**
 * DIAGNOSE NO SALES — Pull campaign + keyword performance from Amazon Ads API
 * Run: node diagnose-no-sales.js
 */

require('dotenv').config();

const TokenManager = require('./src/titan/auth/token-manager.js');
const AmazonV3Client = require('./src/titan/api/amazon-v3-client.js');
const ResilientPoller = require('./src/titan/api/resilient-poller.js');

const config = {
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    profileId: process.env.AMAZON_PROFILE_ID || '1130011681132849',
    apiUrl: 'https://advertising-api.amazon.com'
};

async function main() {
    console.log('='.repeat(70));
    console.log('DIAGNOSIS: WHY NO SALES?');
    console.log('='.repeat(70));

    const tokenManager = new TokenManager(config);
    const client = new AmazonV3Client(tokenManager, config);

    // ── 1. Campaign-level report (last 30 days) ──
    console.log('\n── STEP 1: Campaign Performance Report (30d) ──\n');

    const token = await tokenManager.getToken();
    const endDate = new Date().toISOString().split('T')[0];
    const startDate30 = new Date();
    startDate30.setDate(startDate30.getDate() - 30);
    const startDateStr = startDate30.toISOString().split('T')[0];

    const campaignReportBody = {
        name: `Campaign Diagnosis - ${new Date().toISOString()}`,
        startDate: startDateStr,
        endDate,
        configuration: {
            adProduct: 'SPONSORED_PRODUCTS',
            groupBy: ['campaign'],
            columns: [
                'campaignId', 'campaignName', 'campaignStatus',
                'impressions', 'clicks', 'cost',
                'sales14d', 'purchases14d'
            ],
            reportTypeId: 'spCampaigns',
            timeUnit: 'SUMMARY',
            format: 'GZIP_JSON'
        }
    };

    const campaignReportResponse = await fetch(
        `${config.apiUrl}/reporting/reports`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Amazon-Advertising-API-ClientId': config.clientId,
                'Amazon-Advertising-API-Scope': config.profileId,
                'Content-Type': 'application/vnd.createasyncreportrequest.v3+json'
            },
            body: JSON.stringify(campaignReportBody)
        }
    );

    if (!campaignReportResponse.ok) {
        const err = await campaignReportResponse.text();
        console.error('Campaign report request failed:', err);
        // Try with simpler columns
        console.log('Retrying with simpler report config...');
    }

    const campaignReportData = await campaignReportResponse.json();
    console.log('Campaign report ID:', campaignReportData.reportId);

    // ── 2. Keyword-level report (last 30 days) ──
    console.log('\n── STEP 2: Keyword Performance Report (30d) ──\n');

    const keywordReportId = await client.requestReport('spTargeting', 30);

    // ── 3. Poll and download both reports ──
    console.log('\n── STEP 3: Polling reports... ──\n');

    const poller = new ResilientPoller(client);

    // Poll campaign report
    let campaignRows = [];
    try {
        const campaignUrl = await poller.poll(campaignReportData.reportId);
        campaignRows = await client.downloadReport(campaignUrl);
    } catch (e) {
        console.error('Campaign report download failed:', e.message);
    }

    // Poll keyword report
    let keywordRows = [];
    try {
        const keywordUrl = await poller.poll(keywordReportId);
        keywordRows = await client.downloadReport(keywordUrl);
    } catch (e) {
        console.error('Keyword report download failed:', e.message);
    }

    // ── 4. Analyze campaign data ──
    console.log('\n' + '='.repeat(70));
    console.log('CAMPAIGN PERFORMANCE (Last 30 Days)');
    console.log('='.repeat(70));

    let totalSpend = 0, totalSales = 0, totalClicks = 0, totalImpressions = 0, totalOrders = 0;

    // Sort by spend descending
    campaignRows.sort((a, b) => (b.cost || 0) - (a.cost || 0));

    for (const c of campaignRows) {
        const spend = c.cost || 0;
        const sales = c.sales14d || 0;
        const clicks = c.clicks || 0;
        const impressions = c.impressions || 0;
        const orders = c.purchases14d || 0;
        const acos = sales > 0 ? ((spend / sales) * 100).toFixed(1) : 'INF';
        const cvr = clicks > 0 ? ((orders / clicks) * 100).toFixed(1) : '0.0';
        const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : '0.00';

        totalSpend += spend;
        totalSales += sales;
        totalClicks += clicks;
        totalImpressions += impressions;
        totalOrders += orders;

        if (spend > 0.5) { // Only show campaigns with meaningful spend
            console.log(`\n  ${c.campaignName || c.campaignId}`);
            console.log(`    Status: ${c.campaignStatus || 'N/A'}`);
            console.log(`    Impressions: ${impressions.toLocaleString()} | Clicks: ${clicks} | Orders: ${orders}`);
            console.log(`    Spend: $${spend.toFixed(2)} | Sales: $${sales.toFixed(2)} | ACOS: ${acos}%`);
            console.log(`    CPC: $${cpc} | CVR: ${cvr}%`);
        }
    }

    const totalAcos = totalSales > 0 ? ((totalSpend / totalSales) * 100).toFixed(1) : 'INF';
    const totalCvr = totalClicks > 0 ? ((totalOrders / totalClicks) * 100).toFixed(1) : '0.0';
    const totalCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0.00';

    console.log('\n' + '-'.repeat(70));
    console.log('TOTALS:');
    console.log(`  Campaigns reporting: ${campaignRows.length}`);
    console.log(`  Impressions: ${totalImpressions.toLocaleString()}`);
    console.log(`  Clicks: ${totalClicks.toLocaleString()}`);
    console.log(`  Orders: ${totalOrders}`);
    console.log(`  Spend: $${totalSpend.toFixed(2)}`);
    console.log(`  Sales: $${totalSales.toFixed(2)}`);
    console.log(`  ACOS: ${totalAcos}%`);
    console.log(`  CVR: ${totalCvr}%`);
    console.log(`  Avg CPC: $${totalCpc}`);
    console.log('-'.repeat(70));

    // ── 5. Top spending keywords with no sales ──
    console.log('\n' + '='.repeat(70));
    console.log('TOP SPENDING KEYWORDS WITH NO SALES (Bleeders)');
    console.log('='.repeat(70));

    const bleeders = keywordRows
        .filter(k => (k.purchases14d || 0) === 0 && (k.cost || 0) > 1)
        .sort((a, b) => (b.cost || 0) - (a.cost || 0))
        .slice(0, 30);

    for (const k of bleeders) {
        console.log(`\n  "${k.keyword || k.keywordId}" [${k.matchType || 'N/A'}]`);
        console.log(`    Campaign: ${k.campaignName || k.campaignId}`);
        console.log(`    Clicks: ${k.clicks || 0} | Spend: $${(k.cost || 0).toFixed(2)} | Sales: $0 | Orders: 0`);
    }

    // ── 6. Keywords WITH sales (winners) ──
    console.log('\n' + '='.repeat(70));
    console.log('KEYWORDS WITH SALES (Winners)');
    console.log('='.repeat(70));

    const winners = keywordRows
        .filter(k => (k.purchases14d || 0) > 0)
        .sort((a, b) => (b.purchases14d || 0) - (a.purchases14d || 0));

    if (winners.length === 0) {
        console.log('\n  *** NO KEYWORDS WITH SALES IN LAST 30 DAYS ***');
    } else {
        for (const k of winners.slice(0, 20)) {
            const spend = k.cost || 0;
            const sales = k.sales14d || 0;
            const acos = sales > 0 ? ((spend / sales) * 100).toFixed(1) : 'INF';
            console.log(`\n  "${k.keyword || k.keywordId}" [${k.matchType || 'N/A'}]`);
            console.log(`    Campaign: ${k.campaignName || k.campaignId}`);
            console.log(`    Clicks: ${k.clicks || 0} | Orders: ${k.purchases14d || 0} | Spend: $${spend.toFixed(2)} | Sales: $${sales.toFixed(2)} | ACOS: ${acos}%`);
        }
    }

    // ── 7. Diagnosis summary ──
    console.log('\n' + '='.repeat(70));
    console.log('DIAGNOSIS');
    console.log('='.repeat(70));

    if (totalOrders === 0) {
        console.log('\n❌ ZERO ORDERS in 30 days. Possible causes:');
        console.log('  1. Listing issue — bad images, title, bullets, or reviews (check listing quality)');
        console.log('  2. Price too high vs competition');
        console.log('  3. Wrong keywords — getting impressions/clicks but not buyer-intent searches');
        console.log('  4. Product page not converting — check "Add to Cart" rate in Business Reports');
        console.log('  5. Campaign budgets exhausting early — check if campaigns hit daily cap by noon');
        if (totalCvr === '0.0' && totalClicks > 50) {
            console.log('  6. ⚠️  0% CVR with significant clicks = LISTING PROBLEM, not PPC problem');
        }
    } else if (parseFloat(totalAcos) > 100) {
        console.log(`\n⚠️  ACOS is ${totalAcos}% — spending more than earning.`);
        console.log('  Possible causes:');
        console.log('  1. Bids too high for current CVR');
        console.log('  2. Too many broad/auto keywords bleeding');
        console.log('  3. Need to negate non-converting search terms');
    }

    console.log('\nDone.');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
