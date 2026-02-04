/**
 * DataForSEO API Client
 * Wrapper for DataForSEO REST API v3
 * Documentation: https://docs.dataforseo.com/v3/
 */

const axios = require('axios');

class DataForSEOClient {
    constructor(login = process.env.DATAFORSEO_LOGIN, password = process.env.DATAFORSEO_PASSWORD) {
        if (!login || !password) {
            throw new Error('DataForSEO credentials not found. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env');
        }

        this.login = login;
        this.password = password;
        this.baseURL = 'https://api.dataforseo.com/v3';

        // Create axios instance with auth
        this.client = axios.create({
            baseURL: this.baseURL,
            auth: {
                username: this.login,
                password: this.password
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Get search volume for keywords
     * @param {Array<string>} keywords - List of keywords (max 1000 per request)
     * @param {string} location - Location code (default: 2840 = United States)
     * @returns {Promise<Array>} Search volume data
     */
    async getSearchVolume(keywords, location = '2840') {
        console.log(`📊 Getting search volume for ${keywords.length} keywords...`);

        try {
            const response = await this.client.post('/keywords_data/google_ads/search_volume/task_post', [{
                keywords: keywords,
                location_code: parseInt(location),
                language_code: 'en',
                date_from: '2024-01-01', // Last 12 months
                date_to: '2024-12-31'
            }]);

            if (response.data.status_code === 20000) {
                // Task posted, now get results
                const taskId = response.data.tasks[0].id;

                // Get task results
                const resultResponse = await this.client.get(`/keywords_data/google_ads/search_volume/task_get/${taskId}`);

                if (resultResponse.data.status_code === 20000 && resultResponse.data.tasks[0].result) {
                    const results = resultResponse.data.tasks[0].result;
                    console.log(`✅ Got search volume for ${results.length} keywords`);
                    return results;
                }
            }

            throw new Error(`DataForSEO API error: ${response.data.status_message || 'Unknown error'}`);
        } catch (error) {
            console.error('❌ Search volume request failed:', error.message);
            throw error;
        }
    }

    /**
     * Get keyword ideas and related keywords
     * @param {string} seedKeyword - Seed keyword to expand
     * @param {number} limit - Max results (default: 100)
     * @returns {Promise<Array>} Related keywords with metrics
     */
    async getKeywordIdeas(seedKeyword, limit = 100) {
        console.log(`💡 Getting keyword ideas for "${seedKeyword}"...`);

        try {
            const response = await this.client.post('/dataforseo_labs/google/keywords_for_keywords/live', [{
                keyword: seedKeyword,
                location_code: 2840,
                language_code: 'en',
                include_seed_keyword: true,
                limit: limit,
                filters: [
                    ['keyword_info.search_volume', '>', 50] // Minimum 50 monthly searches
                ],
                order_by: ['keyword_info.search_volume,desc']
            }]);

            if (response.data.status_code === 20000) {
                const results = response.data.tasks[0].result;
                console.log(`✅ Found ${results.length} related keywords`);
                return results.map(item => ({
                    keyword: item.keyword,
                    searchVolume: item.keyword_info?.search_volume || 0,
                    competition: item.keyword_info?.competition || 0,
                    cpc: item.keyword_info?.cpc || 0,
                    difficulty: item.keyword_properties?.keyword_difficulty || 0
                }));
            } else {
                throw new Error(`DataForSEO API error: ${response.data.status_message}`);
            }
        } catch (error) {
            console.error('❌ Keyword ideas request failed:', error.message);
            throw error;
        }
    }

    /**
     * Get SERP data to check rankings
     * @param {string} keyword - Keyword to check
     * @param {string} location - Location code
     * @returns {Promise<Array>} SERP results with rankings
     */
    async getSerpData(keyword, location = '2840') {
        console.log(`🔍 Getting SERP data for "${keyword}"...`);

        try {
            const response = await this.client.post('/serp/google/organic/live/advanced', [{
                keyword: keyword,
                location_code: parseInt(location),
                language_code: 'en',
                device: 'desktop',
                os: 'windows',
                depth: 100 // Get top 100 results
            }]);

            if (response.data.status_code === 20000) {
                const items = response.data.tasks[0].result[0]?.items || [];
                console.log(`✅ Found ${items.length} SERP results`);

                return items.map((item, index) => ({
                    position: item.rank_group,
                    url: item.url,
                    domain: item.domain,
                    title: item.title,
                    description: item.description
                }));
            } else {
                throw new Error(`DataForSEO API error: ${response.data.status_message}`);
            }
        } catch (error) {
            console.error('❌ SERP request failed:', error.message);
            throw error;
        }
    }

    /**
     * Get competition data for keywords
     * @param {Array<string>} keywords - Keywords to analyze
     * @returns {Promise<Array>} Competition metrics
     */
    async getCompetitionData(keywords) {
        console.log(`📈 Getting competition data for ${keywords.length} keywords...`);

        try {
            const response = await this.client.post('/keywords_data/google_ads/keywords_for_keywords/live', [{
                keywords: keywords,
                location_code: 2840,
                language_code: 'en'
            }]);

            if (response.data.status_code === 20000) {
                const results = response.data.tasks[0].result;
                console.log(`✅ Got competition data for ${results.length} keywords`);

                return results.map(item => ({
                    keyword: item.keyword,
                    searchVolume: item.search_volume || 0,
                    competition: item.competition || 0,
                    competitionIndex: item.competition_index || 0,
                    lowTopOfPageBid: item.low_top_of_page_bid || 0,
                    highTopOfPageBid: item.high_top_of_page_bid || 0
                }));
            } else {
                throw new Error(`DataForSEO API error: ${response.data.status_message}`);
            }
        } catch (error) {
            console.error('❌ Competition data request failed:', error.message);
            throw error;
        }
    }

    /**
     * Find which ASINs/products rank for a keyword
     * @param {string} keyword - Keyword to search
     * @param {Array<string>} targetASINs - ASINs to look for
     * @returns {Promise<Object>} Rankings for each ASIN
     */
    async getAsinRankings(keyword, targetASINs) {
        console.log(`🎯 Checking ASIN rankings for "${keyword}"...`);

        try {
            const serpResults = await this.getSerpData(keyword);
            const rankings = {};

            for (const asin of targetASINs) {
                const result = serpResults.find(item =>
                    item.url && item.url.includes(asin)
                );
                rankings[asin] = result ? result.position : null;
            }

            console.log(`✅ Found rankings:`, rankings);
            return rankings;
        } catch (error) {
            console.error('❌ ASIN ranking check failed:', error.message);
            throw error;
        }
    }

    /**
   * Check account balance
   * @returns {Promise<Object>} Account info with balance
   */
    async getAccountInfo() {
        try {
            const response = await this.client.get('/appendix/user_data');

            if (response.data.status_code === 20000) {
                const result = response.data.tasks?.[0]?.result?.[0] || response.data.tasks?.[0]?.result;
                console.log('💰 Account info:', result);
                return result || { money: { balance: 0, spent: 0, limit: 0 } };
            } else {
                throw new Error(`DataForSEO API error: ${response.data.status_message}`);
            }
        } catch (error) {
            console.error('❌ Account info request failed:', error.message);
            throw error;
        }
    }
}

module.exports = DataForSEOClient;
