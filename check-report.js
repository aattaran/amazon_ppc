require('dotenv').config();
const axios = require('axios');
const zlib = require('zlib');

// Get existing report
const reportId = '4bd8d9be-266a-451d-a741-3dc9c8ffb586';

async function getReport() {
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

    console.log('\n📊 Report Status:', statusResp.data.status);

    if (statusResp.data.url) {
        console.log('📥 Downloading...\n');

        // Download GZIP data
        const response = await axios.get(statusResp.data.url, {
            responseType: 'arraybuffer'
        });

        // Decompress
        const decompressed = zlib.gunzipSync(response.data);
        const data = JSON.parse(decompressed.toString());

        console.log('========================================');
        console.log('💸 CAMPAIGN SPEND ANALYSIS (Last 30 Days)');
        console.log('========================================\n');

        let totalSpend = 0;
        let totalImpressions = 0;
        let totalClicks = 0;

        for (const row of data) {
            totalSpend += parseFloat(row.cost || 0);
            totalImpressions += parseInt(row.impressions || 0);
            totalClicks += parseInt(row.clicks || 0);
        }

        const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

        console.log(`💰 Total Spend:       $${totalSpend.toFixed(2)}`);
        console.log(`👁️  Total Impressions: ${totalImpressions.toLocaleString()}`);
        console.log(`🖱️  Total Clicks:      ${totalClicks.toLocaleString()}`);
        console.log(`📊 Avg CPC:           $${avgCPC.toFixed(2)}`);
        console.log(`📈 CTR:               ${ctr.toFixed(2)}%`);
        console.log(`\n🔍 Total Campaigns:   ${data.length}`);

        console.log('\n⚠️  NOTE: This shows SPEND ONLY.');
        console.log('   Sales data requires additional API columns (not working yet).\n');

        console.log('========================================\n');
    }
}

getReport().catch(console.error);
