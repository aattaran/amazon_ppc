/**
 * Simple diagnostic script to test Amazon Reporting API v3
 */

require('dotenv').config();
const fetch = require('node-fetch');

async function test() {
    try {
        // 1. Authenticate
        console.log('🔐 Authenticating...');
        const authResp = await fetch('https://api.amazon.com/auth/o2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: process.env.AMAZON_CLIENT_ID,
                client_secret: process.env.AMAZON_CLIENT_SECRET,
                refresh_token: process.env.AMAZON_REFRESH_TOKEN
            })
        });

        const authData = await authResp.json();
        console.log('✅ Got access token\n');

        // 2. Request report
        console.log('📊 Requesting report...');
        const requestBody = {
            name: "Test Keyword Report",
            startDate: "2026-01-15",
            endDate: "2026-01-31",
            configuration: {
                adProduct: "SPONSORED_PRODUCTS",
                groupBy: ["targeting"],
                columns: ["keywordId", "keyword", "matchType", "impressions", "clicks", "cost", "purchases14d", "sales14d", "adKeywordStatus"],
                reportTypeId: "spTargeting",
                timeUnit: "SUMMARY",
                format: "GZIP_JSON"
            }
        };

        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const reportResp = await fetch(
            'https://advertising-api.amazon.com/reporting/reports',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authData.access_token}`,
                    'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
                    'Amazon-Advertising-API-Scope': process.env.AMAZON_PROFILE_ID,
                    'Content-Type': 'application/vnd.createasyncreportrequest.v3+json'
                },
                body: JSON.stringify(requestBody)
            }
        );

        console.log('\nResponse status:', reportResp.status, reportResp.statusText);

        const responseText = await reportResp.text();
        console.log('Response body:', responseText);

        if (reportResp.ok) {
            const data = JSON.parse(responseText);
            console.log('\n✅ Success! Report ID:', data.reportId);
        } else {
            console.log('\n❌ Error! Full response above');
        }

    } catch (error) {
        console.error('\n💥 Exception:', error.message);
        console.error(error.stack);
    }
}

test();
