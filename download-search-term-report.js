/**
 * SEARCH TERM REPORT DOWNLOADER (Last 60 Days)
 * Amazon Ads API v3 - Sponsored Products
 *
 * Downloads every customer search query that triggered your ads over the
 * last 60 days with full performance metrics (spend, sales, ACOS, etc.).
 *
 * Output: search-term-report-60days-YYYYMMDD.csv
 *
 * Credentials required in .env:
 *   AMAZON_REFRESH_TOKEN
 *   AMAZON_CLIENT_ID
 *   AMAZON_CLIENT_SECRET
 *   AMAZON_PROFILE_ID
 *
 * Usage: node download-search-term-report.js
 */

require('dotenv').config();
const axios = require('axios');
const zlib = require('zlib');
const util = require('util');
const fs = require('fs');
const path = require('path');

const gunzip = util.promisify(zlib.gunzip);

const ADS_CONFIG = {
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    profileId: process.env.AMAZON_PROFILE_ID,
    apiBase: 'https://advertising-api.amazon.com'
};

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
async function getAccessToken() {
    console.log('🔑 Authenticating with Amazon Ads API...');

    if (!ADS_CONFIG.refreshToken || !ADS_CONFIG.clientId || !ADS_CONFIG.clientSecret) {
        throw new Error(
            'Missing Amazon Ads credentials.\n' +
            'Set AMAZON_REFRESH_TOKEN, AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET in .env'
        );
    }

    if (!ADS_CONFIG.profileId) {
        throw new Error('Missing AMAZON_PROFILE_ID in .env');
    }

    const response = await axios.post(
        'https://api.amazon.com/auth/o2/token',
        new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ADS_CONFIG.refreshToken,
            client_id: ADS_CONFIG.clientId,
            client_secret: ADS_CONFIG.clientSecret
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (response.data.error) {
        throw new Error(`Auth failed: ${response.data.error_description || response.data.error}`);
    }

    console.log('   ✅ Authenticated\n');
    return response.data.access_token;
}

function adsHeaders(token) {
    return {
        'Authorization': `Bearer ${token}`,
        'Amazon-Advertising-API-ClientId': ADS_CONFIG.clientId,
        'Amazon-Advertising-API-Scope': ADS_CONFIG.profileId
    };
}

// ─────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────
function getDateRange(days = 60) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const fmt = d => d.toISOString().split('T')[0];
    return { startDate: fmt(start), endDate: fmt(end) };
}

// ─────────────────────────────────────────────
// Report lifecycle (Ads API v3)
// ─────────────────────────────────────────────
async function requestReport(token) {
    const { startDate, endDate } = getDateRange(60);
    console.log(`📊 Requesting Search Term Report...`);
    console.log(`   Date range: ${startDate} → ${endDate}\n`);

    const body = {
        name: `Search Term Report 60 Days - ${new Date().toISOString().slice(0, 10)}`,
        startDate,
        endDate,
        configuration: {
            adProduct: 'SPONSORED_PRODUCTS',
            groupBy: ['searchTerm'],
            columns: [
                'campaignName',
                'campaignId',
                'adGroupName',
                'keywordText',
                'keywordId',
                'matchType',
                'searchTerm',
                'impressions',
                'clicks',
                'cost',
                'purchases14d',
                'sales14d'
            ],
            reportTypeId: 'spSearchTerm',
            timeUnit: 'SUMMARY',
            format: 'GZIP_JSON'
        }
    };

    const response = await axios.post(
        `${ADS_CONFIG.apiBase}/reporting/reports`,
        body,
        {
            headers: {
                ...adsHeaders(token),
                'Content-Type': 'application/vnd.createasyncreportrequest.v3+json'
            }
        }
    );

    const reportId = response.data.reportId;
    if (!reportId) throw new Error('No reportId returned from Ads API');

    console.log(`   Report ID: ${reportId}`);
    return reportId;
}

async function pollReport(token, reportId) {
    console.log('⏳ Waiting for report to complete...');

    for (let i = 0; i < 60; i++) {
        const response = await axios.get(
            `${ADS_CONFIG.apiBase}/reporting/reports/${reportId}`,
            { headers: adsHeaders(token) }
        );

        const { status, url } = response.data;

        if (status === 'COMPLETED' || status === 'SUCCESS') {
            console.log('   ✅ Report ready\n');
            return url || response.data.reportDocumentUrl;
        }

        if (status === 'FAILURE' || status === 'FAILED') {
            throw new Error(`Report generation failed: ${JSON.stringify(response.data)}`);
        }

        if (i > 0 && i % 10 === 0) {
            console.log(`   Still processing... (${i * 3}s elapsed, status: ${status})`);
        }

        await new Promise(r => setTimeout(r, 3000));
    }

    throw new Error('Timeout waiting for report (3 minutes)');
}

async function downloadAndDecompress(url) {
    console.log('📥 Downloading report...');

    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Detect gzip magic bytes
    const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b;
    const raw = isGzip ? (await gunzip(buffer)).toString('utf-8') : buffer.toString('utf-8');

    const data = JSON.parse(raw);
    console.log(`   ✅ ${data.length} search terms downloaded\n`);
    return data;
}

