/**
 * SP-API REFRESH TOKEN GENERATOR
 * 
 * This script helps you get a refresh token for Amazon Selling Partner API
 * using your existing LWA (Login with Amazon) credentials
 * 
 * Usage:
 * 1. Make sure AMAZON_CLIENT_ID and AMAZON_CLIENT_SECRET are in .env
 * 2. Run: node get-sp-api-token.js
 * 3. Follow the instructions
 * 4. Copy the refresh token to .env as SP_API_REFRESH_TOKEN
 */

require('dotenv').config();
const http = require('http');
const axios = require('axios');

// Use existing LWA credentials
const CLIENT_ID = process.env.AMAZON_CLIENT_ID;
const CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000';

class SPAPITokenGenerator {
    constructor() {
        this.authorizationCode = null;
        this.server = null;
    }

    /**
     * Step 1: Generate authorization URL
     */
    getAuthorizationUrl() {
        // SP-API authorization endpoint
        const baseUrl = 'https://sellercentral.amazon.com/apps/authorize/consent';

        const params = new URLSearchParams({
            application_id: CLIENT_ID,
            state: 'sp-api-token-generation',
            version: 'beta'
        });

        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Step 2: Start local server to capture OAuth callback
     */
    startCallbackServer() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                const url = new URL(req.url, `http://localhost:3000`);

                if (url.pathname === '/') {
                    const code = url.searchParams.get('spapi_oauth_code');
                    const state = url.searchParams.get('state');
                    const error = url.searchParams.get('error');

                    if (error) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`
                            <html>
                                <body style="font-family: Arial; padding: 40px; text-align: center;">
                                    <h1 style="color: red;">❌ Authorization Failed</h1>
                                    <p>Error: ${error}</p>
                                    <p>You can close this window.</p>
                                </body>
                            </html>
                        `);
                        reject(new Error(`Authorization failed: ${error}`));
                        return;
                    }

                    if (code) {
                        this.authorizationCode = code;

                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`
                            <html>
                                <body style="font-family: Arial; padding: 40px; text-align: center;">
                                    <h1 style="color: green;">✅ Authorization Successful!</h1>
                                    <p>You can close this window and return to the terminal.</p>
                                </body>
                            </html>
                        `);

                        // Close server after brief delay
                        setTimeout(() => {
                            this.server.close();
                            resolve(code);
                        }, 1000);
                    }
                }
            });

            this.server.listen(3000, () => {
                console.log('📡 Callback server started on http://localhost:3000\n');
            });

            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    reject(new Error('Port 3000 is already in use. Please close other applications using this port.'));
                } else {
                    reject(error);
                }
            });
        });
    }

    /**
     * Step 3: Exchange authorization code for refresh token
     */
    async exchangeCodeForToken(authCode) {
        console.log('🔄 Exchanging authorization code for refresh token...\n');

        try {
            const response = await axios.post(
                'https://api.amazon.com/auth/o2/token',
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: authCode,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error('❌ Token exchange failed:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Main execution
     */
    async run() {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║  🔑 SP-API REFRESH TOKEN GENERATOR                             ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        // Check credentials
        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.error('❌ Missing LWA credentials in .env file\n');
            console.error('Required:');
            console.error('  - AMAZON_CLIENT_ID');
            console.error('  - AMAZON_CLIENT_SECRET\n');
            console.error('These should already be in your .env file from Amazon Ads API setup.\n');
            process.exit(1);
        }

        console.log('✅ LWA Credentials found\n');
        console.log(`Client ID: ${CLIENT_ID}\n`);

        try {
            // Step 1: Generate authorization URL
            const authUrl = this.getAuthorizationUrl();

            console.log('═══════════════════════════════════════════════════════════════\n');
            console.log('📋 STEP 1: AUTHORIZE ACCESS\n');
            console.log('Please visit this URL in your browser:\n');
            console.log(`\x1b[36m${authUrl}\x1b[0m\n`);
            console.log('You will be asked to:');
            console.log('  1. Log in to Seller Central (if not already)');
            console.log('  2. Grant permissions to your application');
            console.log('  3. Click "Allow access"\n');
            console.log('═══════════════════════════════════════════════════════════════\n');

            // Step 2: Start callback server
            console.log('⏳ Waiting for authorization...\n');
            const serverPromise = this.startCallbackServer();

            // Wait for callback
            await serverPromise;

            console.log('✅ Authorization code received!\n');

            // Step 3: Exchange for refresh token
            const tokenData = await this.exchangeCodeForToken(this.authorizationCode);

            console.log('═══════════════════════════════════════════════════════════════\n');
            console.log('🎉 SUCCESS! Your SP-API Refresh Token:\n');
            console.log(`\x1b[32m${tokenData.refresh_token}\x1b[0m\n`);
            console.log('═══════════════════════════════════════════════════════════════\n');
            console.log('📝 NEXT STEPS:\n');
            console.log('1. Copy the green refresh token above');
            console.log('2. Open your .env file');
            console.log('3. Find or add these lines:\n');
            console.log('   SP_API_CLIENT_ID=' + CLIENT_ID);
            console.log('   SP_API_CLIENT_SECRET=' + CLIENT_SECRET);
            console.log('   SP_API_REFRESH_TOKEN=' + tokenData.refresh_token + '\n');
            console.log('4. Save the .env file');
            console.log('5. Run: node fetch-sqp-report.js\n');
            console.log('═══════════════════════════════════════════════════════════════\n');

        } catch (error) {
            console.error('\n❌ Error:', error.message);

            if (this.server) {
                this.server.close();
            }

            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new SPAPITokenGenerator();
    generator.run();
}

module.exports = SPAPITokenGenerator;
