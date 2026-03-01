/**
 * COMPETITOR BRAND NAME DOWNLOADER
 * Amazon SP-API Brand Analytics - Search Query Performance
 *
 * Downloads the top 3 competitor brands (by click share) for every
 * search term in your category over the last 60 days (two monthly reports).
 *
 * Output: competitor-brands-YYYYMMDD.csv
 *
 * Credentials required in .env:
 *   SP_API_REFRESH_TOKEN
 *   SP_API_CLIENT_ID
 *   SP_API_CLIENT_SECRET
 *
 * Usage: node download-competitor-brands.js
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const SP_API = {
    refreshToken: process.env.SP_API_REFRESH_TOKEN,
    clientId: process.env.SP_API_CLIENT_ID,
    clientSecret: process.env.SP_API_CLIENT_SECRET,
    marketplaceId: 'ATVPDKIKX0DER',
    endpoint: 'https://sellingpartnerapi-na.amazon.com'
};

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
async function getAccessToken() {
    console.log('🔑 Authenticating with SP-API...');

    if (!SP_API.refreshToken || !SP_API.clientId || !SP_API.clientSecret) {
        throw new Error(
            'Missing SP-API credentials.\n' +
            'Set SP_API_REFRESH_TOKEN, SP_API_CLIENT_ID, SP_API_CLIENT_SECRET in .env'
        );
    }

    const response = await axios.post(
        'https://api.amazon.com/auth/o2/token',
        new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: SP_API.refreshToken,
            client_id: SP_API.clientId,
            client_secret: SP_API.clientSecret
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (response.data.error) {
        throw new Error(`Auth failed: ${response.data.error_description || response.data.error}`);
    }

    console.log('   ✅ Authenticated\n');
    return response.data.access_token;
}

// ─────────────────────────────────────────────
// Report helpers
// ─────────────────────────────────────────────

/**
 * Returns the two YYYY-MM periods covering the last 60 days.
 * Brand Analytics only supports monthly granularity.
 */
