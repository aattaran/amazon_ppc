/**
 * Fetch PPC Campaigns - Using Your Credentials
 * Fetches campaigns from Amazon Ads API and analyzes for bleeders
 */

require('dotenv').config();
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

// Use correct env variable names
const AMAZON_ADS_CONFIG = {
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    profileId: process.env.AMAZON_PROFILE_ID
};

class PPCCampaignFetcher {
    constructor() {
        this.sheets = new UnifiedSheetsService();
        this.accessToken = null;
    }

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
            throw new Error(`Auth failed: ${data.error_description || data.error}`);
        }

        this.accessToken = data.access_token;
        console.log('✅ Got access token\n');
        return this.accessToken;
    }

    /**
     * Fetch ALL campaigns with pagination support
     * Previously: Only fetched first 100 campaigns
     * Now: Loops through all pages using nextToken
     */
    async fetchCampaigns() {
        let allCampaigns = [];
        let nextToken = null;
        let pageCount = 0;

        do {
            pageCount++;
            if (pageCount > 1) {
                console.log(`   Fetching page ${pageCount}...`);
            }

            const payload = {
                maxResults: 100,
                stateFilter: {
                    include: ['ENABLED', 'PAUSED', 'ARCHIVED']
                }
            };

            // Add nextToken for pagination
            if (nextToken) {
                payload.nextToken = nextToken;
            }

            const response = await fetch(
                `https://advertising-api.amazon.com/sp/campaigns/list`,
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

            // v3 API returns {campaigns: [...], nextToken: "..."}
            const campaigns = result.campaigns || [];
            allCampaigns = allCampaigns.concat(campaigns);

            if (pageCount > 1) {
                console.log(`   ✓ Retrieved ${campaigns.length} campaigns (total: ${allCampaigns.length})`);
            }

            // Check for next page
            nextToken = result.nextToken || null;

        } while (nextToken); // Continue until no more pages

        if (pageCount > 1) {
            console.log(`\n✅ Pagination complete: ${allCampaigns.length} campaigns across ${pageCount} pages\n`);
        }

        return allCampaigns;
    }

    analyzeCampaign(campaign) {
        // Note: This uses campaign data only, not performance metrics yet
        return {
            campaignName: campaign.name,
            state: campaign.state,
            targetingType: campaign.targetingType,
            budget: campaign.budget?.budget || campaign.dailyBudget || 0,
            spend: 0, // Will need reporting API
            sales: 0,
            impressions: 0,
            clicks: 0,
            orders: 0,
            ctr: 0,
            cpc: 0,
            acos: 0,
            roas: 0,
            cvr: 0,
            isBleeder: false,
            bleederSeverity: 'NONE',
            recommendation: campaign.state === 'enabled' ? 'Fetch performance data to analyze' : 'Paused - review before enabling'
        };
    }

    async syncToSheets(campaigns) {
        console.log(`\n📊 Syncing ${campaigns.length} campaigns to PPC Campaigns sheet...\n`);

        // Safety check: Prevent accidental data loss if API returns empty
        if (!campaigns || campaigns.length === 0) {
            console.warn('⚠️  WARNING: No campaigns to sync. Skipping to prevent data loss.');
            return;
        }

        const rows = campaigns.map(c => [
            c.campaignName,
            c.state,
            c.targetingType,
            c.budget,
            c.spend,
            c.sales,
            c.impressions,
            c.clicks,
            c.orders,
            c.ctr,
            c.cpc,
            c.acos,
            c.roas,
            c.cvr,
            c.isBleeder ? 'YES' : 'NO',
            c.bleederSeverity,
            c.recommendation
        ]);

        // Clear existing data to prevent duplicates
        console.log('🧹 Clearing old data...');
        await this.sheets.clearSheet('PPC Campaigns');

        // Restore headers
        const headers = [[
            'Campaign Name', 'State', 'Targeting', 'Budget',
            'Spend', 'Sales', 'Impressions', 'Clicks', 'Orders',
            'CTR', 'CPC', 'ACOS', 'ROAS', 'CVR',
            'Is Bleeder', 'Severity', 'Recommendation'
        ]];
        await this.sheets.writeRows('PPC Campaigns', headers, 'A1');

        // Write fresh campaign data
        await this.sheets.writeRows('PPC Campaigns', rows, 'A2');

        // Warn about placeholder metrics
        console.warn('⚠️  Warning: Performance metrics (Spend, Sales, ACOS) are placeholders. Reporting API integration required.\n');

        console.log(`✅ Synced ${campaigns.length} campaigns (replaced, not appended)\n`);
    }

    async run() {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║  📊 PPC CAMPAIGN FETCHER                   ║');
        console.log('╚════════════════════════════════════════════╝\n');

        console.log('🔑 Using credentials from .env:\n');
        console.log(`   Client ID: ${AMAZON_ADS_CONFIG.clientId.substring(0, 20)}...`);
        console.log(`   Profile ID: ${AMAZON_ADS_CONFIG.profileId}\n`);

        try {
            console.log('🔐 Getting access token...\n');
            await this.getAccessToken();

            console.log('📥 Fetching campaigns...\n');
            const campaigns = await this.fetchCampaigns();
            console.log(`✅ Found ${campaigns.length} campaigns\n`);

            const analyzed = campaigns.map(c => this.analyzeCampaign(c));

            const enabled = analyzed.filter(c => c.state === 'enabled');
            const paused = analyzed.filter(c => c.state === 'paused');

            console.log('═══════════════════════════════════════════');
            console.log('📊 CAMPAIGN SUMMARY');
            console.log('═══════════════════════════════════════════\n');
            console.log(`Total Campaigns: ${campaigns.length}`);
            console.log(`  • Enabled: ${enabled.length}`);
            console.log(`  • Paused: ${paused.length}\n`);

            console.log('Campaign Names:');
            analyzed.forEach((c, i) => {
                console.log(`  ${i + 1}. ${c.campaignName} (${c.state})`);
            });

            console.log('\n💾 Syncing to Google Sheets...\n');
            await this.syncToSheets(analyzed);

            console.log('✅ Done!\n');
            console.log('📝 Note: Performance metrics (spend, sales, ACOS) require additional reporting API calls.\n');
            console.log('   This fetched campaign  structure only. For full analysis, need to fetch reports next.\n');
            console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

        } catch (error) {
            console.error('❌ Error:', error.message);
            console.error(error);
        }
    }
}

const fetcher = new PPCCampaignFetcher();
fetcher.run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
