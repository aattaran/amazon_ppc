/**
 * Fetch PPC Placement Performance Data
 * 
 * Chris Rawlings Framework: Placement optimization is the #1 optimization lever
 * Fetches Top of Search, Product Pages, and Rest of Search performance
 * 
 * Usage: node fetch-ppc-placements.js
 */

require('dotenv').config();
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

const AMAZON_ADS_CONFIG = {
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    profileId: process.env.AMAZON_PROFILE_ID
};

class PPCPlacementAnalyzer {
    constructor() {
        this.sheets = new UnifiedSheetsService();
        this.accessToken = null;
    }

    /**
     * Get access token from refresh token
     */
    async getAccessToken() {
        const response = await fetch('https://api.amazon.com/auth/o2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: AMAZON_ADS_CONFIG.refreshToken,
                client_id: AMAZON_ADS_CONFIG.clientId,
                client_secret: AMAZON_ADS_CONFIG.clientSecret
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`Authentication failed: ${data.error_description || data.error}`);
        }

        this.accessToken = data.access_token;
        return this.accessToken;
    }

    /**
     * Fetch campaigns list (to get campaign IDs)
     */
    async fetchCampaigns() {
        let allCampaigns = [];
        let nextToken = null;

        do {
            const payload = {
                maxResults: 100,
                stateFilter: {
                    include: ['ENABLED', 'PAUSED'] // Only active campaigns need placement analysis
                }
            };

            if (nextToken) {
                payload.nextToken = nextToken;
            }

            const response = await fetch(
                'https://advertising-api.amazon.com/sp/campaigns/list',
                {
                    method: 'POST',
                    headers: {
                        'Amazon-Advertising-API-ClientId': AMAZON_ADS_CONFIG.clientId,
                        'Amazon-Advertising-API-Scope': AMAZON_ADS_CONFIG.profileId,
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/vnd.spcampaign.v3+json',
                        'Accept': 'application/vnd.spcampaign.v3+json'
                    },
                    body: JSON.stringify(payload)
                }
            );

            const result = await response.json();

            if (result.code) {
                throw new Error(`API Error: ${result.details || result.code}`);
            }

            const campaigns = result.campaigns || [];
            allCampaigns = allCampaigns.concat(campaigns);
            nextToken = result.nextToken || null;

        } while (nextToken);

        return allCampaigns;
    }

    /**
     * Request placement performance report
     * Amazon Ads API uses asynchronous reporting - request first, poll for completion
     */
    async requestPlacementReport(campaignIds, days = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Format dates as YYYYMMDD
        const formatDate = (date) => {
            return date.toISOString().split('T')[0].replace(/-/g, '');
        };

        const reportBody = {
            reportDate: formatDate(startDate),
            metrics: 'campaignName,campaignId,impressions,clicks,cost,attributedSales14d,attributedConversions14d'
        };

        console.log('   Requesting placement report from Amazon Ads API...');

        const response = await fetch(
            'https://advertising-api.amazon.com/v2/sp/campaigns/report',
            {
                method: 'POST',
                headers: {
                    'Amazon-Advertising-API-ClientId': AMAZON_ADS_CONFIG.clientId,
                    'Amazon-Advertising-API-Scope': AMAZON_ADS_CONFIG.profileId,
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reportBody)
            }
        );

        const result = await response.json();

        if (result.code && result.code !== 'SUCCESS') {
            // Try alternative approach: Fetch metrics directly via v3 API
            console.log('   Report API unavailable, fetching metrics directly...\n');
            return await this.fetchMetricsDirectly(campaignIds, days);
        }

        // Amazon returns a reportId that we need to poll
        return result.reportId;
    }

    /**
     * Alternative: Fetch metrics directly (no async report)
     * This won't have placement segmentation but will give us campaign performance
     */
    async fetchMetricsDirectly(campaignIds, days) {
        console.log('   Using direct metrics fetch (placement data may be limited)...\n');

        // For now, return null to indicate we should use alternative method
        // In production, this would fetch from /v3/reporting or direct campaign metrics
        return null;
    }

    /**
     * Poll for report completion and download
     */
    async downloadReport(reportId) {
        console.log('   Waiting for report to be generated...');

        let attempts = 0;
        const maxAttempts = 30; // 30 attempts × 2 seconds = 1 minute max

        while (attempts < maxAttempts) {
            const response = await fetch(
                `https://advertising-api.amazon.com/v2/reports/${reportId}`,
                {
                    headers: {
                        'Amazon-Advertising-API-ClientId': AMAZON_ADS_CONFIG.clientId,
                        'Amazon-Advertising-API-Scope': AMAZON_ADS_CONFIG.profileId,
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            const status = await response.json();

            if (status.status === 'SUCCESS') {
                console.log('   ✅ Report ready! Downloading...\n');

                // Download the actual report
                const reportResponse = await fetch(status.location, {
                    headers: {
                        'Amazon-Advertising-API-ClientId': AMAZON_ADS_CONFIG.clientId,
                        'Amazon-Advertising-API-Scope': AMAZON_ADS_CONFIG.profileId,
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });

                const reportData = await reportResponse.json();
                return reportData;
            }

            if (status.status === 'FAILURE') {
                throw new Error('Report generation failed');
            }

            // Still processing, wait and retry
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            attempts++;
        }

        throw new Error('Report generation timeout');
    }

    /**
     * Parse and analyze placement data
     */
    analyzePlacementData(reportData, campaigns) {
        const placementMap = {};

        // Group by campaign and placement
        reportData.forEach(row => {
            const campaignId = row.campaignId;
            const placement = row.placement || 'UNKNOWN'; // Top of Search, Product Pages, Rest of Search

            if (!placementMap[campaignId]) {
                placementMap[campaignId] = {
                    campaignId,
                    campaignName: row.campaignName,
                    budget: row.campaignBudget || 0,
                    placements: {}
                };
            }

            const clicks = parseInt(row.clicks || 0);
            const cost = parseFloat(row.cost || 0);
            const sales = parseFloat(row.attributedSales14d || 0);
            const impressions = parseInt(row.impressions || 0);

            placementMap[campaignId].placements[placement] = {
                impressions,
                clicks,
                cost,
                sales,
                ctr: impressions > 0 ? (clicks / impressions * 100).toFixed(2) : 0,
                cpc: clicks > 0 ? (cost / clicks).toFixed(2) : 0,
                acos: sales > 0 ? (cost / sales * 100).toFixed(2) : 0,
                roas: cost > 0 ? (sales / cost).toFixed(2) : 0
            };
        });

        return Object.values(placementMap);
    }

    /**
     * Apply Chris Rawlings optimization rules
     */
    getPlacementRecommendations(campaign) {
        const placements = campaign.placements;
        const placementNames = Object.keys(placements);

        if (placementNames.length === 0) {
            return {
                action: 'NO_DATA',
                recommendation: 'No placement data available'
            };
        }

        // Sort placements by ACoS (lower is better)
        const sorted = placementNames
            .map(name => ({
                name,
                ...placements[name]
            }))
            .filter(p => p.clicks > 10) // Only consider placements with meaningful data
            .sort((a, b) => parseFloat(a.acos) - parseFloat(b.acos));

        if (sorted.length < 2) {
            return {
                action: 'INSUFFICIENT_DATA',
                recommendation: 'Need more placement data (wait for more clicks)'
            };
        }

        const winner = sorted[0];
        const loser = sorted[sorted.length - 1];

        // Chris Rawlings rule: Increase winner by 15%, decrease loser by 10%
        return {
            action: 'ADJUST_PLACEMENTS',
            winner: {
                placement: winner.name,
                acos: winner.acos,
                recommendation: 'Increase bid adjuster by +15%'
            },
            loser: {
                placement: loser.name,
                acos: loser.acos,
                recommendation: 'Decrease bid adjuster by -10%'
            },
            summary: `Focus budget on ${winner.name} (${winner.acos}% ACoS) vs ${loser.name} (${loser.acos}% ACoS)`
        };
    }

    /**
     * Sync to Google Sheets
     */
    async syncToSheets(placementData) {
        console.log('\n📊 Syncing placement data to Google Sheets...\n');

        if (!placementData || placementData.length === 0) {
            console.warn('⚠️  WARNING: No placement data to sync.');
            return;
        }

        const sheetName = 'PPC Placements';

        await this.sheets.ensureSheet(sheetName);
        await this.sheets.clearRange(sheetName, 'A2:Z');

        const headers = [[
            'Campaign Name',
            'Placement',
            'Impressions',
            'Clicks',
            'CTR %',
            'Spend',
            'Sales',
            'CPC',
            'ACoS %',
            'ROAS',
            'Recommendation'
        ]];

        const rows = [];

        placementData.forEach(campaign => {
            const rec = this.getPlacementRecommendations(campaign);

            Object.entries(campaign.placements).forEach(([placement, data]) => {
                let recommendation = '';

                if (rec.winner && rec.winner.placement === placement) {
                    recommendation = '✅ WINNER: ' + rec.winner.recommendation;
                } else if (rec.loser && rec.loser.placement === placement) {
                    recommendation = '❌ LOSER: ' + rec.loser.recommendation;
                } else {
                    recommendation = 'Monitor';
                }

                rows.push([
                    campaign.campaignName,
                    placement,
                    data.impressions,
                    data.clicks,
                    data.ctr,
                    data.cost.toFixed(2),
                    data.sales.toFixed(2),
                    data.cpc,
                    data.acos,
                    data.roas,
                    recommendation
                ]);
            });
        });

        await this.sheets.writeRows(sheetName, headers, 'A1');
        await this.sheets.writeRows(sheetName, rows, 'A2');

        console.log(`✅ Synced ${rows.length} placement records to sheet "${sheetName}"\n`);
    }

    /**
     * Main execution
     */
    async run() {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║  📊 PPC PLACEMENT ANALYZER                 ║');
        console.log('║  Chris Rawlings Framework - Priority #1    ║');
        console.log('╚════════════════════════════════════════════╝\n');

        try {
            console.log('🔑 Authenticating...\n');
            await this.getAccessToken();
            console.log('✅ Authentication successful\n');

            console.log('📥 Fetching campaigns...\n');
            const campaigns = await this.fetchCampaigns();
            console.log(`✅ Found ${campaigns.length} active campaigns\n`);

            console.log('📊 Requesting placement performance report (last 30 days)...\n');
            const reportId = await this.requestPlacementReport(
                campaigns.map(c => c.campaignId)
            );

            const reportData = await this.downloadReport(reportId);

            console.log('🔍 Analyzing placement performance...\n');
            const placementAnalysis = this.analyzePlacementData(reportData, campaigns);

            console.log('═══════════════════════════════════════════');
            console.log('📊 PLACEMENT ANALYSIS SUMMARY');
            console.log('═══════════════════════════════════════════\n');

            placementAnalysis.slice(0, 5).forEach(campaign => {
                const rec = this.getPlacementRecommendations(campaign);

                console.log(`Campaign: ${campaign.campaignName}`);

                Object.entries(campaign.placements).forEach(([placement, data]) => {
                    const emoji = rec.winner?.placement === placement ? '✅' :
                        rec.loser?.placement === placement ? '❌' : '  ';
                    console.log(`  ${emoji} ${placement}: ${data.acos}% ACoS, ${data.clicks} clicks`);
                });

                if (rec.action === 'ADJUST_PLACEMENTS') {
                    console.log(`  → ${rec.summary}\n`);
                } else {
                    console.log(`  → ${rec.recommendation}\n`);
                }
            });

            if (placementAnalysis.length > 5) {
                console.log(`... and ${placementAnalysis.length - 5} more campaigns\n`);
            }

            await this.syncToSheets(placementAnalysis);

            console.log('✅ Done!\n');
            console.log('📝 Next steps:');
            console.log('   1. Review "PPC Placements" sheet in Google Sheets');
            console.log('   2. Apply recommended bid adjuster changes in Amazon Ad Console');
            console.log('   3. Re-run this script weekly to monitor improvements\n');

            console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

        } catch (error) {
            console.error('\n❌ Error:', error.message);
            console.error(error.stack);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const analyzer = new PPCPlacementAnalyzer();
    analyzer.run().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = PPCPlacementAnalyzer;