function getMonthPeriods() {
    const today = new Date();
    const months = [];

    for (let offset = 0; offset <= 1; offset++) {
        const d = new Date(today.getFullYear(), today.getMonth() - offset, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
    }

    // Return oldest first
    return months.reverse();
}

function monthStart(ym) {
    return `${ym}-01T00:00:00Z`;
}

function monthEnd(ym) {
    const [year, month] = ym.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${ym}-${String(lastDay).padStart(2, '0')}T23:59:59Z`;
}

async function requestReport(token, yearMonth) {
    console.log(`   📤 Requesting report for ${yearMonth}...`);

    const response = await axios.post(
        `${SP_API.endpoint}/reports/2021-06-30/reports`,
        {
            reportType: 'GET_BRAND_ANALYTICS_SEARCH_QUERY_PERFORMANCE_REPORT',
            marketplaceIds: [SP_API.marketplaceId],
            reportOptions: { reportPeriod: 'MONTH' },
            dataStartTime: monthStart(yearMonth),
            dataEndTime: monthEnd(yearMonth)
        },
        {
            headers: {
                'x-amz-access-token': token,
                'Content-Type': 'application/json'
            }
        }
    );

    const reportId = response.data.reportId;
    if (!reportId) throw new Error(`No reportId returned for ${yearMonth}`);
    console.log(`      Report ID: ${reportId}`);
    return reportId;
}

async function pollReport(token, reportId, yearMonth) {
    console.log(`   ⏳ Waiting for ${yearMonth} report...`);

    for (let i = 0; i < 60; i++) {
        const resp = await axios.get(
            `${SP_API.endpoint}/reports/2021-06-30/reports/${reportId}`,
            { headers: { 'x-amz-access-token': token } }
        );

        const { processingStatus, reportDocumentId } = resp.data;

        if (processingStatus === 'DONE') {
            console.log('      ✅ Ready');
            return reportDocumentId;
        }

        if (processingStatus === 'CANCELLED' || processingStatus === 'FATAL') {
            throw new Error(`Report ${reportId} ${processingStatus.toLowerCase()}`);
        }

        if (i > 0 && i % 10 === 0) {
            console.log(`      Still processing... (${i * 3}s)`);
        }

        await new Promise(r => setTimeout(r, 3000));
    }

    throw new Error(`Timeout waiting for report ${reportId}`);
}

async function downloadReport(token, reportDocumentId) {
    // Get pre-signed download URL
    const meta = await axios.get(
        `${SP_API.endpoint}/reports/2021-06-30/documents/${reportDocumentId}`,
        { headers: { 'x-amz-access-token': token } }
    );

    const { url } = meta.data;
    const resp = await axios.get(url, { responseType: 'text' });

    console.log('      ✅ Downloaded');
    return resp.data;
}

// ─────────────────────────────────────────────
// TSV parsing
// ─────────────────────────────────────────────
function parseTSV(raw) {
    const lines = raw.trim().split('\n');
    const headers = lines[0].split('\t').map(h => h.trim());

    return lines.slice(1)
        .filter(l => l.trim())
        .map(line => {
            const values = line.split('\t');
            const row = {};
            headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
            return row;
        });
}

// ─────────────────────────────────────────────
// CSV output builder
// ─────────────────────────────────────────────
function buildCSV(rows) {
    const headers = [
        'Period',
        'Search Term',
        'Search Frequency Rank',
        '#1 Brand Name',
        '#1 ASIN',
        '#1 Click Share',
        '#1 Conv Share',
        '#2 Brand Name',
        '#2 ASIN',
        '#2 Click Share',
        '#2 Conv Share',
        '#3 Brand Name',
        '#3 ASIN',
        '#3 Click Share',
        '#3 Conv Share'
    ];

    const escape = v => `"${String(v || '').replace(/"/g, '""')}"`;

    const dataLines = rows.map(r => [
        r.period,
        r['Search Term'] || r['searchTerm'] || '',
        r['Search Frequency Rank'] || r['searchFrequencyRank'] || '',
        r['#1 Clicked ASIN Brand Name'] || r['clickedAsin1BrandName'] || '',
        r['#1 Clicked ASIN'] || r['clickedAsin1'] || '',
        r['#1 Clicked ASIN Click Share'] || r['clickedAsin1ClickShare'] || '',
        r['#1 Clicked ASIN Conversion Share'] || r['clickedAsin1ConversionShare'] || '',
        r['#2 Clicked ASIN Brand Name'] || r['clickedAsin2BrandName'] || '',
        r['#2 Clicked ASIN'] || r['clickedAsin2'] || '',
        r['#2 Clicked ASIN Click Share'] || r['clickedAsin2ClickShare'] || '',
        r['#2 Clicked ASIN Conversion Share'] || r['clickedAsin2ConversionShare'] || '',
        r['#3 Clicked ASIN Brand Name'] || r['clickedAsin3BrandName'] || '',
        r['#3 Clicked ASIN'] || r['clickedAsin3'] || '',
        r['#3 Clicked ASIN Click Share'] || r['clickedAsin3ClickShare'] || '',
        r['#3 Clicked ASIN Conversion Share'] || r['clickedAsin3ConversionShare'] || ''
    ].map(escape).join(','));

    return [headers.map(escape).join(','), ...dataLines].join('\n');
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function run() {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║  COMPETITOR BRAND NAME DOWNLOADER             ║');
    console.log('║  Brand Analytics Search Query Performance     ║');
    console.log('╚═══════════════════════════════════════════════╝\n');

    const token = await getAccessToken();
    const periods = getMonthPeriods();

    console.log(`📅 Periods to fetch: ${periods.join(', ')} (last 60 days)\n`);

    const allRows = [];

    for (const period of periods) {
        console.log(`\n📊 Processing ${period}...`);

        try {
            const reportId = await requestReport(token, period);
            const docId = await pollReport(token, reportId, period);
            const raw = await downloadReport(token, docId);
            const rows = parseTSV(raw);

            // Tag each row with the period
            rows.forEach(r => { r.period = period; });
            allRows.push(...rows);

            console.log(`   ✅ ${rows.length} search terms`);

        } catch (err) {
            console.warn(`   ⚠️  Skipping ${period}: ${err.message}`);
        }
    }

    if (allRows.length === 0) {
        console.error('\n❌ No data returned. Check credentials and Brand Registry enrollment.');
        process.exit(1);
    }

    // Save CSV
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const outPath = path.join(__dirname, `competitor-brands-${today}.csv`);
    fs.writeFileSync(outPath, buildCSV(allRows), 'utf-8');

    console.log(`\n✅ Saved ${allRows.length} rows → ${path.basename(outPath)}`);
    console.log('\n💡 Columns: Search Term | Rank | #1-3 Brand Name | ASIN | Click Share | Conv Share');
    console.log('   Use this to identify top competitors per keyword and their market dominance.\n');
}

run().catch(err => {
    console.error('\n❌ Error:', err.message);

    if (err.response?.data) {
        console.error('   API response:', JSON.stringify(err.response.data, null, 2));
    }

    console.error('\n💡 Troubleshooting:');
    console.error('   - Add SP_API_REFRESH_TOKEN, SP_API_CLIENT_ID, SP_API_CLIENT_SECRET to .env');
    console.error('   - Confirm your brand is enrolled in Amazon Brand Registry');
    console.error('   - Confirm Brand Analytics is enabled in Seller Central');

    process.exit(1);
});
