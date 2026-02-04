/**
 * Test Current Amazon Ads API Access Levels
 * Tests what API endpoints are available with current scopes
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'https://advertising-api.amazon.com';

async function getAccessToken() {
    try {
        const response = await axios.post('https://api.amazon.com/auth/o2/token', {
            grant_type: 'refresh_token',
            refresh_token: process.env.AMAZON_REFRESH_TOKEN,
            client_id: process.env.AMAZON_CLIENT_ID,
            client_secret: process.env.AMAZON_CLIENT_SECRET
        });
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Failed to get access token:', error.message);
        process.exit(1);
    }
}

async function testEndpoint(name, method, path, token) {
    try {
        const response = await axios({
            method,
            url: `${BASE_URL}${path}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
                'Amazon-Advertising-API-Scope': process.env.AMAZON_PROFILE_ID
            }
        });

        console.log(`✅ ${name}: ACCESSIBLE`);
        return true;
    } catch (error) {
        if (error.response?.status === 401) {
            console.log(`❌ ${name}: UNAUTHORIZED (check credentials)`);
        } else if (error.response?.status === 403) {
            console.log(`⛔ ${name}: FORBIDDEN (scope not granted)`);
        } else if (error.response?.status === 404) {
            console.log(`✅ ${name}: ACCESSIBLE (no data found, but API works)`);
        } else {
            console.log(`⚠️  ${name}: ${error.response?.status || error.message}`);
        }
        return false;
    }
}

async function main() {
    console.log('\n🔍 Testing Amazon Ads API Access Levels...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const token = await getAccessToken();
    console.log('✅ Access token obtained\n');

    const tests = [
        // CAMPAIGN MANAGEMENT (Should work - you have this scope)
        {
            name: 'Sponsored Products Campaigns',
            method: 'GET',
            path: '/v2/sp/campaigns'
        },
        {
            name: 'Keywords',
            method: 'GET',
            path: '/v2/sp/keywords'
        },
        {
            name: 'Ad Groups',
            method: 'GET',
            path: '/v2/sp/adGroups'
        },

        // SPONSORED BRANDS (May or may not work)
        {
            name: 'Sponsored Brands Campaigns',
            method: 'GET',
            path: '/sb/campaigns'
        },
        {
            name: 'SB Keywords',
            method: 'GET',
            path: '/sb/keywords'
        },

        // REPORTING (Likely won't work - need to request scope)
        {
            name: 'Campaign Reports',
            method: 'POST',
            path: '/v2/sp/campaigns/report'
        },
        {
            name: 'Keyword Reports',
            method: 'POST',
            path: '/v2/sp/keywords/report'
        },
        {
            name: 'Search Term Reports',
            method: 'POST',
            path: '/v2/sp/targets/report'
        }
    ];

    console.log('📊 TESTING ENDPOINTS:\n');

    for (const test of tests) {
        await testEndpoint(test.name, test.method, test.path, token);
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 SUMMARY:\n');
    console.log('✅ = API endpoint accessible');
    console.log('⛔ = Missing required scope (need to request)');
    console.log('❌ = Authorization issue');
    console.log('⚠️  = Other error\n');

    console.log('🔗 To request additional scopes:');
    console.log('   https://advertising.amazon.com/API/docs/en-us/setting-up/overview\n');
}

main().catch(console.error);
