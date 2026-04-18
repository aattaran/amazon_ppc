/**
 * PPC Diagnosis Script
 * Pulls live campaign + keyword performance from Amazon Ads API v3
 * and diagnoses issues against the PPC Master Skill framework.
 */

const dotenv = require('dotenv');
dotenv.config();

const TokenManager = require('./src/titan/auth/token-manager.js');
const AmazonV3Client = require('./src/titan/api/amazon-v3-client.js');
const ResilientPoller = require('./src/titan/api/resilient-poller.js');

const config = {
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    profileId: process.env.AMAZON_PROFILE_ID,
    apiUrl: 'https://advertising-api.amazon.com',
};

async function main() {
    const tokenManager = new TokenManager(config);
    const client = new AmazonV3Client(tokenManager, config);
    const poller = new ResilientPoller(client.tokenManager, config);

    console.log('='.repeat(80));
    console.log('AMAZON PPC LIVE DIAGNOSIS');
    console.log('='.repeat(80));

    // 1. Fetch all campaigns (enabled + paused + archived to see full picture)
    console.log('\n--- CAMPAIGNS ---');
    const enabledCampaigns = await client.fetchCampaigns({ include: ['ENABLED'] });
    const pausedCampaigns = await client.fetchCampaigns({ include: ['PAUSED'] });
    const archivedCampaigns = await client.fetchCampaigns({ include: ['ARCHIVED'] });

    console.log(`\nEnabled: ${enabledCampaigns.length}`);
    console.log(`Paused: ${pausedCampaigns.length}`);
    console.log(`Archived: ${archivedCampaigns.length}`);

    console.log('\n--- ENABLED CAMPAIGNS ---');
    for (const c of enabledCampaigns) {
        console.log(`  ${c.name}`);
        console.log(`    ID: ${c.campaignId}`);
        console.log(`    Budget: $${c.budget?.budget || 'N/A'}/day | Type: ${c.budget?.budgetType || 'N/A'}`);
        console.log(`    Targeting: ${c.targetingType || 'N/A'}`);
        console.log(`    Dynamic Bidding: ${JSON.stringify(c.dynamicBidding || {})}`);
        console.log('');
    }

    console.log('\n--- PAUSED CAMPAIGNS ---');
    for (const c of pausedCampaigns) {
        console.log(`  ${c.name} (PAUSED)`);
        console.log(`    ID: ${c.campaignId}`);
        console.log(`    Budget: $${c.budget?.budget || 'N/A'}/day`);
        console.log('');
    }

    // 2. Fetch keywords for enabled campaigns
    console.log('\n--- KEYWORDS (Enabled) ---');
    const keywords = await client.fetchKeywords({ include: ['ENABLED'] });
    console.log(`Total enabled keywords: ${keywords.length}`);

    // Group by match type
    const byMatch = {};
    for (const kw of keywords) {
        const mt = kw.matchType || 'UNKNOWN';
        byMatch[mt] = (byMatch[mt] || 0) + 1;
    }
    console.log('By match type:', JSON.stringify(byMatch));

    // Show bid distribution
    const bids = keywords.filter(k => k.bid).map(k => parseFloat(k.bid));
    if (bids.length) {
        bids.sort((a, b) => a - b);
        console.log(`\nBid distribution (${bids.length} keywords with bids):`);
        console.log(`  Min: $${bids[0].toFixed(2)}`);
        console.log(`  Max: $${bids[bids.length - 1].toFixed(2)}`);
        console.log(`  Median: $${bids[Math.floor(bids.length / 2)].toFixed(2)}`);
        console.log(`  Mean: $${(bids.reduce((a, b) => a + b, 0) / bids.length).toFixed(2)}`);

        // Count above/below target CPC ($0.42)
        const targetCPC = 0.42;
        const above = bids.filter(b => b > targetCPC).length;
        const below = bids.filter(b => b <= targetCPC).length;
        console.log(`\n  Above TargetCPC ($${targetCPC}): ${above} (${(above / bids.length * 100).toFixed(1)}%)`);
        console.log(`  Below TargetCPC ($${targetCPC}): ${below} (${(below / bids.length * 100).toFixed(1)}%)`);

        // High bid keywords (potential bleeders)
        const highBids = keywords.filter(k => parseFloat(k.bid) > 1.0);
        if (highBids.length) {
            console.log(`\n  HIGH BID KEYWORDS (> $1.00): ${highBids.length}`);
            for (const kw of highBids.slice(0, 20)) {
                console.log(`    $${parseFloat(kw.bid).toFixed(2)} - "${kw.keywordText}" (${kw.matchType})`);
            }
        }
    }

    // 3. Request and download 30-day keyword performance report
    console.log('\n\n--- 30-DAY PERFORMANCE REPORT ---');
    try {
        const reportId = await client.requestReport('spTargeting', 30);

        // Poll for completion
        let reportData = null;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const status = await client.checkReportStatus(reportId);
            console.log(`  Poll ${i + 1}: ${status.status}`);
            if (status.status === 'COMPLETED') {
                reportData = await client.downloadReport(status.url);
                break;
            } else if (status.status === 'FAILURE') {
                console.error('Report failed:', status);
                break;
            }
        }

        if (reportData && reportData.length) {
            // Aggregate metrics
            let totalSpend = 0, totalSales = 0, totalClicks = 0, totalImpressions = 0, totalOrders = 0;

            for (const row of reportData) {
                totalSpend += parseFloat(row.cost || 0);
                totalSales += parseFloat(row.sales14d || 0);
                totalClicks += parseInt(row.clicks || 0);
                totalImpressions += parseInt(row.impressions || 0);
                totalOrders += parseInt(row.purchases14d || 0);
            }

            const acos = totalSales > 0 ? (totalSpend / totalSales * 100) : Infinity;
            const cpc = totalClicks > 0 ? (totalSpend / totalClicks) : 0;
            const cvr = totalClicks > 0 ? (totalOrders / totalClicks * 100) : 0;
            const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
            const roas = totalSpend > 0 ? (totalSales / totalSpend) : 0;

            console.log('\n=== ACCOUNT SUMMARY (30 days) ===');
            console.log(`  Total Spend:       $${totalSpend.toFixed(2)}`);
            console.log(`  Total Sales:       $${totalSales.toFixed(2)}`);
            console.log(`  Total Orders:      ${totalOrders}`);
            console.log(`  Total Clicks:      ${totalClicks}`);
            console.log(`  Total Impressions: ${totalImpressions.toLocaleString()}`);
            console.log(`  ACOS:              ${acos.toFixed(1)}%`);
            console.log(`  ROAS:              ${roas.toFixed(2)}x`);
            console.log(`  CPC:               $${cpc.toFixed(2)}`);
            console.log(`  CVR:               ${cvr.toFixed(1)}%`);
            console.log(`  CTR:               ${ctr.toFixed(2)}%`);

            // Target CPC check
            const targetCPC = 0.42;
            console.log(`\n  TargetCPC:         $${targetCPC} (AOV $17.70 x 30% ACoS x 8% CVR)`);
            console.log(`  Actual CPC:        $${cpc.toFixed(2)}`);
            console.log(`  CPC vs Target:     ${cpc > targetCPC ? 'OVER by $' + (cpc - targetCPC).toFixed(2) + ' (' + ((cpc / targetCPC - 1) * 100).toFixed(0) + '% over)' : 'UNDER (safe)'}`);

            // Top bleeders (high spend, low/no sales)
            const bleeders = reportData
                .filter(r => parseFloat(r.cost || 0) > 5 && (parseFloat(r.sales14d || 0) === 0 || (parseFloat(r.cost || 0) / parseFloat(r.sales14d || 1)) > 0.7))
                .sort((a, b) => parseFloat(b.cost || 0) - parseFloat(a.cost || 0));

            console.log(`\n--- TOP BLEEDERS (spend >$5, ACOS >70% or no sales) ---`);
            console.log(`  Total bleeders: ${bleeders.length}`);
            let bleederSpend = 0;
            for (const b of bleeders.slice(0, 30)) {
                const spend = parseFloat(b.cost || 0);
                const sales = parseFloat(b.sales14d || 0);
                const bAcos = sales > 0 ? (spend / sales * 100).toFixed(0) + '%' : 'NO SALES';
                bleederSpend += spend;
                console.log(`    $${spend.toFixed(2)} spend | ${bAcos} ACOS | ${b.clicks} clicks | "${b.keyword || b.targetingExpression || 'auto-target'}" (${b.campaignName || b.campaignId})`);
            }
            console.log(`\n  Total bleeder spend: $${bleederSpend.toFixed(2)} (${(bleederSpend / totalSpend * 100).toFixed(1)}% of total)`);

            // Top winners
            const winners = reportData
                .filter(r => parseInt(r.purchases14d || 0) >= 1 && parseFloat(r.sales14d || 0) > 0)
                .map(r => ({
                    ...r,
                    acos: parseFloat(r.cost || 0) / parseFloat(r.sales14d || 1) * 100
                }))
                .filter(r => r.acos <= 40)
                .sort((a, b) => parseInt(b.purchases14d) - parseInt(a.purchases14d));

            console.log(`\n--- TOP WINNERS (ACOS ≤ 40%, has sales) ---`);
            for (const w of winners.slice(0, 20)) {
                console.log(`    ${w.acos.toFixed(0)}% ACOS | ${w.purchases14d} orders | $${parseFloat(w.sales14d).toFixed(2)} sales | $${parseFloat(w.cost).toFixed(2)} spend | "${w.keyword || w.targetingExpression || 'auto-target'}" (${w.campaignName || w.campaignId})`);
            }

            // Zero impression keywords
            const zeroImps = reportData.filter(r => parseInt(r.impressions || 0) === 0);
            console.log(`\n--- BURIED KEYWORDS (0 impressions, 30d) ---`);
            console.log(`  Count: ${zeroImps.length} (${(zeroImps.length / reportData.length * 100).toFixed(1)}% of all targets)`);

            // Death by 1000 cuts analysis
            const lowData = reportData.filter(r => parseInt(r.clicks || 0) <= 2 && parseInt(r.purchases14d || 0) === 0 && parseFloat(r.cost || 0) > 0);
            const lowDataSpend = lowData.reduce((sum, r) => sum + parseFloat(r.cost || 0), 0);
            console.log(`\n--- "DEATH BY 1000 CUTS" ANALYSIS ---`);
            console.log(`  Low-data targets (≤2 clicks, 0 sales, with spend): ${lowData.length}`);
            console.log(`  Combined spend: $${lowDataSpend.toFixed(2)} (${(lowDataSpend / totalSpend * 100).toFixed(1)}% of total)`);

            // Campaign-level breakdown
            console.log('\n--- CAMPAIGN-LEVEL BREAKDOWN ---');
            const byCampaign = {};
            for (const row of reportData) {
                const cName = row.campaignName || row.campaignId;
                if (!byCampaign[cName]) byCampaign[cName] = { spend: 0, sales: 0, clicks: 0, impressions: 0, orders: 0 };
                byCampaign[cName].spend += parseFloat(row.cost || 0);
                byCampaign[cName].sales += parseFloat(row.sales14d || 0);
                byCampaign[cName].clicks += parseInt(row.clicks || 0);
                byCampaign[cName].impressions += parseInt(row.impressions || 0);
                byCampaign[cName].orders += parseInt(row.purchases14d || 0);
            }

            const campaignRows = Object.entries(byCampaign)
                .map(([name, m]) => ({
                    name,
                    ...m,
                    acos: m.sales > 0 ? (m.spend / m.sales * 100) : Infinity,
                    cpc: m.clicks > 0 ? (m.spend / m.clicks) : 0,
                    cvr: m.clicks > 0 ? (m.orders / m.clicks * 100) : 0,
                }))
                .sort((a, b) => b.spend - a.spend);

            for (const c of campaignRows) {
                const acosStr = c.acos === Infinity ? 'NO SALES' : `${c.acos.toFixed(0)}%`;
                const status = c.acos <= 30 ? 'WINNER' : c.acos <= 50 ? 'OK' : c.acos <= 70 ? 'WATCH' : 'BLEEDER';
                console.log(`  [${status}] ${c.name}`);
                console.log(`    Spend: $${c.spend.toFixed(2)} | Sales: $${c.sales.toFixed(2)} | ACOS: ${acosStr} | Orders: ${c.orders} | CPC: $${c.cpc.toFixed(2)} | CVR: ${c.cvr.toFixed(1)}%`);
            }
        }
    } catch (err) {
        console.error('Report error:', err.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('DIAGNOSIS COMPLETE');
    console.log('='.repeat(80));
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
