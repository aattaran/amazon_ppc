/**
 * Amazon PPC - Fetch Performance Metrics
 * Phase 2A: Get keyword performance data from Amazon Ads Reporting API
 * 
 * This script:
 * 1. Requests a keyword performance report
 * 2. Polls until report is ready
 * 3. Downloads and parses metrics
 * 4. Calculates ACOS, CVR, VPC
 * 5. Updates Google Sheets with metrics
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { google } = require('googleapis');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
    // Amazon Ads API
    amazon: {
        clientId: process.env.AMAZON_CLIENT_ID,
        clientSecret: process.env.AMAZON_CLIENT_SECRET,
        refreshToken: process.env.AMAZON_REFRESH_TOKEN,
        profileId: process.env.AMAZON_PROFILE_ID
    },

    // Google Sheets
    google: {
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        spreadsheetId: process.env.GOOGLE_SHEETS_ID
    },

    // Report configuration
    report: {
        lookbackDays: 30,  // Get last 30 days of data
        pollIntervalMs: 30000,  // Check status every 30 seconds
        maxPollAttempts: 20  // Max 10 minutes wait time
    }
};

// ============================================================================
// AMAZON REPORTING CLIENT
// ============================================================================

class AmazonReportingClient {
    constructor(config) {
        this.config = config.amazon;
        this.reportConfig = config.report;
        this.accessToken = null;
    }

    /**
     * Authenticate with Amazon Ads API
     */
    async authenticate() {
        const response = await fetch('https://api.amazon.com/auth/o2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                refresh_token: this.config.refreshToken
            })
        });

        const data = await response.json();
        this.accessToken = data.access_token;
    }

    /**
     * Request a keyword performance report using API v3
     * Returns reportId to poll for status
     */
    async requestReport() {
        // Calculate date range
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1);  // Yesterday
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - this.reportConfig.lookbackDays);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log(`   Report date range: ${startDateStr} to ${endDateStr}`);

        const requestBody = {
            name: `Keyword Performance Report ${new Date().toISOString()}`,
            startDate: startDateStr,
            endDate: endDateStr,
            configuration: {
                adProduct: "SPONSORED_PRODUCTS",
                groupBy: ["targeting"],
                columns: [
                    "keywordId",
                    "keyword",
                    "matchType",
                    "impressions",
                    "clicks",
                    "cost",
                    "purchases14d",
                    "sales14d",
                    "adKeywordStatus"
                ],
                reportTypeId: "spTargeting",
                timeUnit: "SUMMARY",
                format: "GZIP_JSON"
            }
        };

        console.log('   Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(
            'https://advertising-api.amazon.com/reporting/reports',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Amazon-Advertising-API-ClientId': this.config.clientId,
                    'Amazon-Advertising-API-Scope': this.config.profileId,
                    'Content-Type': 'application/vnd.createasyncreportrequest.v3+json'
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('\n❌ API Error Details:');
            console.error('   Status:', response.status, response.statusText);
            console.error('   Response Body:', errorText);
            throw new Error(`Report request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('   ✅ Report requested, ID:', data.reportId);
        return data.reportId;
    }

    /**
     * Poll report status until ready (v3 API)
     * Returns download URL when complete
     */
    async pollReportStatus(reportId) {
        let attempts = 0;

        while (attempts < this.reportConfig.maxPollAttempts) {
            const response = await fetch(
                `https://advertising-api.amazon.com/reporting/reports/${reportId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Amazon-Advertising-API-ClientId': this.config.clientId,
                        'Amazon-Advertising-API-Scope': this.config.profileId
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Status check failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'COMPLETED') {
                console.log(`   ✅ Report ready after ${attempts + 1} checks`);
                return data.url;  // v3 uses 'url' instead of 'location'
            }

            if (data.status === 'FAILED') {
                throw new Error(`Report generation failed: ${data.failureReason || 'Unknown error'}`);
            }

            // Still processing
            attempts++;
            console.log(`   ⏳ Checking status... (attempt ${attempts}/${this.reportConfig.maxPollAttempts}) - Status: ${data.status}`);
            await new Promise(resolve => setTimeout(resolve, this.reportConfig.pollIntervalMs));
        }

        throw new Error('Report generation timed out after 10 minutes');
    }

    /**
     * Download and parse report data
     * Returns array of keyword metrics
     */
    async downloadReport(reportUrl) {
        const zlib = require('zlib');
        const util = require('util');
        const gunzip = util.promisify(zlib.gunzip);

        const response = await fetch(reportUrl);  // No auth needed for S3 URL

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        // v3 reports are gzipped JSON
        const buffer = Buffer.from(await response.arrayBuffer());
        const decompressed = await gunzip(buffer);
        const jsonText = decompressed.toString('utf-8');

        // Parse JSON array (v3 format)
        let metrics;
        try {
            metrics = JSON.parse(jsonText);
        } catch (e) {
            console.error('Failed to parse JSON:', e.message);
            console.error('First 500 chars:', jsonText.substring(0, 500));
            throw e;
        }

        return metrics;
    }
}

// ============================================================================
// METRICS PROCESSOR
// ============================================================================

