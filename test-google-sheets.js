/**
 * Test Google Sheets API Connection
 * Run: node test-google-sheets.js
 */

require('dotenv').config();
const { google } = require('googleapis');

async function testConnection() {
    console.log('\n🔍 Testing Google Sheets API Connection...\n');

    try {
        // 1. Validate environment variables
        console.log('📋 Checking environment variables...');

        if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
            throw new Error('❌ GOOGLE_SERVICE_ACCOUNT_EMAIL not found in .env');
        }
        console.log('✅ Service account email:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);

        if (!process.env.GOOGLE_PRIVATE_KEY) {
            throw new Error('❌ GOOGLE_PRIVATE_KEY not found in .env');
        }
        console.log('✅ Private key found (length:', process.env.GOOGLE_PRIVATE_KEY.length, 'chars)');

        if (!process.env.GOOGLE_SHEETS_ID) {
            console.log('⚠️  GOOGLE_SHEETS_ID not set yet - you need to create a Sheet first!');
            console.log('   Follow the next steps to create and share a Google Sheet.\n');
        } else {
            console.log('✅ Sheet ID:', process.env.GOOGLE_SHEETS_ID);
        }

        // 2. Create auth client
        console.log('\n🔐 Creating authentication client...');
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        const authClient = await auth.getClient();
        console.log('✅ Authentication client created successfully!');

        // 3. Test Google Sheets API
        console.log('\n📊 Initializing Google Sheets API...');
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        console.log('✅ Google Sheets API initialized!');

        // 4. If Sheet ID is set, try to read it
        if (process.env.GOOGLE_SHEETS_ID) {
            console.log('\n🔍 Testing access to your Google Sheet...');

            try {
                const response = await sheets.spreadsheets.get({
                    spreadsheetId: process.env.GOOGLE_SHEETS_ID
                });

                console.log('✅ Successfully connected to Sheet!');
                console.log('   Title:', response.data.properties.title);
                console.log('   URL: https://docs.google.com/spreadsheets/d/' + process.env.GOOGLE_SHEETS_ID);

                // Check if we have write access
                console.log('\n✍️  Testing write access...');
                await sheets.spreadsheets.values.append({
                    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
                    range: 'Sheet1!A1',
                    valueInputOption: 'RAW',
                    resource: {
                        values: [['Test', 'Connection', new Date().toISOString()]]
                    }
                });
                console.log('✅ Write access confirmed! Check your sheet for a test row.');

            } catch (error) {
                if (error.code === 404) {
                    console.log('❌ Sheet not found. Make sure:');
                    console.log('   1. The Sheet ID is correct');
                    console.log('   2. You shared the sheet with:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
                } else if (error.code === 403) {
                    console.log('❌ Permission denied. You need to:');
                    console.log('   1. Open your Google Sheet');
                    console.log('   2. Click "Share" button');
                    console.log('   3. Add:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
                    console.log('   4. Set permission: "Editor"');
                } else {
                    throw error;
                }
            }
        }

        console.log('\n🎉 Connection test complete!');
        console.log('\n📝 Next Steps:');
        console.log('   1. Create a Google Sheet at: https://sheets.google.com');
        console.log('   2. Share it with:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
        console.log('   3. Copy the Sheet ID from the URL');
        console.log('   4. Add it to .env: GOOGLE_SHEETS_ID=...');
        console.log('   5. Run this script again to verify!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);

        if (error.message.includes('invalid_grant')) {
            console.log('\n💡 This usually means the private key format is wrong.');
            console.log('   Make sure you copied the ENTIRE key including:');
            console.log('   -----BEGIN PRIVATE KEY-----');
            console.log('   -----END PRIVATE KEY-----');
        }

        process.exit(1);
    }
}

testConnection();
