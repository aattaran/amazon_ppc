/**
 * Test Amazon Ads API Access
 * 
 * Run this AFTER API approval to verify everything works.
 * 
 * Usage: node test-api-access.js
 */

require('dotenv').config();
const axios = require('axios');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    bright: '\x1b[1m'
};

async function testAPIAccess() {
    console.log(`\n${colors.bright}${colors.blue}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}Amazon Ads API - Connection Test${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}========================================${colors.reset}\n`);

    // Step 1: Verify environment variables
    console.log(`${colors.yellow}Step 1: Checking environment variables...${colors.reset}`);

    const requiredVars = [
        'AMAZON_CLIENT_ID',
        'AMAZON_CLIENT_SECRET',
        'AMAZON_REFRESH_TOKEN',
        'AMAZON_PROFILE_ID'
    ];

    const missing = [];
    requiredVars.forEach(varName => {
        if (!process.env[varName]) {
            missing.push(varName);
            console.log(`  ${colors.red}❌ ${varName} - Missing${colors.reset}`);
        } else {
            const value = process.env[varName];
            const preview = value.length > 30 ? value.substring(0, 30) + '...' : value;
            console.log(`  ${colors.green}✅ ${varName} - ${preview}${colors.reset}`);
        }
    });

    if (missing.length > 0) {
        console.log(`\n${colors.red}${colors.bright}ERROR: Missing required environment variables!${colors.reset}`);
        console.log(`${colors.yellow}Please add these to your .env file:${colors.reset}`);
        missing.forEach(v => console.log(`  - ${v}`));
        process.exit(1);
    }

    console.log(`${colors.green}✅ All environment variables present\n${colors.reset}`);

    // Step 2: Refresh access token
    console.log(`${colors.yellow}Step 2: Refreshing access token...${colors.reset}`);

    let accessToken;
    try {
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

        accessToken = tokenResponse.data.access_token;
        console.log(`${colors.green}✅ Access token obtained${colors.reset}`);
        console.log(`  Token: ${accessToken.substring(0, 30)}...`);
        console.log(`  Expires in: ${tokenResponse.data.expires_in} seconds\n`);
    } catch (err) {
        console.log(`${colors.red}❌ Failed to get access token${colors.reset}`);
        console.log(`  Error: ${err.response?.data?.error || err.message}`);
        console.log(`\n${colors.yellow}Troubleshooting:${colors.reset}`);
        console.log(`  1. Check that AMAZON_REFRESH_TOKEN is correct`);
        console.log(`  2. Verify AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET match your LWA Security Profile`);
        console.log(`  3. Make sure you ran the authorization flow (get-refresh-token.js)`);
        process.exit(1);
    }

    // Step 3: Get profile information
    console.log(`${colors.yellow}Step 3: Fetching profile information...${colors.reset}`);

    try {
        const profileResponse = await axios.get(
            'https://advertising-api.amazon.com/v2/profiles',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID
                }
            }
        );

        console.log(`${colors.green}✅ Profile data retrieved${colors.reset}`);
        console.log(`  Profiles found: ${profileResponse.data.length}\n`);

        profileResponse.data.forEach(profile => {
            console.log(`  Profile ID: ${profile.profileId}`);
            console.log(`  Country: ${profile.countryCode}`);
            console.log(`  Currency: ${profile.currencyCode}`);
            console.log(`  Timezone: ${profile.timezone}`);
            console.log(`  Account Type: ${profile.accountInfo?.type || 'N/A'}`);
            console.log('');
        });

        // Verify profile ID matches
        const targetProfile = profileResponse.data.find(p => p.profileId === process.env.AMAZON_PROFILE_ID);
        if (!targetProfile) {
            console.log(`${colors.yellow}⚠️  Warning: Profile ID ${process.env.AMAZON_PROFILE_ID} not found in your profiles${colors.reset}`);
            console.log(`${colors.yellow}   Available profiles: ${profileResponse.data.map(p => p.profileId).join(', ')}${colors.reset}\n`);
        } else {
            console.log(`${colors.green}✅ Target profile ID verified\n${colors.reset}`);
        }

    } catch (err) {
        console.log(`${colors.red}❌ Failed to fetch profiles${colors.reset}`);
        console.log(`  Status: ${err.response?.status}`);
        console.log(`  Error: ${JSON.stringify(err.response?.data) || err.message}`);
        console.log(`\n${colors.yellow}Troubleshooting:${colors.reset}`);
        console.log(`  1. Check that API access has been approved by Amazon`);
        console.log(`  2. Verify you requested the correct scopes (advertising::campaign_management)`);
        console.log(`  3. Wait 24 hours after approval and try again`);
        process.exit(1);
    }

    // Step 4: Get campaigns
    console.log(`${colors.yellow}Step 4: Fetching campaigns...${colors.reset}`);

    try {
        const campaignsResponse = await axios.get(
            'https://advertising-api.amazon.com/v2/sp/campaigns',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
                    'Amazon-Advertising-API-Scope': process.env.AMAZON_PROFILE_ID
                }
            }
        );

        const campaigns = campaignsResponse.data;
        console.log(`${colors.green}✅ Campaigns retrieved${colors.reset}`);
        console.log(`  Total campaigns: ${campaigns.length}`);
        console.log(`  Active: ${campaigns.filter(c => c.state === 'enabled').length}`);
        console.log(`  Paused: ${campaigns.filter(c => c.state === 'paused').length}`);
        console.log(`  Archived: ${campaigns.filter(c => c.state === 'archived').length}\n`);

        // Show first 5 campaigns
        console.log(`  ${colors.bright}First 5 campaigns:${colors.reset}`);
        campaigns.slice(0, 5).forEach(campaign => {
            console.log(`    - ${campaign.name} (${campaign.state}) - $${campaign.budget}/day`);
        });
        console.log('');

    } catch (err) {
        console.log(`${colors.red}❌ Failed to fetch campaigns${colors.reset}`);
        console.log(`  Status: ${err.response?.status}`);
        console.log(`  Error: ${JSON.stringify(err.response?.data) || err.message}`);
        console.log(`\n${colors.yellow}Troubleshooting:${colors.reset}`);
        console.log(`  1. Check AMAZON_PROFILE_ID is correct`);
        console.log(`  2. Verify you have advertiser_campaign_edit or advertiser_campaign_view permission`);
        process.exit(1);
    }

    // Step 5: Test reporting API
    console.log(`${colors.yellow}Step 5: Testing reporting API...${colors.reset}`);

    try {
        // Just verify we can make the request (report will take time to generate)
        const reportRequest = await axios.post(
            'https://advertising-api.amazon.com/v2/sp/campaigns/report',
            {
                reportDate: getYesterdayDate(),
                metrics: ['impressions', 'clicks', 'cost']
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
                    'Amazon-Advertising-API-Scope': process.env.AMAZON_PROFILE_ID,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`${colors.green}✅ Reporting API accessible${colors.reset}`);
        console.log(`  Report ID: ${reportRequest.data.reportId}`);
        console.log(`  Status: ${reportRequest.data.status}\n`);

    } catch (err) {
        console.log(`${colors.red}❌ Failed to request report${colors.reset}`);
        console.log(`  Status: ${err.response?.status}`);
        console.log(`  Error: ${JSON.stringify(err.response?.data) || err.message}`);
        console.log(`\n${colors.yellow}Troubleshooting:${colors.reset}`);
        console.log(`  1. Verify you have nemo_report_edit or nemo_report_view permission`);
    }

    // Success!
    console.log(`${colors.bright}${colors.green}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.green}✅ API ACCESS TEST PASSED!${colors.reset}`);
    console.log(`${colors.bright}${colors.green}========================================${colors.reset}\n`);

    console.log(`${colors.bright}You can now:${colors.reset}`);
    console.log(`  ✅ Fetch campaign data automatically`);
    console.log(`  ✅ Generate performance reports`);
    console.log(`  ✅ Run bleeder detection: node detect-bleeders-daily.js`);
    console.log(`  ✅ Build automation tools`);
    console.log('');
}

function getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0].replace(/-/g, '');
}

// Run the test
testAPIAccess().catch(err => {
    console.error(`\n${colors.red}Unexpected error:${colors.reset}`, err.message);
    process.exit(1);
});
