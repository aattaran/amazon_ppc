/**
 * TITAN SEARCH QUERY PERFORMANCE ANALYZER
 * Amazon SP-API Brand Analytics Integration
 * 
 * Senior Amazon API Engineer - Production Implementation
 * 
 * Chris Rawlings "Sales Stealing" Strategy:
 * Find keywords where:
 *   1. High volume (>1000 searches)
 *   2. Winning conversion (My CVR > Market CVR)
 *   3. Losing clicks (My CTR < Market CTR)
 * 
 * Action: Fix main image/title to capture those "stolen" clicks
 * 
 * Usage: node fetch-sqp-report.js
 */

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

// SP-API Configuration
const SP_API_CONFIG = {
    refreshToken: process.env.SP_API_REFRESH_TOKEN,
    clientId: process.env.SP_API_CLIENT_ID,
    clientSecret: process.env.SP_API_CLIENT_SECRET,
    region: 'us-east-1',
    marketplaceId: 'ATVPDKIKX0DER', // US marketplace
    endpoint: 'https://sellingpartnerapi-na.amazon.com'
};

class SearchQueryPerformanceAnalyzer {
    constructor() {
        this.accessToken = null;
    }

    /**
     * Get LWA (Login with Amazon) access token for SP-API
     */
    async getAccessToken() {
        console.log('🔑 Authenticating with Amazon SP-API...\n');

        try {
            const response = await axios.post(
                'https://api.amazon.com/auth/o2/token',
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: SP_API_CONFIG.refreshToken,
                    client_id: SP_API_CONFIG.clientId,
                    client_secret: SP_API_CONFIG.clientSecret
                }),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                }
            );

            if (response.data.error) {
                throw new Error(`Auth failed: ${response.data.error_description || response.data.error}`);
            }

            this.accessToken = response.data.access_token;
            console.log('✅ SP-API Authentication successful\n');
            return this.accessToken;

        } catch (error) {
            console.error('❌ SP-API Authentication failed:', error.message);
            if (error.response?.data) {
                console.error('   Details:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * Calculate report period (last complete month)
     */
    getReportPeriod() {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = lastMonth.getFullYear();
        const month = String(lastMonth.getMonth() + 1).padStart(2, '0');

        return `${year}-${month}`;
    }

    /**
     * Request Brand Analytics Search Query Performance Report
     */
    async requestReport() {
        const reportPeriod = this.getReportPeriod();
        console.log(`📊 Requesting Brand Analytics Search Query Performance Report...\n`);
        console.log(`   Period: ${reportPeriod} (MONTHLY)\n`);

        try {
            const response = await axios.post(
                `${SP_API_CONFIG.endpoint}/reports/2021-06-30/reports`,
                {
                    reportType: 'GET_BRAND_ANALYTICS_SEARCH_QUERY_PERFORMANCE_REPORT',
                    marketplaceIds: [SP_API_CONFIG.marketplaceId],
                    dataStartTime: `${reportPeriod}-01T00:00:00Z`,
                    dataEndTime: this.getEndOfMonth(reportPeriod)
                },
                {
                    headers: {
                        'x-amz-access-token': this.accessToken,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.reportId) {
                console.log(`   ✅ Report requested (ID: ${response.data.reportId})\n`);
                return response.data.reportId;
            } else {
                throw new Error('No reportId returned from SP-API');
            }

        } catch (error) {
            if (error.response?.data) {
                console.error('❌ SP-API Report Request Error:');
                console.error(JSON.stringify(error.response.data, null, 2));
            } else {
                console.error('❌ Report request failed:', error.message);
            }
            throw error;
        }
    }

    /**
     * Get end of month timestamp
     */
    getEndOfMonth(yearMonth) {
        const [year, month] = yearMonth.split('-');
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        return `${yearMonth}-${lastDay}T23:59:59Z`;
    }

    /**
     * Poll for report completion
     */
    async pollReport(reportId) {
        console.log('   Polling for report completion...');

        const maxAttempts = 60; // 2 minutes max (SP-API reports can be slower)

        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await axios.get(
                    `${SP_API_CONFIG.endpoint}/reports/2021-06-30/reports/${reportId}`,
                    {
                        headers: {
                            'x-amz-access-token': this.accessToken
                        }
                    }
                );

                const { processingStatus, reportDocumentId } = response.data;

                if (processingStatus === 'DONE') {
                    console.log('   ✅ Report ready!\n');
                    return reportDocumentId;
                }

                if (processingStatus === 'CANCELLED' || processingStatus === 'FATAL') {
                    throw new Error(`Report generation ${processingStatus.toLowerCase()}`);
                }

                // Still processing (IN_QUEUE or IN_PROGRESS)
                if (i % 10 === 0 && i > 0) {
                    console.log(`   Still processing... (${i * 2}s elapsed)`);
                }

                if (i < maxAttempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                if (error.response?.status === 404) {
                    // Report not found yet, wait and retry
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    console.warn(`   Poll attempt ${i + 1} failed:`, error.message);

                    if (i === maxAttempts - 1) {
                        throw error;
                    }

                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        throw new Error('Report polling timeout (2 minutes)');
    }

    /**
     * Download report document
     */
    async downloadReport(reportDocumentId) {
        console.log('📥 Downloading report document...\n');

        try {
            // Step 1: Get report document metadata (includes download URL)
            const metadataResponse = await axios.get(
                `${SP_API_CONFIG.endpoint}/reports/2021-06-30/documents/${reportDocumentId}`,
                {
                    headers: {
                        'x-amz-access-token': this.accessToken
                    }
                }
            );

            const { url, compressionAlgorithm } = metadataResponse.data;

            // Step 2: Download the actual report (pre-signed URL, no auth needed)
            const reportResponse = await axios.get(url, {
                responseType: 'text'
            });

            console.log('   ✅ Report downloaded successfully\n');

            // Step 3: Parse TSV (tab-separated values) format
            const data = this.parseTSV(reportResponse.data);

            console.log(`   ✅ Parsed ${data.length} search terms\n`);
            return data;

        } catch (error) {
            console.error('❌ Report download failed:', error.message);
            throw error;
        }
    }

    /**
     * Parse TSV (Tab-Separated Values) format
     */
    parseTSV(tsvData) {
        const lines = tsvData.trim().split('\n');
        const headers = lines[0].split('\t');

        return lines.slice(1).map(line => {
            const values = line.split('\t');
            const row = {};

            headers.forEach((header, index) => {
                row[header] = values[index];
            });

            return row;
        });
    }

    /**
     * Analyze data using Chris Rawlings "Sales Stealing" strategy
     */
    analyzeHiddenGems(data) {
        console.log('🔍 Analyzing for "Hidden Gems" (Sales Stealing Opportunities)...\n');

        const hiddenGems = [];

        data.forEach(row => {
            // Parse numeric values
            const searchQueryVolume = parseInt(row['Search Query Volume'] || row['searchQueryVolume'] || 0);
            const brandImpressions = parseInt(row['Brand Impressions'] || row['brandImpressions'] || 0);
            const brandClicks = parseInt(row['Brand Clicks'] || row['brandClicks'] || 0);
            const brandPurchases = parseInt(row['Brand Purchases'] || row['brandPurchases'] || 0);
            const totalImpressions = parseInt(row['Total Impressions'] || row['totalImpressions'] || 0);
            const totalClicks = parseInt(row['Total Clicks'] || row['totalClicks'] || 0);
            const totalPurchases = parseInt(row['Total Purchases'] || row['totalPurchases'] || 0);
            const searchTerm = row['Search Term'] || row['searchTerm'] || 'Unknown';

            // Calculate metrics
            const myCTR = brandImpressions > 0 ? (brandClicks / brandImpressions) : 0;
            const marketCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) : 0;
            const myCVR = brandClicks > 0 ? (brandPurchases / brandClicks) : 0;
            const marketCVR = totalClicks > 0 ? (totalPurchases / totalClicks) : 0;

            // Apply Chris Rawlings criteria
            const isHiddenGem = (
                searchQueryVolume > 1000 &&           // High volume
                myCVR > marketCVR &&                  // Winning conversion
                myCTR < marketCTR &&                  // Losing clicks
                brandImpressions > 0 &&               // We're showing up
                marketCTR > 0                         // Market has activity
            );

            if (isHiddenGem) {
                const ctrGap = ((marketCTR - myCTR) / marketCTR * 100);
                const cvrAdvantage = ((myCVR - marketCVR) / marketCVR * 100);
                const potentialSales = Math.round(searchQueryVolume * (marketCTR - myCTR) * myCVR);

                hiddenGems.push({
                    searchTerm,
                    searchQueryVolume,
                    myCTR: (myCTR * 100).toFixed(2),
                    marketCTR: (marketCTR * 100).toFixed(2),
                    ctrGap: ctrGap.toFixed(1),
                    myCVR: (myCVR * 100).toFixed(2),
                    marketCVR: (marketCVR * 100).toFixed(2),
                    cvrAdvantage: cvrAdvantage.toFixed(1),
                    potentialSales,
                    currentPurchases: brandPurchases
                });
            }
        });

        // Sort by potential sales (biggest opportunities first)
        hiddenGems.sort((a, b) => b.potentialSales - a.potentialSales);

        return hiddenGems;
    }

    /**
     * Print results in formatted table
     */
    printResults(hiddenGems) {
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║  🎯 HIDDEN GEMS - SALES STEALING OPPORTUNITIES                 ║');
        console.log('║  Chris Rawlings Strategy: Fix Image/Title to Steal Clicks     ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        if (hiddenGems.length === 0) {
            console.log('✅ No hidden gems found. Your CTR is optimal on high-volume terms!\n');
            return;
        }

        console.log(`Found ${hiddenGems.length} opportunities:\n`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        hiddenGems.forEach((gem, index) => {
            console.log(`${index + 1}. 💎 ${gem.searchTerm.toUpperCase()}`);
            console.log(`   Volume: ${gem.searchQueryVolume.toLocaleString()} searches/month`);
            console.log(`   CTR: Mine ${gem.myCTR}% vs Market ${gem.marketCTR}% (${gem.ctrGap}% gap)`);
            console.log(`   CVR: Mine ${gem.myCVR}% vs Market ${gem.marketCVR}% (+${gem.cvrAdvantage}% advantage)`);
            console.log(`   Current Sales: ${gem.currentPurchases}/month`);
            console.log(`   Potential: +${gem.potentialSales} sales/month if CTR matches market`);
            console.log(`   → ACTION: Optimize main image & title for "${gem.searchTerm}"\n`);
        });

        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log('📝 Recommended Actions (Priority Order):\n');

        hiddenGems.slice(0, 5).forEach((gem, index) => {
            console.log(`${index + 1}. "${gem.searchTerm}"`);
            console.log(`   - Update main image to highlight benefit shown in competitor listings`);
            console.log(`   - Add "${gem.searchTerm}" prominently in title (first 80 chars)`);
            console.log(`   - Expected uplift: +${gem.potentialSales} sales/month\n`);
        });

        // Calculate total opportunity
        const totalPotential = hiddenGems.reduce((sum, gem) => sum + gem.potentialSales, 0);
        const totalCurrent = hiddenGems.reduce((sum, gem) => sum + gem.currentPurchases, 0);
        const upliftPercent = totalCurrent > 0 ? ((totalPotential / totalCurrent) * 100).toFixed(1) : 0;

        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log('💰 TOTAL OPPORTUNITY:\n');
        console.log(`   Current monthly sales on these terms: ${totalCurrent}`);
        console.log(`   Potential additional sales: +${totalPotential}`);
        console.log(`   Total uplift potential: ${upliftPercent}% increase\n`);
    }

    /**
     * Main execution
     */
    async run() {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║  🔍 TITAN SEARCH QUERY PERFORMANCE ANALYZER                    ║');
        console.log('║  Amazon Brand Analytics - Sales Stealing Strategy             ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        try {
            // 1. Authenticate
            await this.getAccessToken();

            // 2. Request report
            const reportId = await this.requestReport();

            // 3. Poll until ready
            const reportDocumentId = await this.pollReport(reportId);

            // 4. Download and parse report
            const data = await this.downloadReport(reportDocumentId);

            // 5. Analyze for hidden gems
            const hiddenGems = this.analyzeHiddenGems(data);

            // 6. Print results
            this.printResults(hiddenGems);

            console.log('✅ Analysis complete!\n');

        } catch (error) {
            console.error('\n❌ Error:', error.message);

            console.error('\n💡 Troubleshooting:');
            console.error('   - Verify SP-API credentials in .env:');
            console.error('     SP_API_REFRESH_TOKEN');
            console.error('     SP_API_CLIENT_ID');
            console.error('     SP_API_CLIENT_SECRET');
            console.error('   - Ensure you have Brand Analytics access in Seller Central');
            console.error('   - Check that your brand is enrolled in Amazon Brand Registry');
            console.error('   - Verify marketplace ID is correct (ATVPDKIKX0DER = US)\n');

            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const analyzer = new SearchQueryPerformanceAnalyzer();

    analyzer.run().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = SearchQueryPerformanceAnalyzer;
