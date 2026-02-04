/**
 * Keyword Enricher Service
 * Enriches raw keywords with search volume, competition, and CPC data from DataForSEO
 */

const DataForSEOClient = require('./dataforseo-client');

class KeywordEnricher {
    constructor() {
        this.client = new DataForSEOClient();
    }

    /**
     * Enrich a single keyword with full data
     * @param {string} keyword - Keyword to enrich
     * @returns {Promise<Object>} Enriched keyword data
     */
    async enrichKeyword(keyword) {
        try {
            // Get search volume and competition data
            const volumeData = await this.client.getSearchVolume([keyword]);
            const competitionData = await this.client.getCompetitionData([keyword]);

            const volume = volumeData[0] || {};
            const competition = competitionData[0] || {};

            return {
                keyword: keyword,
                searchVolume: volume.search_volume || competition.searchVolume || 0,
                competition: competition.competition || 0,
                competitionIndex: competition.competitionIndex || 0,
                estimatedCPC: competition.lowTopOfPageBid || 0,
                highCPC: competition.highTopOfPageBid || 0,
                source: 'dataforseo',
                lastEnriched: new Date().toISOString()
            };
        } catch (error) {
            console.error(`❌ Failed to enrich "${keyword}":`, error.message);
            // Return keyword with null values if enrichment fails
            return {
                keyword: keyword,
                searchVolume: null,
                competition: null,
                estimatedCPC: null,
                source: 'failed',
                lastEnriched: new Date().toISOString()
            };
        }
    }

    /**
     * Enrich multiple keywords in batches
     * @param {Array<string>} keywords - Keywords to enrich
     * @param {number} batchSize - Batch size (default: 100, DataForSEO max is 1000)
     * @returns {Promise<Array>} Enriched keywords
     */
    async enrichBatch(keywords, batchSize = 100) {
        console.log(`\n🔍 Enriching ${keywords.length} keywords...`);
        console.log(`📦 Batch size: ${batchSize} keywords per request`);

        const enriched = [];
        const batches = [];

        // Split into batches
        for (let i = 0; i < keywords.length; i += batchSize) {
            batches.push(keywords.slice(i, i + batchSize));
        }

        console.log(`📊 Processing ${batches.length} batches...\n`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`Batch ${i + 1}/${batches.length}: ${batch.length} keywords`);

            try {
                // Get data for entire batch at once
                const volumeResults = await this.client.getSearchVolume(batch);
                const competitionResults = await this.client.getCompetitionData(batch);

                // Map results by keyword
                const volumeMap = new Map(volumeResults.map(r => [r.keyword, r]));
                const competitionMap = new Map(competitionResults.map(r => [r.keyword, r]));

                // Combine data for each keyword
                for (const keyword of batch) {
                    const volume = volumeMap.get(keyword) || {};
                    const competition = competitionMap.get(keyword) || {};

                    enriched.push({
                        keyword: keyword,
                        searchVolume: volume.search_volume || competition.searchVolume || 0,
                        competition: competition.competition || 0,
                        competitionIndex: competition.competitionIndex || 0,
                        estimatedCPC: competition.lowTopOfPageBid || 0,
                        highCPC: competition.highTopOfPageBid || 0,
                        source: 'dataforseo',
                        lastEnriched: new Date().toISOString()
                    });
                }

                console.log(`✅ Batch ${i + 1} complete`);

                // Rate limiting: wait 1 second between batches
                if (i < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (error) {
                console.error(`❌ Batch ${i + 1} failed:`, error.message);

                // Add failed keywords with null values
                for (const keyword of batch) {
                    enriched.push({
                        keyword: keyword,
                        searchVolume: null,
                        competition: null,
                        estimatedCPC: null,
                        source: 'failed',
                        lastEnriched: new Date().toISOString()
                    });
                }
            }
        }

        console.log(`\n✅ Enrichment complete: ${enriched.length} keywords\n`);

        // Summary statistics
        const successful = enriched.filter(k => k.source === 'dataforseo').length;
        const failed = enriched.filter(k => k.source === 'failed').length;
        const avgVolume = enriched
            .filter(k => k.searchVolume)
            .reduce((sum, k) => sum + k.searchVolume, 0) / successful;

        console.log('📊 Enrichment Summary:');
        console.log(`   ✅ Successful: ${successful}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📈 Avg Search Volume: ${Math.round(avgVolume)}`);
        console.log('');

        return enriched;
    }

    /**
     * Expand seed keywords into related keywords using DataForSEO
     * @param {Array<string>} seedKeywords - Seed keywords to expand
     * @param {number} limit - Max related keywords per seed
     * @returns {Promise<Array>} Expanded keyword list with metrics
     */
    async expandKeywords(seedKeywords, limit = 100) {
        console.log(`\n💡 Expanding ${seedKeywords.length} seed keywords...`);

        const allKeywords = new Map(); // Use Map to deduplicate

        for (const seed of seedKeywords) {
            try {
                console.log(`   Expanding "${seed}"...`);
                const ideas = await this.client.getKeywordIdeas(seed, limit);

                // Add to map (this deduplicates automatically)
                for (const idea of ideas) {
                    if (!allKeywords.has(idea.keyword)) {
                        allKeywords.set(idea.keyword, idea);
                    }
                }

                console.log(`   ✅ Found ${ideas.length} ideas`);

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`   ❌ Failed to expand "${seed}":`, error.message);
            }
        }

        const uniqueKeywords = Array.from(allKeywords.values());
        console.log(`\n✅ Expansion complete: ${uniqueKeywords.length} unique keywords\n`);

        return uniqueKeywords;
    }

    /**
     * Get SERP rankings for your ASIN vs competitors
     * @param {string} keyword - Keyword to check
     * @param {string} yourASIN - Your product ASIN
     * @param {Array<string>} competitorASINs - Competitor ASINs
     * @returns {Promise<Object>} Ranking data
     */
    async getRankings(keyword, yourASIN, competitorASINs = []) {
        console.log(`🎯 Checking rankings for "${keyword}"...`);

        try {
            const allASINs = [yourASIN, ...competitorASINs];
            const rankings = await this.client.getAsinRankings(keyword, allASINs);

            return {
                keyword: keyword,
                yourRank: rankings[yourASIN] || null,
                competitorRanks: competitorASINs.map(asin => rankings[asin]).filter(r => r !== null)
            };
        } catch (error) {
            console.error(`❌ Failed to get rankings:`, error.message);
            return {
                keyword: keyword,
                yourRank: null,
                competitorRanks: []
            };
        }
    }
}

module.exports = KeywordEnricher;
