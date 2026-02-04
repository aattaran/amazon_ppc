/**
 * Simple DataForSEO Connection Test
 * Just test the basics to verify credentials work
 */

require('dotenv').config();
const axios = require('axios');

async function testConnection() {
    console.log('\n🔬 Testing DataForSEO Connection...\n');

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    console.log('📡 Credentials:');
    console.log(`   Login: ${login}`);
    console.log(`   Password: ${password.substring(0, 4)}...\\n`);

    const client = axios.create({
        baseURL: 'https://api.dataforseo.com/v3',
        auth: { username: login, password: password },
        headers: { 'Content-Type': 'application/json' }
    });

    try {
        // Test 1: Check account
        console.log('💰 Test 1: Checking account...');
        const accountResponse = await client.get('/appendix/user_data');
        console.log('✅ Account API works!');
        console.log('   Response:', JSON.stringify(accountResponse.data, null, 2).substring(0, 500));

        // Test 2: Get keyword data using Google Ads API
        console.log('\n📊 Test 2: Getting keyword suggestions...');
        const keywordResponse = await client.post('/keywords_data/google_ads/keywords_for_keywords/live', [{
            keywords: ['berberine'],
            location_code: 2840,
            language_code: 'en',
            include_seed_keyword: true
        }]);

        if (keywordResponse.data.status_code === 20000) {
            console.log('✅ Keyword API works!');
            const results = keywordResponse.data.tasks[0]?.result || [];
            console.log(`   Found ${results.length} keywords`);
            results.slice(0, 5).forEach(r => {
                console.log(`   - "${r.keyword}": ${r.search_volume || 0} vol, comp: ${r.competition || 0}`);
            });
        }

        console.log('\\n✨ All tests passed! DataForSEO is working.\\n');

    } catch (error) {
        console.error('\\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        process.exit(1);
    }
}

testConnection();
