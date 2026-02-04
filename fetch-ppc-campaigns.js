/**
 * ═══════════════════════════════════════════════════════════════════
 * TITAN PPC CAMPAIGNS FETCHER - VERBOSE DEBUG VERSION
 * ═══════════════════════════════════════════════════════════════════
 * 
 * This script fetches ALL PPC campaigns from Amazon Ads API V3
 * and syncs them to Google Sheets with EXTREME VERBOSITY for debugging.
 * 
 * Features:
 * - Step-by-step logging for every API call
 * - HTTP status code reporting
 * - Error details with full stack traces
 * - Campaign count tracking
 * - Google Sheets sync verification
 */

require('dotenv').config();
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const CONFIG = {
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    profileId: process.env.AMAZON_PROFILE_ID,
    sheetsId: process.env.GOOGLE_SHEETS_ID
};

class PPCCampaignFetcher {
    constructor() {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║  🚀 TITAN PPC CAMPAIGNS FETCHER (VERBOSE DEBUG MODE)      ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        this.sheets = new UnifiedSheetsService();
        this.accessToken = null;

        // Validate configuration
        this.validateConfig();
    }

    /**
     * Validate environment variables
     */
    validateConfig() {
        console.log('🔍 Validating configuration...');

        const required = ['refreshToken', 'clientId', 'clientSecret', 'profileId', 'sheetsId'];
        const missing = required.filter(key => !CONFIG[key]);

        if (missing.length > 0) {
            console.error(`❌ Missing required env variables: ${missing.join(', ')}`);
            process.exit(1);
        }

        console.log('   ✅ Client ID:', CONFIG.clientId.substring(0, 20) + '...');
        console.log('   ✅ Profile ID:', CONFIG.profileId);
        console.log('   ✅ Sheets ID:', CONFIG.sheetsId.substring(0, 20) + '...');
        console.log('   ✅ Refresh Token:', CONFIG.refreshToken.substring(0, 20) + '...');
        console.log('');
    }

    /**
     * Step 1: Get Amazon Ads API Access Token
     */
    async authenticate() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('STEP 1: AUTHENTICATION');
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log('🔐 Requesting access token from Amazon LWA...');
        console.log('   Endpoint: https://api.amazon.com/auth/o2/token');
        console.log('   Method: POST');
        console.log('   Grant Type: refresh_token\n');