// ─────────────────────────────────────────────
// CSV builder
// ─────────────────────────────────────────────
function buildCSV(rows) {
    const headers = [
        'Campaign Name',
        'Ad Group Name',
        'Keyword',
        'Match Type',
        'Search Term',
        'Impressions',
        'Clicks',
        'CTR %',
        'Spend ($)',
        'CPC ($)',
        'Orders',
        'Sales ($)',
        'ACOS %',
        'ROAS'
    ];

    const escape = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

    const dataLines = rows.map(r => {
        const impressions = parseInt(r.impressions || 0);
        const clicks = parseInt(r.clicks || 0);
        const spend = parseFloat(r.cost || 0);
        const orders = parseInt(r.purchases14d || 0);
        const sales = parseFloat(r.sales14d || 0);

        const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
        const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : '0.00';
        const acos = sales > 0 ? ((spend / sales) * 100).toFixed(2) : '—';
        const roas = spend > 0 ? (sales / spend).toFixed(2) : '—';

        return [
            r.campaignName || '',
            r.adGroupName || '',
            r.keywordText || r.keyword || '',
            r.matchType || '',
            r.searchTerm || '',
            impressions,
            clicks,
            ctr,
            spend.toFixed(2),
            cpc,
            orders,
            sales.toFixed(2),
            acos,
            roas
        ].map(escape).join(',');
    });

    return [headers.map(escape).join(','), ...dataLines].join('\n');
}

// ─────────────────────────────────────────────
// Summary printer
// ─────────────────────────────────────────────
function printSummary(rows) {
    const totalSpend = rows.reduce((s, r) => s + parseFloat(r.cost || 0), 0);
    const totalSales = rows.reduce((s, r) => s + parseFloat(r.sales14d || 0), 0);
    const totalClicks = rows.reduce((s, r) => s + parseInt(r.clicks || 0), 0);
    const totalOrders = rows.reduce((s, r) => s + parseInt(r.purchases14d || 0), 0);
    const overallACOS = totalSales > 0 ? ((totalSpend / totalSales) * 100).toFixed(1) : '—';

    // Top 5 search terms by spend
    const bySpend = [...rows].sort((a, b) => parseFloat(b.cost || 0) - parseFloat(a.cost || 0));

    console.log('────────────────────────────────────────────');
    console.log('  60-DAY SUMMARY');
    console.log('────────────────────────────────────────────');
    console.log(`  Search Terms: ${rows.length.toLocaleString()}`);
    console.log(`  Total Spend:  $${totalSpend.toFixed(2)}`);
    console.log(`  Total Sales:  $${totalSales.toFixed(2)}`);
    console.log(`  Total Clicks: ${totalClicks.toLocaleString()}`);
    console.log(`  Total Orders: ${totalOrders}`);
    console.log(`  Overall ACOS: ${overallACOS}%`);
    console.log('');
    console.log('  Top 5 by Spend:');

    bySpend.slice(0, 5).forEach((r, i) => {
        const spend = parseFloat(r.cost || 0).toFixed(2);
        const sales = parseFloat(r.sales14d || 0).toFixed(2);
        console.log(`  ${i + 1}. "${r.searchTerm}" — $${spend} spend / $${sales} sales`);
    });
    console.log('────────────────────────────────────────────\n');
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function run() {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║  SEARCH TERM REPORT DOWNLOADER (60 Days)      ║');
    console.log('║  Amazon Ads API v3 - Sponsored Products       ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    const token = await getAccessToken();
    const reportId = await requestReport(token);
    const downloadUrl = await pollReport(token, reportId);

    if (!downloadUrl) {
        throw new Error(
            'No download URL returned. Re-check report status manually:\n' +
            `  node check-report.js  (edit reportId to: ${reportId})`
        );
    }

    const rows = await downloadAndDecompress(downloadUrl);

    printSummary(rows);

    // Save CSV
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const outPath = path.join(__dirname, `search-term-report-60days-${today}.csv`);
    fs.writeFileSync(outPath, buildCSV(rows), 'utf-8');

    console.log(`✅ Saved → ${path.basename(outPath)}`);
    console.log('\n💡 Next steps:');
    console.log('   - Sort by Spend to find high-cost bleeders');
    console.log('   - Filter ACOS > 100% for negative keyword candidates');
    console.log('   - Filter Sales > 0 to find converting search terms');
    console.log('   - Run: node analyze-sqp-csv.js <csv-file> for deep analysis\n');
}

run().catch(err => {
    console.error('\n❌ Error:', err.message);

    if (err.response?.data) {
        console.error('   API response:', JSON.stringify(err.response.data, null, 2));
    }

    console.error('\n💡 Troubleshooting:');
    console.error('   - Verify AMAZON_REFRESH_TOKEN, AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_PROFILE_ID in .env');
    console.error('   - Run: node test-api-access.js  to verify connection');
    console.error('   - Confirm Sponsored Products campaigns exist in your account');

    process.exit(1);
});
