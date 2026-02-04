/**
 * Fetch PPC Campaign Performance Metrics
 * 
 * Fetches real performance data from Amazon Ads API
 * This script supplements fetch-ppc-campaigns.js by getting actual metrics
 * 
 * Usage: node fetch-ppc-metrics.js
 */

require('dotenv').config();
const axios = require('axios');
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

const AMAZON_ADS_CONFIG = {
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    profileId: process.env.AMAZON_PROFILE_ID
};

class PPCMetricsFetcher {
    constructor() {
        this.sheets = new UnifiedSheetsService();
        this.accessToken = null;
    }

    /**
     * Get access token
     */
    async getAccessToken() {
        console.log('🔑 Authenticating with Amazon Ads API...\n');

        try {
            const response = await axios.post(
                'https://api.amazon.com/auth/o2/token',
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: AMAZON_ADS_CONFIG.refreshToken,
                    client_id: AMAZON_ADS_CONFIG.clientId,
                    client_secret: AMAZON_ADS_CONFIG.clientSecret
                }),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            );

            if (response.data.error) {
                throw new Error(`Auth failed: ${response.data.error_description || response.data.error}`);
            }

            this.accessToken = response.data.access_token;
            console.log('✅ Authentication successful\n');
            return this.accessToken;

        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            throw error;
        }
    }

    /**
     * Read existing campaign data from Google Sheets
     */
    async readCampaigns() {
        console.log('📖 Reading campaigns from Google Sheets...\n');

        const data = await this.sheets.readSheet('PPC Campaigns');

        if (!data || data.length <= 10) {
            throw new Error('No campaign data found');
        }

        // Headers in row 10 (index 9), data starts row 11 (index 10)
        const campaigns = data.slice(10).map(row => ({
            campaignName: row[0],
            campaignId: row[13] || null  // Assuming Campaign ID is in column N
        })).filter(c => c.campaignName);

        console.log(`✅ Found ${campaigns.length} campaigns\n`);
        return campaigns;
    }

    /**
     * Request performance report from Amazon Ads API
     */
    async requestReport(days = 30) {
        console.log(`📊 Requesting performance metrics report (last ${days} days)...\n`);

        const formatDate = (date) => {
            return date.toISOString().split('T')[0].replace(/-/g, '');
        };

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        try {
            const response = await axios.post(
                'https://advertising-api.amazon.com/v2/sp/campaigns/report',
                {
                    reportDate: formatDate(startDate),
                    metrics: 'campaignId,impressions,clicks,cost,attributedSales14d,attributedConversions14d'
                },
                {
                    headers: {
                        'Amazon-Advertising-API-ClientId': AMAZON_ADS_CONFIG.clientId,
                        'Amazon-Advertising-API-Scope': AMAZON_ADS_CONFIG.profileId,
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.reportId) {
                console.log(`   ✅ Report requested (ID: ${response.data.reportId})\n`);
                return response.data.reportId;
            } else {
                throw new Error('No reportId returned');
            }

        } catch (error) {
            if (error.response?.data) {
                console.error('❌ API Error:', JSON.stringify(error.response.data, null, 2));
            }
            throw new Error(`Report request failed: ${error.message}`);
        }
    }

    /**
     * Poll for report completion
     */
    async pollReport(reportId) {
        console.log('   Polling for report completion...');

        const maxAttempts = 30;

        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await axios.get(
                    `https://advertising-api.amazon.com/v2/reports/${reportId}`,
                    {
                        headers: {
                            'Amazon-Advertising-API-ClientId': AMAZON_ADS_CONFIG.clientId,
                            'Amazon-Advertising-API-Scope': AMAZON_ADS_CONFIG.profileId,
                            'Authorization': `Bearer ${this.accessToken}`
                        }
                    }
                );

                const { status, location } = response.data;

                if (status === 'SUCCESS') {
                    console.log('   ✅ Report ready!\n');
                    return location;
                }

                if (status === 'FAILURE') {
                    throw new Error('Report generation failed');
                }

                // Still processing
                if (i < maxAttempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                console.warn(`   Poll attempt ${i + 1} failed:`, error.message);
            }
        }

        throw new Error('Report timeout');
    }

    /**
     * Download and parse report
     */
    async downloadReport(location) {
        console.log('📥 Downloading report data...\n');

        const response = await axios.get(location, {
            headers: {
                'Amazon-Advertising-API-ClientId': AMAZON_ADS_CONFIG.clientId,
                'Amazon-Advertising-API-Scope': AMAZON_ADS_CONFIG.profileId,
                'Authorization': `Bearer ${this.accessToken}`
            }
        });

        // Parse JSON-lines format
        const metrics = response.data
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            })
            .filter(Boolean);

        console.log(`✅ Downloaded metrics for ${metrics.length} campaigns\n`);
        return metrics;
    }

    /**
     * Update Google Sheets with metrics
     */
    async updateSheets(metrics) {
        console.log('💾 Updating Google Sheets with performance metrics...\n');

        // Read current sheet data
        const allData = await this.sheets.readSheet('PPC Campaigns');
        const campaigns = allData.slice(10); // Skip to row 11

        // Create metrics lookup by campaign name (since we might not have IDs)
        const metricsMap = {};
        metrics.forEach(m => {
            metricsMap[m.campaignId] = m;
        });

        // Update rows with metrics
        let updatedCount = 0;
        const updates = campaigns.map(row => {
            const campaignId = row[13]; // Column N: Campaign ID
            const metric = metricsMap[campaignId] || {};

            const spend = parseFloat(metric.cost || 0);
            const sales = parseFloat(metric.attributedSales14d || 0);
            const impressions = parseInt(metric.impressions || 0);
            const clicks = parseInt(metric.clicks || 0);
            const orders = parseInt(metric.attributedConversions14d || 0);

            const ctr = impressions > 0 ? (clicks / impressions * 100) : 0;
            const cpc = clicks > 0 ? (spend / clicks) : 0;
            const acos = sales > 0 ? (spend / sales * 100) : 0;
            const roas = spend > 0 ? (sales / spend) : 0;
            const cvr = clicks > 0 ? (orders / clicks * 100) : 0;

            if (clicks > 0) updatedCount++;

            return [
                spend.toFixed(2),      // Column E
                sales.toFixed(2),      // Column F
                impressions,           // Column G
                clicks,                // Column H
                orders,                // Column I
                ctr.toFixed(2),        // Column J
                cpc.toFixed(2),        // Column K
                acos.toFixed(2),       // Column L
                roas.toFixed(2)        // Column M
            ];
        });

        // Write metrics to columns E-M starting at row 11
        await this.sheets.writeRows('PPC Campaigns', updates, 'E11');

        console.log(`✅ Updated ${updatedCount} campaigns with real performance data\n`);
    }

    /**
     * Main execution
     */
    async run() {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║  📊 PPC METRICS FETCHER                    ║');
        console.log('║  Amazon Ads Performance Data               ║');
        console.log('╚════════════════════════════════════════════╝\n');

        try {
            // 1. Authenticate
            await this.getAccessToken();

            // 2. Request report
            const reportId = await this.requestReport(30);

            // 3. Poll until ready
            const location = await this.pollReport(reportId);

            // 4. Download metrics
            const metrics = await this.downloadReport(location);

            // 5. Update Google Sheets
            await this.updateSheets(metrics);

            console.log('✅ Done!\n');
            console.log('📝 Next steps:');
            console.log('   1. Review updated metrics in Google Sheets');
            console.log('   2. Run: node optimize-bids.js');
            console.log('   3. Review bid recommendations in columns R, S, T\n');

            console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

        } catch (error) {
            console.error('\n❌ Error:', error.message);
            console.error('\n💡 Troubleshooting:');
            console.error('   - Verify Amazon Ads API credentials in .env');
            console.error('   - Check that Campaign IDs are in column N of Google Sheets');
            console.error('   - Ensure you have API access permissions\n');
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const fetcher = new PPCMetricsFetcher();
    fetcher.run().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = PPCMetricsFetcher;
