/**
 * Amazon Ads API - Get Refresh Token
 * 
 * This script helps you get the refresh token needed for API access.
 * 
 * STEPS:
 * 1. Run this script: node get-refresh-token.js
 * 2. Copy the authorization URL that's printed
 * 3. Paste it in your browser
 * 4. Sign in with your Amazon Ads account
 * 5. Click "Allow" to grant permissions
 * 6. Copy the authorization code from the redirected URL
 * 7. Paste it when prompted
 * 8. Script will exchange it for a refresh token
 * 9. Copy the refresh token to your .env file
 */

require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m'
};

async function getRefreshToken() {
    console.log(`\n${colors.bright}${colors.blue}==================================${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}Amazon Ads API - Get Refresh Token${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}==================================${colors.reset}\n`);

    // Step 1: Generate authorization URL
    const clientId = process.env.AMAZON_CLIENT_ID;
    const redirectUri = process.env.AMAZON_REDIRECT_URI;

    if (!clientId) {
        console.error(`${colors.red}❌ Error: AMAZON_CLIENT_ID not found in .env file${colors.reset}`);
        process.exit(1);
    }

    const authUrl = `https://www.amazon.com/ap/oa?client_id=${clientId}&scope=advertising::campaign_management&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;

    console.log(`${colors.yellow}STEP 1: Authorization URL${colors.reset}`);
    console.log(`${colors.yellow}=========================${colors.reset}\n`);
    console.log(`Copy and paste this URL into your browser:\n`);
    console.log(`${colors.bright}${colors.blue}${authUrl}${colors.reset}\n`);
    console.log(`1. Sign in with your Amazon Ads account`);
    console.log(`2. Click "Allow" to grant permissions`);
    console.log(`3. You'll be redirected to: ${redirectUri}?code=XXXXXX`);
    console.log(`4. Copy the "code" value from the URL\n`);

    // Step 2: Get authorization code from user
    rl.question(`${colors.yellow}STEP 2: Enter the authorization code: ${colors.reset}`, async (authCode) => {
        if (!authCode || authCode.trim().length === 0) {
            console.error(`\n${colors.red}❌ Error: No authorization code provided${colors.reset}`);
            rl.close();
            return;
        }

        console.log(`\n${colors.yellow}STEP 3: Exchanging code for refresh token...${colors.reset}`);

        try {
            // Step 3: Exchange authorization code for tokens
            const response = await axios.post(
                'https://api.amazon.com/auth/o2/token',
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: authCode.trim(),
                    redirect_uri: redirectUri,
                    client_id: clientId,
                    client_secret: process.env.AMAZON_CLIENT_SECRET
                }),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            );

            console.log(`\n${colors.green}${colors.bright}✅ SUCCESS!${colors.reset}\n`);
            console.log(`${colors.green}==================================${colors.reset}`);
            console.log(`${colors.green}Tokens Retrieved${colors.reset}`);
            console.log(`${colors.green}==================================${colors.reset}\n`);

            console.log(`${colors.bright}Access Token:${colors.reset}`);
            console.log(`${response.data.access_token.substring(0, 50)}...`);
            console.log(`${colors.yellow}(Expires in ${response.data.expires_in} seconds)${colors.reset}\n`);

            console.log(`${colors.bright}${colors.green}Refresh Token:${colors.reset}`);
            console.log(`${colors.bright}${response.data.refresh_token}${colors.reset}\n`);

            console.log(`${colors.yellow}==================================${colors.reset}`);
            console.log(`${colors.yellow}NEXT STEP: Update .env file${colors.reset}`);
            console.log(`${colors.yellow}==================================${colors.reset}\n`);
            console.log(`1. Open: ${colors.bright}.env${colors.reset}`);
            console.log(`2. Find line: ${colors.bright}AMAZON_REFRESH_TOKEN=${colors.reset}`);
            console.log(`3. Paste your refresh token there`);
            console.log(`4. Save the file\n`);

            console.log(`${colors.green}✅ Your refresh token has been saved above!${colors.reset}\n`);

        } catch (error) {
            console.error(`\n${colors.red}${colors.bright}❌ ERROR${colors.reset}\n`);

            if (error.response) {
                console.error(`${colors.red}Status:${colors.reset} ${error.response.status}`);
                console.error(`${colors.red}Error:${colors.reset}`, error.response.data);

                if (error.response.data.error === 'invalid_grant') {
                    console.error(`\n${colors.yellow}⚠️  Authorization code expired or already used${colors.reset}`);
                    console.error(`${colors.yellow}Please run this script again and get a new code${colors.reset}\n`);
                }
            } else {
                console.error(error.message);
            }
        }

        rl.close();
    });
}

// Run the script
getRefreshToken().catch(err => {
    console.error(`\n${colors.red}Unexpected error:${colors.reset}`, err.message);
    rl.close();
});
