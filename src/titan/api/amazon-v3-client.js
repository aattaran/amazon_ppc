/**
 * AMAZON V3 API CLIENT
 * 
 * Solves "API Version Frankenstein" architectural failure
 * 
 * Features:
 * - v3-only endpoints (NO v2 code)
 * - Unified pagination handling
 * - Proper v3 accept headers
 * - Uses TokenManager for auto-refresh
 */

class AmazonV3Client {
    constructor(tokenManager, config) {
        this.tokenManager = tokenManager;
        this.config = config;

        // v3-ONLY endpoints
        this.endpoints = {
            campaigns: '/sp/campaigns/list',
            adGroups: '/sp/adGroups/list',
            keywords: '/sp/keywords/list',
            targetingClauses: '/sp/targets/list',
            negativeKeywords: '/sp/negativeKeywords/list',
            reporting: '/reporting/reports'
        };

        // v3-ONLY accept headers
        this.acceptHeaders = {
            campaigns: 'application/vnd.spCampaign.v3+json',
            adGroups: 'application/vnd.spAdGroup.v3+json',
            keywords: 'application/vnd.spKeyword.v3+json',
            targets: 'application/vnd.spTargetingClause.v3+json',
            negativeKeywords: 'application/vnd.spNegativeKeyword.v3+json'
        };
    }

    /**
     * Generic paginated fetch with auto-token-refresh
     */
    async fetchPaginated(endpoint, acceptHeader, dataKey, stateFilter = null) {
        let allData = [];
        let nextToken = null;
        let page = 1;

        do {
            console.log(`   📄 Fetching page ${page}...`);

            // Get fresh token (auto-refreshes if needed)
            const token = await this.tokenManager.getToken();

            const requestBody = {
                maxResults: 100
            };

            if (stateFilter) {
                requestBody.stateFilter = stateFilter;
            }

            if (nextToken) {
                requestBody.nextToken = nextToken;
            }

            const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Amazon-Advertising-API-ClientId': this.config.clientId,
                    'Amazon-Advertising-API-Scope': this.config.profileId,
                    'Content-Type': acceptHeader,
                    'Accept': acceptHeader
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error (${response.status}): ${errorText}`);
            }

            const data = await response.json();

            if (data.code) {
                throw new Error(`API Error: ${data.code} - ${data.details}`);
            }

            const results = data[dataKey] || [];
            console.log(`      Found ${results.length} items`);

            allData = allData.concat(results);
            nextToken = data.nextToken || null;

            page++;

            // Rate limiting (1 request per second)
            if (nextToken) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } while (nextToken);

        return allData;
    }

    /**
     * Fetch campaigns (v3 API)
     */
    async fetchCampaigns(stateFilter = { include: ['ENABLED'] }) {
        console.log('📊 Fetching campaigns (v3 API)...');

        const campaigns = await this.fetchPaginated(
            this.endpoints.campaigns,
            this.acceptHeaders.campaigns,
            'campaigns',
            stateFilter
        );

        console.log(`✅ Total campaigns: ${campaigns.length}\n`);
        return campaigns;
    }

    /**
     * Fetch ad groups (v3 API)
     */
    async fetchAdGroups(stateFilter = { include: ['ENABLED'] }) {
        console.log('📊 Fetching ad groups (v3 API)...');

        const adGroups = await this.fetchPaginated(
            this.endpoints.adGroups,
            this.acceptHeaders.adGroups,
            'adGroups',
            stateFilter
        );

        console.log(`✅ Total ad groups: ${adGroups.length}\n`);
        return adGroups;
    }

    /**
     * Fetch keywords (v3 API)
     */
    async fetchKeywords(stateFilter = { include: ['ENABLED'] }) {
        console.log('📊 Fetching keywords (v3 API)...');

        const keywords = await this.fetchPaginated(
            this.endpoints.keywords,
            this.acceptHeaders.keywords,
            'keywords',
            stateFilter
        );

        console.log(`✅ Total keywords: ${keywords.length}\n`);
        return keywords;
    }

    /**
     * Request performance report (v3 Reporting API)
     */
    async requestReport(reportType, lookbackDays = 30) {
        console.log(`📈 Requesting ${reportType} performance report (last ${lookbackDays} days)...`);

        const token = await this.tokenManager.getToken();

        const endDate = new Date().toISOString().split('T')[0];
        const tempStartDate = new Date();
        tempStartDate.setDate(tempStartDate.getDate() - lookbackDays);
        const startDate = tempStartDate.toISOString().split('T')[0];

        const body = {
            name: `Keyword Metrics - ${new Date().toISOString()}`,
            startDate,
            endDate,
            configuration: {
                adProduct: 'SPONSORED_PRODUCTS',
                groupBy: ['targeting'],  // v3 uses 'targeting', not 'keyword'
                columns: [
                    'keywordId',
                    'keyword',        // v3 uses 'keyword', not 'keywordText'
                    'impressions',
                    'clicks',
                    'cost',
                    'sales14d',       // v3 uses 'sales14d', not 'attributedSales14d'
                    'purchases14d'    // v3 uses 'purchases14d', not 'attributedConversions14d'
                ],
                reportTypeId: 'spTargeting',
                timeUnit: 'SUMMARY',
                format: 'GZIP_JSON'
            }
        };

        const response = await fetch(
            `${this.config.apiUrl}/reporting/reports`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Amazon-Advertising-API-ClientId': this.config.clientId,
                    'Amazon-Advertising-API-Scope': this.config.profileId,
                    'Content-Type': 'application/vnd.createasyncreportrequest.v3+json'
                },
                body: JSON.stringify(body)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Report request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`✅ Report requested, ID: ${data.reportId}\n`);

        return data.reportId;
    }

    /**
     * Check report status (v3 Reporting API)
     */
    async checkReportStatus(reportId) {
        const token = await this.tokenManager.getToken();

        const response = await fetch(
            `${this.config.apiUrl}/reporting/reports/${reportId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Amazon-Advertising-API-ClientId': this.config.clientId,
                    'Amazon-Advertising-API-Scope': this.config.profileId
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();
        return data;
    }

    /**
     * Download report data (v3 Reporting API)
     */
    async downloadReport(reportUrl) {
        console.log('📥 Downloading report data...');

        const zlib = require('zlib');
        const util = require('util');
        const gunzip = util.promisify(zlib.gunzip);

        const response = await fetch(reportUrl);  // No auth needed for S3 URL

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        // FIX: Use modern Node.js buffer conversion
        const buffer = Buffer.from(await response.arrayBuffer());
        const decompressed = await gunzip(buffer);
        const jsonText = decompressed.toString('utf-8');

        // Parse JSON array (v3 format)
        const metrics = JSON.parse(jsonText);

        console.log(`✅ Downloaded ${metrics.length} metric records\n`);
        return metrics;
    }
}

module.exports = AmazonV3Client;
