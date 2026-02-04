/**
 * Quick test to discover real keywords using Google Ads API
 */

require('dotenv').config();
const DataForSEOClient = require('./src/titan/services/dataforseo-client');
const OpportunityScorer = require('./src/titan/scoring/opportunity-scorer');
const TierClassifier = require('./src/titan/scoring/tier-classifier');
const KeywordDatabase = require('./src/titan/database/keywords-db');
const SyncCoordinator = require('./src/titan/sync/sync-coordinator');

async function discoverRealKeywords() {
    console.log('\n🚀 Discovering Real Keywords for Berberine Products...\n');

    const client = new DataForSEOClient();
    const db = new KeywordDatabase();
    const scorer = new OpportunityScorer();
    const classifier = new TierClassifier();

    // Seed keywords for your berberine product
    const seedKeywords = [
        'berberine',
        'berberine supplement',
        'dihydroberberine',
        'dhb supplement',
        'berberine hcl',
        'berberine capsules',
        'berberine for blood sugar',
        'berberine weight loss',
        'best berberine',
        'organic berberine'
    ];

    console.log(`📋 Starting with ${seedKeywords.length} seed keywords...\n`);

    try {
        // Get keyword suggestions using Google Ads API
        console.log('📊 Getting keyword data from Google Ads API...\n');
        const response = await client.getCompetitionData(seedKeywords);

        console.log(`✅ Found ${response.length} keywords with data\n`);

        // Convert to our format
        const keywords = response.map(item => ({
            keyword: item.keyword,
            searchVolume: item.searchVolume || 0,
            competition: item.competition || 0,
            competitionIndex: item.competitionIndex || 0,
            estimatedCPC: item.lowTopOfPageBid || 0,
            highCPC: item.highTopOfPageBid || 0,
            yourRank: null,
            competitorRanks: [],
            source: 'dataforseo'
        }));

        // Score them
        console.log('🎯 Scoring opportunities...\n');
        const scored = scorer.batchScore(keywords);

        // Classify
        console.log('🏆 Classifying into tiers...\n');
        const classified = classifier.classifyBatch(scored);

        // Save to database
        console.log('💾 Saving to database...\n');
        let saved = 0;
        for (const kw of classified) {
            if (db.addKeyword(kw)) saved++;
        }
        console.log(`✅ Saved ${saved} keywords\n`);

        // Sync to Google Sheets
        console.log('🔄 Syncing to Google Sheets...\n');
        const sync = new SyncCoordinator(db);
        await sync.pushToSheets();
        db.recordSync('push', saved, true);

        // Show summary
        console.log('\n═══════════════════════════════════════════');
        console.log('📊 DISCOVERY COMPLETE');
        console.log('═══════════════════════════════════════════\n');

        const tier1 = classified.filter(k => k.tier === 'Tier 1');
        const tier2 = classified.filter(k => k.tier === 'Tier 2');
        const tier3 = classified.filter(k => k.tier === 'Tier 3');

        console.log(`Total Keywords: ${classified.length}`);
        console.log(`Tier 1: ${tier1.length} keywords`);
        console.log(`Tier 2: ${tier2.length} keywords`);
        console.log(`Tier 3: ${tier3.length} keywords\n`);

        console.log('Top 10 Keywords:');
        classified.slice(0, 10).forEach((kw, i) => {
            console.log(`${i + 1}. ${kw.keyword}`);
            console.log(`   Score: ${kw.opportunityScore} | Vol: ${kw.searchVolume} | CPC: $${kw.estimatedCPC} | Tier: ${kw.tier}`);
        });

        console.log('\n✅ Check your Google Sheets to see all keywords!\n');
        console.log('https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

        db.close();

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

discoverRealKeywords();
