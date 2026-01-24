require('dotenv').config();
const axios = require('axios');

/**
 * Simplified Campaign Performance Analyzer
 * Uses correct v3 Reporting API format from official documentation
 */

async function analyzePerformance() {
    try {
        console.log('\n💰 Analyzing Campaign Performance (Last 30 Days)...\n');

        // Get access token
        const tokenResponse = await axios.post(
            'https://api.amazon.com/auth/o2/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: process.env.AMAZON_REFRESH_TOKEN,
                client_id: process.env.AMAZON_CLIENT_ID,
                client_secret: process.env.AMAZON_CLIENT_SECRET
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenResponse.data.access_token;

        // Create report using CORRECT v3 format from docs
        console.log('📊 Creating performance report...\n');

        const reportResponse = await axios.post(
            'https://advertising-api.amazon.com/reporting/reports',
            {
                name: 'Campaign Performance',
                startDate: getDateDaysAgo(30),
                endDate: getDateDaysAgo(1),
                configuration: {
                    adProduct: 'SPONSORED_PRODUCTS',
                    groupBy: ['campaign'],
                    columns: ['impressions', 'clicks', 'cost'],
                    reportTypeId: 'spCampaigns',
                    timeUnit: 'SUMMARY',
                    format: 'GZIP_JSON'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
                    'Amazon-Advertising-API-Scope': process.env.AMAZON_PROFILE_ID,
                    'Content-Type': 'application/vnd.createasyncreportrequest.v3+json'
                }
            }
        );

        const reportId = reportResponse.data.reportId;
        console.log(`✅ Report ID: ${reportId}`);
        console.log('⏳ Waiting for completion...\n');

        // Poll for completion
        let status = 'IN_PROGRESS';
        let url = null;
        let attempts = 0;

        while (status === 'IN_PROGRESS' && attempts < 60) {
            await sleep(15000);

            const statusResp = await axios.get(
                `https://advertising-api.amazon.com/reporting/reports/${reportId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
                        'Amazon-Advertising-API-Scope': process.env.AMAZON_PROFILE_ID
                    }
                }
            );

            status = statusResp.data.status;
            url = statusResp.data.url;
            console.log(`   ${++attempts}. ${status}`);
        }

        if (status !== 'COMPLETED') {
            throw new Error(`Report failed: ${status}`);
        }

        // Download report
        console.log('\n✅ Downloading...\n');
        const data = await axios.get(url);

        // Analyze
        analyze(data.data);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

function analyze(data) {
    console.log('\n========================================');
    console.log('💸 PERFORMANCE ANALYSIS (Last 30 Days)');
    console.log('========================================\n');

    let totalSpend = 0;
    let totalSales = 0;
    let totalOrders = 0;
    let bleeders = [];
    let winners = [];

    for (const row of data) {
        const spend = parseFloat(row.cost || 0);
        const sales = parseFloat(row.attributedSales14d || 0);
        const orders = parseInt(row.attributedUnitsOrdered14d || 0);

        totalSpend += spend;
        totalSales += sales;
        totalOrders += orders;

        const acos = sales > 0 ? (spend / sales) * 100 : 999;

        const campaign = {
            name: row.campaignName,
            spend,
            sales,
            orders,
            acos: acos.toFixed(2)
        };

        if ((spend >= 10 && orders === 0) || acos > 100) {
            bleeders.push(campaign);
        } else if (acos < 30 && orders > 0) {
            winners.push(campaign);
        }
    }

    const overallAcos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0;
    const profit = totalSales - totalSpend;
    const wastedSpend = bleeders.reduce((sum, b) => sum + b.spend, 0);

    // Results
    console.log('📊 OVERALL\n');
    console.log(`Spend:        $${totalSpend.toFixed(2)}`);
    console.log(`Sales:        $${totalSales.toFixed(2)}`);
    console.log(`Orders:       ${totalOrders}`);
    console.log(`ACOS:         ${overallAcos.toFixed(2)}%`);
    console.log(`Profit:       ${profit > 0 ? '+' : ''}$${profit.toFixed(2)}\n`);

    console.log(`🔴 WASTED:     $${wastedSpend.toFixed(2)} (${((wastedSpend / totalSpend) * 100).toFixed(1)}% of spend)\n`);

    if (bleeders.length > 0) {
        console.log('Top 10 Bleeders:\n');
        bleeders.sort((a, b) => b.spend - a.spend).slice(0, 10).forEach((b, i) => {
            console.log(`${i + 1}. ${b.name}`);
            console.log(`   Lost: $${b.spend.toFixed(2)} | Sales: $${b.sales.toFixed(2)} | ACOS: ${b.acos}%\n`);
        });
    }

    if (winners.length > 0) {
        console.log('\n✅ TOP WINNERS\n');
        winners.sort((a, b) => (b.sales - b.spend) - (a.sales - a.spend)).slice(0, 5).forEach((w, i) => {
            console.log(`${i + 1}. ${w.name}`);
            console.log(`   Profit: $${(w.sales - w.spend).toFixed(2)} | ACOS: ${w.acos}%\n`);
        });
    }

    console.log('\n💡 ACTION ITEMS\n');
    if (wastedSpend > totalSpend * 0.2) {
        console.log(`🚨 PAUSE ${Math.min(10, bleeders.length)} worst bleeders → Save $${bleeders.slice(0, 10).reduce((s, b) => s + b.spend, 0).toFixed(2)}/month`);
    }
    if (winners.length > 0) {
        console.log(`✅ SCALE ${winners.length} winners → Increase budgets 50%`);
    }
    console.log('');
}

function getDateDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

analyzePerformance();
