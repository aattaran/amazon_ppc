/**
 * Daily Bleeder Detection Script
 * 
 * This will run automatically once API access is approved.
 * Run daily at 8 AM to detect underperforming campaigns.
 */

require('dotenv').config();
const axios = require('axios');
const XLSX = require('xlsx');

// ============================================
// CONFIGURATION
// ============================================

const CRITICAL_ACOS_THRESHOLD = 100; // 100% = losing money
const WARNING_ACOS_THRESHOLD = 80;   // 80% = low margin
const MIN_SPEND_THRESHOLD = 10;      // Only flag if spent >$10

// ============================================
// AUTHENTICATION
// ============================================

async function getAccessToken() {
    console.log('🔄 Refreshing access token...');

    const response = await axios.post(
        process.env.AMAZON_TOKEN_URL,
        new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: process.env.AMAZON_REFRESH_TOKEN,
            client_id: process.env.AMAZON_CLIENT_ID,
            client_secret: process.env.AMAZON_CLIENT_SECRET
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    console.log('✅ Access token obtained\n');
    return response.data.access_token;
}

// ============================================
// API CALLS
// ============================================

async function makeAPIRequest(accessToken, endpoint, method = 'GET', data = null) {
    const config = {
        method,
        url: `${process.env.AMAZON_ADS_API_URL}${endpoint}`,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
            'Amazon-Advertising-API-Scope': process.env.AMAZON_PROFILE_ID,
            'Content-Type': 'application/json'
        }
    };

    if (data) {
        config.data = data;
    }

    const response = await axios(config);
    return response.data;
}

// ============================================
// BLEEDER DETECTION
// ============================================

async function detectBleeders() {
    console.log('🔍 BLEEDER DETECTION - Daily Report');
    console.log('====================================\n');

    const accessToken = await getAccessToken();

    // Step 1: Get all campaigns
    console.log('📊 Fetching campaigns...');
    const campaigns = await makeAPIRequest(accessToken, '/v2/sp/campaigns');
    const activeCampaigns = campaigns.filter(c => c.state === 'enabled');
    console.log(`Found ${activeCampaigns.length} active campaigns\n`);

    // Step 2: Request performance report for yesterday
    console.log('📈 Requesting performance report...');
    const yesterday = getYesterdayDate();

    const reportRequest = await makeAPIRequest(
        accessToken,
        '/v2/sp/campaigns/report',
        'POST',
        {
            reportDate: yesterday,
            metrics: [
                'campaignId',
                'campaignName',
                'impressions',
                'clicks',
                'cost',
                'sales',
                'orders',
                'ctr',
                'cpc',
                'spend',
                'acos',
                'roas'
            ]
        }
    );

    const reportId = reportRequest.reportId;
    console.log(`Report requested: ${reportId}`);
    console.log('⏳ Waiting for report to generate...\n');

    // Step 3: Wait for report and download
    let report;
    for (let i = 0; i < 10; i++) {
        await sleep(10000); // Wait 10 seconds

        try {
            report = await makeAPIRequest(accessToken, `/v2/reports/${reportId}`);
            if (report.status === 'SUCCESS') {
                console.log('✅ Report ready!\n');
                break;
            }
        } catch (err) {
            // Report not ready yet
        }
    }

    // Step 4: Download report data
    const reportData = await makeAPIRequest(accessToken, `/v2/reports/${reportId}/download`);

    // Step 5: Analyze for bleeders
    console.log('🔬 Analyzing performance...\n');

    const bleeders = {
        critical: [],
        warning: [],
        healthy: []
    };

    reportData.forEach(row => {
        const acos = parseFloat(row.acos) || 0;
        const spend = parseFloat(row.spend) || 0;

        if (spend < MIN_SPEND_THRESHOLD) {
            return; // Skip low-spend campaigns
        }

        const campaign = {
            id: row.campaignId,
            name: row.campaignName,
            spend,
            sales: parseFloat(row.sales) || 0,
            acos: acos * 100, // Convert to percentage
            clicks: parseInt(row.clicks) || 0,
            orders: parseInt(row.orders) || 0,
            cpc: parseFloat(row.cpc) || 0
        };

        if (acos >= CRITICAL_ACOS_THRESHOLD / 100) {
            bleeders.critical.push(campaign);
        } else if (acos >= WARNING_ACOS_THRESHOLD / 100) {
            bleeders.warning.push(campaign);
        } else {
            bleeders.healthy.push(campaign);
        }
    });

    // Step 6: Print results
    console.log('====================================');
    console.log('🚨 CRITICAL BLEEDERS (ACOS ≥100%)');
    console.log('====================================\n');

    if (bleeders.critical.length === 0) {
        console.log('✅ No critical bleeders found!\n');
    } else {
        bleeders.critical.forEach(c => {
            console.log(`Campaign: ${c.name}`);
            console.log(`  Spend: $${c.spend.toFixed(2)}`);
            console.log(`  Sales: $${c.sales.toFixed(2)}`);
            console.log(`  ACOS: ${c.acos.toFixed(1)}%`);
            console.log(`  Loss: -$${(c.spend - c.sales).toFixed(2)}`);
            console.log('');
        });
    }

    console.log('====================================');
    console.log('⚠️  WARNING (ACOS 80-99%)');
    console.log('====================================\n');

    if (bleeders.warning.length === 0) {
        console.log('✅ No warnings!\n');
    } else {
        bleeders.warning.forEach(c => {
            console.log(`Campaign: ${c.name}`);
            console.log(`  ACOS: ${c.acos.toFixed(1)}%`);
            console.log(`  Spend: $${c.spend.toFixed(2)} | Sales: $${c.sales.toFixed(2)}`);
            console.log('');
        });
    }

    console.log('====================================');
    console.log('✅ HEALTHY CAMPAIGNS (ACOS <80%)');
    console.log('====================================\n');

    bleeders.healthy.forEach(c => {
        console.log(`${c.name}: ${c.acos.toFixed(1)}% ACOS`);
    });

    // Step 7: Generate optimization bulksheet
    if (bleeders.critical.length > 0) {
        console.log('\n📥 Generating optimization bulksheet...');
        await generateOptimizationBulksheet(bleeders.critical);
    }

    return bleeders;
}

// ============================================
// BULKSHEET GENERATION
// ============================================

async function generateOptimizationBulksheet(criticalBleeders) {
    const rows = [];

    criticalBleeders.forEach(bleeder => {
        // Reduce budget by 50%, minimum $2/day
        const newBudget = Math.max(bleeder.currentBudget * 0.5, 2);

        rows.push({
            'Product': 'Sponsored Products',
            'Entity': 'Campaign',
            'Operation': 'update',
            'Campaign ID': bleeder.id,
            'Campaign Name': bleeder.name,
            'Daily Budget': newBudget,
            'State': 'enabled'
        });
    });

    // Create Excel file
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sponsored Products Campaigns');

    const filename = `bleeder-fix-${getYesterdayDate()}.xlsx`;
    XLSX.writeFile(wb, filename);

    console.log(`✅ Bulksheet saved: ${filename}`);
    console.log('📤 Upload this to Amazon Ads to apply changes\n');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0].replace(/-/g, '');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// RUN
// ============================================

if (require.main === module) {
    detectBleeders()
        .then(results => {
            console.log('\n✅ Bleeder detection complete!');
            process.exit(0);
        })
        .catch(err => {
            console.error('\n❌ Error:', err.message);
            if (err.response) {
                console.error('Response:', err.response.data);
            }
            process.exit(1);
        });
}

module.exports = { detectBleeders };