class MetricsProcessor {
    /**
     * Calculate derived metrics (ACOS, CVR, VPC) from v3 API data
     */
    static processMetrics(rawMetrics) {
        return rawMetrics.map(m => {
            const clicks = parseFloat(m.clicks) || 0;
            const impressions = parseFloat(m.impressions) || 0;
            const cost = parseFloat(m.cost) || 0;
            const sales = parseFloat(m.sales14d) || 0;  // v3 field name
            const conversions = parseFloat(m.purchases14d) || 0;  // v3 field name

            // Calculate derived metrics
            const acos = sales > 0 ? ((cost / sales) * 100).toFixed(2) : '0.00';
            const cvr = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00';
            const vpc = clicks > 0 ? (sales / clicks).toFixed(2) : '0.00';

            return {
                keywordId: String(m.keywordId),
                clicks: clicks,
                impressions: impressions,
                spend: cost.toFixed(2),
                sales: sales.toFixed(2),
                orders: conversions,
                acos: acos + '%',
                cvr: cvr + '%',
                vpc: '$' + vpc
            };
        });
    }

    /**
     * Create  lookup map by keywordId
     */
    static createLookupMap(metrics) {
        const map = new Map();
        metrics.forEach(m => map.set(m.keywordId, m));
        return map;
    }
}

// ============================================================================
// GOOGLE SHEETS SYNC
// ============================================================================

class GoogleSheetsClient {
    constructor(config) {
        this.config = config.google;
        this.sheets = null;
    }

    /**
     * Authenticate with Google Sheets API
     */
    async authenticate() {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: this.config.serviceAccountEmail,
                private_key: this.config.privateKey
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        this.sheets = google.sheets({ version: 'v4', auth });
    }

    /**
     * Update metrics in Google Sheets
     * Reads existing keywords and updates metrics columns (J-Q)
     */
    async updateMetrics(metricsMap) {
        console.log('📝 Updating Google Sheets...');

        // 1. Read current keywords
        const range = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.config.spreadsheetId,
            range: '3. Keywords!A11:U10000'
        });

        const rows = range.data.values || [];
        console.log(`   📊 Found ${rows.length} keywords in sheet`);

        // 2. Update metrics for each row
        let updated = 0;
        let noMetrics = 0;

        const updatedRows = rows.map(row => {
            const keywordId = row[1]; // Column B
            const metrics = metricsMap.get(String(keywordId));

            if (metrics) {
                // Update columns J-Q with metrics
                row[9] = metrics.clicks;           // J: Clicks
                row[10] = metrics.impressions;     // K: Impressions
                row[11] = metrics.spend;           // L: Spend
                row[12] = metrics.sales;           // M: Sales
                row[13] = metrics.orders;          // N: Orders
                row[14] = metrics.acos;            // O: ACOS
                row[15] = metrics.cvr;             // P: CVR
                row[16] = metrics.vpc;             // Q: VPC
                updated++;
            } else {
                // No metrics for this keyword (likely no impressions)
                row[9] = 0;
                row[10] = 0;
                row[11] = '$0.00';
                row[12] = '$0.00';
                row[13] = 0;
                row[14] = '0.00%';
                row[15] = '0.00%';
                row[16] = '$0.00';
                noMetrics++;
            }

            return row;
        });

        // 3. Write back to sheet
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.config.spreadsheetId,
            range: '3. Keywords!A11',
            valueInputOption: 'USER_ENTERED',  // Parse formulas and formats
            resource: { values: updatedRows }
        });

        console.log(`   ✅ Updated ${updated} keywords with metrics`);
        console.log(`   ℹ️  ${noMetrics} keywords had no metrics (no impressions)`);
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('🚀 Fetching performance metrics from Amazon Ads...\n');

    const startTime = Date.now();

    try {
        // Step 1: Authenticate with Amazon
        console.log('🔐 Authenticating with Amazon Ads API...');
        const reportingClient = new AmazonReportingClient(config);
        await reportingClient.authenticate();
        console.log('   ✅ Authenticated successfully\n');

        // Step 2: Request report
        console.log('📊 Requesting keyword performance report...');
        const reportId = await reportingClient.requestReport();
        console.log(`   Report ID: ${reportId}\n`);

        // Step 3: Poll for completion
        console.log('⏳ Waiting for report generation...');
        const reportUrl = await reportingClient.pollReportStatus(reportId);
        console.log(' ');

        // Step 4: Download report
        console.log('📥 Downloading report...');
        const rawMetrics = await reportingClient.downloadReport(reportUrl);
        console.log(`   ✅ Downloaded ${rawMetrics.length} keyword metrics\n`);

        // Step 5: Process metrics
        console.log('🧮 Calculating derived metrics (ACOS, CVR, VPC)...');
        const processedMetrics = MetricsProcessor.processMetrics(rawMetrics);
        const metricsMap = MetricsProcessor.createLookupMap(processedMetrics);
        console.log(`   ✅ Processed ${processedMetrics.length} keywords\n`);

        // Step 6: Update Google Sheets
        console.log('📊 Initializing Google Sheets API...');
        const sheetsClient = new GoogleSheetsClient(config);
        await sheetsClient.authenticate();
        console.log('   ✅ Google Sheets API ready\n');

        await sheetsClient.updateMetrics(metricsMap);

        // Done!
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('\n🎉 Complete! Metrics synced successfully.\n');
        console.log('📊 Summary:');
        console.log(`   Keywords with metrics: ${processedMetrics.length}`);
        console.log(`   Execution time: ${duration}s\n`);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.stack) {
            console.error('\n📚 Stack Trace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run
main();
