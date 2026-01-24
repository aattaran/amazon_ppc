require('dotenv').config();
const axios = require('axios');

async function fetchCampaigns() {
    try {
        console.log('\n🔄 Getting access token...');

        // Get access token
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
        console.log('✅ Access token obtained\n');

        console.log('🔄 Fetching campaigns for profile:', process.env.AMAZON_PROFILE_ID);
        console.log('   (US Seller - Luxe Allur)');
        console.log('   Endpoint: POST https://advertising-api.amazon.com/sp/campaigns/list\n');

        // CORRECT v3 API - POST to /sp/campaigns/list
        const campaignsResponse = await axios.post(
            'https://advertising-api.amazon.com/sp/campaigns/list',
            {
                maxResults: 100
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
                    'Amazon-Advertising-API-Scope': process.env.AMAZON_PROFILE_ID,
                    'Content-Type': 'application/vnd.spcampaign.v3+json',
                    'Accept': 'application/vnd.spcampaign.v3+json'
                }
            }
        );

        const data = campaignsResponse.data;
        const campaigns = data.campaigns || [];

        console.log('========================================');
        console.log('✅ CAMPAIGNS RETRIEVED SUCCESSFULLY!');
        console.log('========================================\n');

        console.log(`Total campaigns: ${campaigns.length}`);
        console.log(`Active: ${campaigns.filter(c => c.state === 'enabled').length}`);
        console.log(`Paused: ${campaigns.filter(c => c.state === 'paused').length}`);
        console.log(`Archived: ${campaigns.filter(c => c.state === 'archived').length}\n`);

        if (campaigns.length > 0) {
            console.log('All Campaigns:\n');
            campaigns.forEach((campaign, index) => {
                console.log(`${index + 1}. ${campaign.name}`);
                console.log(`   ID: ${campaign.campaignId}`);
                console.log(`   State: ${campaign.state}`);
                console.log(`   Targeting: ${campaign.targetingType}`);
                console.log(`   Budget: $${campaign.budget?.budget || campaign.budget || 'N/A'}/day`);
                console.log(`   Start Date: ${campaign.startDate || 'N/A'}`);
                console.log('');
            });
        } else {
            console.log('No campaigns found.\n');
        }

        if (data.nextToken) {
            console.log(`📄 More campaigns available. Use nextToken: ${data.nextToken}`);
        }

    } catch (error) {
        console.error('❌ ERROR FETCHING CAMPAIGNS\n');
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('\nFull Error Response:');
        console.error(JSON.stringify(error.response?.data, null, 2));

        if (error.response?.status === 401) {
            console.error('\n⚠️  401 Unauthorized - Token invalid or expired');
        } else if (error.response?.status === 403) {
            console.error('\n⚠️  403 Forbidden - Check permissions');
            console.error('Error Code:', error.response?.data?.code);
        } else if (error.response?.status === 404) {
            console.error('\n⚠️  404 Not Found - Endpoint incorrect');
        }
    }
}

fetchCampaigns();
