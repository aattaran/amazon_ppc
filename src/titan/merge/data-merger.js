/**
 * DATA MERGER - In-Memory Keyword + Metrics Merge
 * 
 * Solves "Data Object Mismatches" and "Data Race" architectural failures
 * 
 * Features:
 * - Merges structure and metrics in memory (before writing)
 * - Uses keywordId as primary key
 * - Handles missing metrics gracefully
 * - No partial writes to Google Sheets
 */

class DataMerger {
    /**
     * Merge keywords with their performance metrics
     * 
     * @param {Array} keywords - Keyword structure from v3 API
     * @param {Array} metrics - Metrics from v3 Reporting API
     * @param {Map} campaignNames - Campaign ID → Name lookup
     * @returns {Array} Complete rows ready for Google Sheets
     */
    merge(keywords, metrics, campaignNames = new Map()) {
        console.log('�� Merging keyword structure + metrics in memory...');
        console.log(`   Keywords: ${keywords.length}`);
        console.log(`   Metrics: ${metrics.length}\n`);

        // Create metrics lookup by keywordId
        const metricsMap = new Map();
        metrics.forEach(m => {
            // Handle keywordId as both string and number
            const keyId = String(m.keywordId || m.keyword_id || '');
            if (keyId) {
                metricsMap.set(keyId, m);
            }
        });

        console.log(`   Metrics map size: ${metricsMap.size}`);

        // Merge for each keyword
        let matched = 0;
        let noMetrics = 0;

        const merged = keywords.map(keyword => {
            const keyId = String(keyword.keywordId);
            const metric = metricsMap.get(keyId);

            if (metric) {
                matched++;
            } else {
                noMetrics++;
            }

            // Get campaign name from lookup
            const campaignName = campaignNames.get(keyword.campaignId) || '';
            const testGroup = keyword.testGroup || 'CONTROL';

            return {
                // Raw Data Columns (A-I) - Controlled by script
                keywordId: String(keyword.keywordId),
                keywordText: keyword.keywordText || '',
                matchType: keyword.matchType || '',
                adGroupId: String(keyword.adGroupId || ''),
                campaignId: String(keyword.campaignId || ''),
                campaignName: campaignName,
                testGroup: testGroup,
                state: keyword.state || '',
                currentBid: keyword.bid || 0,

                // Metrics (from report) - CORRECTED v3 field names
                clicks: metric?.clicks || 0,
                impressions: metric?.impressions || 0,
                spend: metric?.cost || 0,
                sales: metric?.sales14d || 0,        // v3 uses 'sales14d'
                orders: metric?.purchases14d || 0,   // v3 uses 'purchases14d'

                // Metadata (Columns R-Z)
                lastUpdated: new Date().toISOString()
            };
        });

        console.log(`✅ Merge complete:`);
        console.log(`   Matched with metrics: ${matched}`);
        console.log(`   No metrics found: ${noMetrics}\n`);

        return merged;
    }

    /**
     * Convert merged data to Google Sheets row format
     */
    toSheetRows(mergedData) {
        return mergedData.map(item => [
            item.keywordText,       // A
            item.keywordId,         // B
            item.matchType,         // C
            item.adGroupId,         // D
            item.campaignId,        // E
            item.campaignName,      // F
            item.testGroup,         // G
            item.state,             // H
            item.bid,               // I
            item.clicks,            // J
            item.impressions,       // K
            item.spend,             // L
            item.sales,             // M
            item.orders,            // N
            '',                     // O (CTR - formula)
            '',                     // P (CPC - formula)
            '',                     // Q (ACOS - formula)
            '',                     // R (CVR - formula)
            '',                     // S (New Bid - optimize-bids.js)
            '',                     // T (Action - optimize-bids.js)
            '',                     // U (Approval - user input)
            item.lastUpdated        // V
        ]);
    }

    /**
     * Create campaign ID → Name lookup map
     */
    static createCampaignLookup(campaigns) {
        const lookup = new Map();
        campaigns.forEach(c => {
            lookup.set(c.campaignId, c.name);
        });
        return lookup;
    }
}

module.exports = DataMerger;
