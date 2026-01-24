require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

/**
 * Amazon Brand Metrics API - Fetch Brand Performance Data
 * 
 * What this API provides:
 * - YOUR brand's performance metrics
 * - Category median benchmarks (indirect competitor data)
 * - Category top performer benchmarks
 * 
 * Does NOT provide:
 * - Specific competitor names
 * - Competitor keyword rankings
 * - Competitor ASINs
 */

async function getBrandMetrics() {
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

        // Step 1: Create brand metrics report
        console.log('📊 Creating Brand Metrics report...');

        const reportRequest = {
            // Customize these parameters
            startDate: getDateDaysAgo(30),  // 30 days ago
            endDate: getTodayDate(),         // Today
            format: 'JSON'                   // or 'CSV'
        };

        const createReportResponse = await axios.post(
            'https://advertising-api.amazon.com/insights/brandMetrics/report',
            reportRequest,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
                    'Amazon-Advertising-API-Scope': process.env.AMAZON_PROFILE_ID,
                    'Content-Type': 'application/json'
                }
            }
        );

        const reportId = createReportResponse.data.reportId;
        console.log(`✅ Report created! ID: ${reportId}`);
        console.log(`   Status: ${createReportResponse.data.status}`);

        // Step 2: Poll for report completion
        console.log('\n⏳ Waiting for report to complete...');

        let reportStatus = 'IN_PROGRESS';
        let downloadUrl = null;
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max

        while (reportStatus === 'IN_PROGRESS' && attempts < maxAttempts) {
            await sleep(10000); // Wait 10 seconds

            const statusResponse = await axios.get(
                `https://advertising-api.amazon.com/insights/brandMetrics/report/${reportId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
                        'Amazon-Advertising-API-Scope': process.env.AMAZON_PROFILE_ID,
                        'Content-Type': 'application/json'
                    }
                }
            );

            reportStatus = statusResponse.data.status;
            downloadUrl = statusResponse.data.location;

            console.log(`   Attempt ${attempts + 1}: ${reportStatus}`);
            attempts++;
        }

        if (reportStatus !== 'SUCCESSFUL') {
            throw new Error(`Report did not complete. Final status: ${reportStatus}`);
        }

        console.log(`✅ Report ready!\n`);

        // Step 3: Download report
        console.log('📥 Downloading brand metrics data...\n');

        const reportData = await axios.get(downloadUrl);

        // Save to file
        const filename = `brand-metrics-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(reportData.data, null, 2));
        console.log(`✅ Saved to: ${filename}\n`);

        // Step 4: Analyze the data
        analyzeBrandMetrics(reportData.data);

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        if (error.response) {
            console.error('\nAPI Response:');
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

function analyzeBrandMetrics(data) {
    console.log('\n========================================');
    console.log('📊 BRAND METRICS ANALYSIS');
    console.log('========================================\n');

    if (!data.brandBuildingMetrics || data.brandBuildingMetrics.length === 0) {
        console.log('No metrics data available');
        return;
    }

    const metrics = data.brandBuildingMetrics;

    console.log(`Total data points: ${metrics.length}\n`);

    // Analyze latest metrics
    const latest = metrics[metrics.length - 1];
    const meta = latest.metadata;
    const vals = latest.metrics;

    console.log('LATEST METRICS:');
    console.log(`Date: ${meta.metricsComputationDate}`);
    console.log(`Brand: ${meta.brandName}`);
    console.log(`Category: ${meta.categoryNodeName}\n`);

    console.log('YOUR PERFORMANCE:');
    if (vals.customerConversionRate) {
        console.log(`  Conversion Rate: ${(parseFloat(vals.customerConversionRate) * 100).toFixed(2)}%`);
    }
    if (vals.engagedShopperRateLowerBound) {
        console.log(`  Engaged Shopper Rate: ${vals.engagedShopperRateLowerBound}%`);
    }

    console.log('\nVS CATEGORY BENCHMARKS:');
    if (vals.customerConversionRateCategoryMedian) {
        console.log(`  Category Median CVR: ${(parseFloat(vals.customerConversionRateCategoryMedian) * 100).toFixed(2)}%`);
    }
    if (vals.customerConversionRateCategoryTopPerformers) {
        console.log(`  Top Performers CVR: ${(parseFloat(vals.customerConversionRateCategoryTopPerformers) * 100).toFixed(2)}%`);
    }

    // Performance assessment
    if (vals.customerConversionRate && vals.customerConversionRateCategoryMedian) {
        const yourCVR = parseFloat(vals.customerConversionRate);
        const medianCVR = parseFloat(vals.customerConversionRateCategoryMedian);

        if (yourCVR > medianCVR) {
            console.log(`\n✅ ABOVE CATEGORY AVERAGE (+${((yourCVR / medianCVR - 1) * 100).toFixed(1)}%)`);
        } else {
            console.log(`\n⚠️  BELOW CATEGORY AVERAGE (${((yourCVR / medianCVR - 1) * 100).toFixed(1)}%)`);
        }
    }

    console.log('\n========================================\n');
}

// Helper functions
function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run
getBrandMetrics();
