require('dotenv').config();
const axios = require('axios');

async function listAllProfiles() {
    try {
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

        // Get profiles
        const profileResponse = await axios.get(
            'https://advertising-api.amazon.com/v2/profiles',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID
                }
            }
        );

        console.log('\n========================================');
        console.log('ALL AVAILABLE PROFILES');
        console.log('========================================\n');

        profileResponse.data.forEach((profile, index) => {
            console.log(`${index + 1}. Profile ID: ${profile.profileId}`);
            console.log(`   Country: ${profile.countryCode}`);
            console.log(`   Currency: ${profile.currencyCode}`);
            console.log(`   Timezone: ${profile.timezone}`);
            console.log(`   Account Type: ${profile.accountInfo?.type || 'N/A'}`);
            console.log(`   Account Name: ${profile.accountInfo?.name || 'N/A'}`);
            console.log(`   Marketplace: ${profile.accountInfo?.marketplaceStringId || 'N/A'}`);
            console.log('');
        });

        console.log('========================================');
        console.log('For US Amazon.com sales, look for:');
        console.log('  - Country: US');
        console.log('  - Currency: USD');
        console.log('  - Account Type: seller (not vendor)');
        console.log('========================================\n');

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

listAllProfiles();