        try {
            const response = await fetch('https://api.amazon.com/auth/o2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: CONFIG.refreshToken,
                    client_id: CONFIG.clientId,
                    client_secret: CONFIG.clientSecret
                })
            });

            console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Authentication FAILED!');
                console.error('   Status:', response.status);
                console.error('   Response:', errorText);
                throw new Error(`Auth failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            if (data.error) {
                console.error('❌ Authentication FAILED!');
                console.error('   Error:', data.error);
                console.error('   Description:', data.error_description);
                throw new Error(`Auth error: ${data.error_description || data.error}`);
            }

            this.accessToken = data.access_token;
            console.log('✅ Authentication SUCCESS!');
            console.log(`   Access Token: ${this.accessToken.substring(0, 30)}...`);
            console.log('');

        } catch (error) {
            console.error('❌ Authentication EXCEPTION:', error.message);
            throw error;
        }
    }

    /**
     * Step 2: Fetch ALL campaigns with pagination
     */
    async fetchAllCampaigns() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('STEP 2: FETCH CAMPAIGNS WITH PAGINATION');
        console.log('═══════════════════════════════════════════════════════════\n');

        let allCampaigns = [];
        let nextToken = null;
        let page = 1;

        do {
            console.log(`\n🔄 Fetching page ${page}...`);
            console.log('   Endpoint: https://advertising-api.amazon.com/sp/campaigns/list');
            console.log('   Method: POST');
            console.log('   Max Results: 100');
            if (nextToken) {
                console.log('   Next Token:', nextToken.substring(0, 30) + '...');
            }

            try {
                const requestBody = {
                    maxResults: 100,
                    stateFilter: {
                        include: ['ENABLED', 'PAUSED', 'ARCHIVED']
                    }
                };

                if (nextToken) {
                    requestBody.nextToken = nextToken;
                }

                const response = await fetch('https://advertising-api.amazon.com/sp/campaigns/list', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Amazon-Advertising-API-ClientId': CONFIG.clientId,
                        'Amazon-Advertising-API-Scope': CONFIG.profileId,
                        'Content-Type': 'application/vnd.spcampaign.v3+json',
                        'Accept': 'application/vnd.spcampaign.v3+json'
                    },
                    body: JSON.stringify(requestBody)
                });

                console.log(`   📡 Response Status: ${response.status} ${response.statusText}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`   ❌ API Request FAILED on page ${page}!`);
                    console.error('      Status:', response.status);
                    console.error('      Response:', errorText);
                    throw new Error(`API Error: ${response.status} ${errorText}`);
                }

                const data = await response.json();

                if (data.code) {
                    console.error(`   ❌ API Error on page ${page}:`, data.code);
                    console.error('      Details:', data.details);
                    throw new Error(`API Error: ${data.code} - ${data.details}`);
                }

                const campaigns = data.campaigns || [];
                console.log(`   📦 Found ${campaigns.length} campaigns on page ${page}`);

                if (campaigns.length > 0) {
                    console.log(`      First campaign: "${campaigns[0].name}" (${campaigns[0].state})`);
                }

                allCampaigns = allCampaigns.concat(campaigns);
                console.log(`   📊 Total campaigns so far: ${allCampaigns.length}`);

                // Check for next page
                nextToken = data.nextToken || null;

                if (nextToken) {
                    console.log(`   ➡️  Next token found - will fetch page ${page + 1}`);
                } else {
                    console.log('   ✅ No more pages - pagination complete');
                }

                page++;

            } catch (error) {
                console.error(`   ❌ EXCEPTION on page ${page}:`, error.message);
                console.error('      Stack:', error.stack);
                throw error;
            }

        } while (nextToken);

        console.log('\n✅ Campaign Fetch COMPLETE!');
        console.log(`   Total campaigns fetched: ${allCampaigns.length}`);
        console.log(`   Total pages: ${page - 1}\n`);

        return allCampaigns;
    }

    /**
     * Step 3: Process campaigns into sheet rows
     */
    processCampaigns(campaigns) {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('STEP 3: PROCESS CAMPAIGN DATA');
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log(`🔧 Processing ${campaigns.length} campaigns...`);

        const rows = campaigns.map((c, index) => {
            const budget = c.budget?.budget || c.budget || 0;

            if (index < 3) {
                console.log(`   ${index + 1}. "${c.name}" - ${c.state} - Budget: $${budget}`);
            }

            return [
                c.name,                     // Campaign Name
                c.state,                    // State
                c.targetingType,            // Targeting
                budget,                     // Budget
                0, 0, 0, 0, 0,             // Spend, Sales, Impressions, Clicks, Orders
                0, 0, 0, 0, 0,             // CTR, CPC, ACOS, ROAS, CVR
                'NO',                       // Is Bleeder
                'NONE',                     // Severity
                c.state === 'ENABLED' ? 'Fetch Reports' : 'Paused' // Recommendation
            ];
        });

        if (campaigns.length > 3) {
            console.log(`   ... (${campaigns.length - 3} more campaigns)`);
        }

        console.log(`\n✅ Processed ${rows.length} rows for Google Sheets\n`);

        return rows;
    }

    /**
     * Step 4: Sync to Google Sheets
     */
    async syncToSheets(rows) {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('STEP 4: SYNC TO GOOGLE SHEETS');
        console.log('═══════════════════════════════════════════════════════════\n');

        const sheetName = 'PPC Campaigns';

        // Safety guard
        if (!rows || rows.length === 0) {
            console.error('❌ CRITICAL: No campaigns to sync!');
            console.error('   This could indicate:');
            console.error('   1. No campaigns in your Amazon Ads account');
            console.error('   2. API returned empty response');
            console.error('   3. Processing failed');
            console.error('\n   Stopping to prevent data loss.');
            return;
        }

        console.log(`💾 Syncing ${rows.length} rows to Google Sheets...`);
        console.log(`   Sheet Name: ${sheetName}`);
        console.log(`   Spreadsheet ID: ${CONFIG.sheetsId}`);
        console.log(`   Target Range: A11:Q${10 + rows.length}`);
        console.log('');

        try {
            // Step 4a: Clear existing data
            console.log('   🧹 Clearing range A11:Q1000...');
            await this.sheets.clearRange(sheetName, 'A11:Q1000');
            console.log('   ✅ Range cleared successfully');

            // Step 4b: Write new data
            console.log(`\n   ✍️  Writing ${rows.length} rows starting at A11...`);
            console.log(`      First row: ${rows[0][0]} (${rows[0][1]})`);

            await this.sheets.writeRows(sheetName, rows, 'A11');

            console.log('   ✅ Rows written successfully');

            console.log('\n✅ Google Sheets Sync COMPLETE!');
            console.log(`   URL: https://docs.google.com/spreadsheets/d/${CONFIG.sheetsId}`);
            console.log('');

        } catch (error) {
            console.error('❌ Google Sheets Sync FAILED!');
            console.error('   Error:', error.message);
            console.error('   Stack:', error.stack);
            throw error;
        }
    }

    /**
     * Main execution flow
     */
    async run() {
        const startTime = Date.now();

        try {
            // Step 1: Authenticate
            await this.authenticate();

            // Step 2: Fetch campaigns
            const campaigns = await this.fetchAllCampaigns();

            // Step 3: Process data
            const rows = this.processCampaigns(campaigns);

            // Step 4: Sync to sheets
            await this.syncToSheets(rows);

            // Summary
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log('═══════════════════════════════════════════════════════════');
            console.log('✅ EXECUTION COMPLETE');
            console.log('═══════════════════════════════════════════════════════════\n');
            console.log(`   Total Campaigns: ${campaigns.length}`);
            console.log(`   Execution Time: ${duration}s`);
            console.log(`   Status: SUCCESS ✅`);
            console.log('');

        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.error('\n═══════════════════════════════════════════════════════════');
            console.error('❌ EXECUTION FAILED');
            console.error('═══════════════════════════════════════════════════════════\n');
            console.error('   Error:', error.message);
            console.error('   Stack:', error.stack);
            console.error(`   Execution Time: ${duration}s`);
            console.error('');

            process.exit(1);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTE
// ═══════════════════════════════════════════════════════════════════

if (require.main === module) {
    const fetcher = new PPCCampaignFetcher();
    fetcher.run();
}

module.exports = PPCCampaignFetcher;
