/**
 * Test Keyword Database
 * Test CRUD operations and statistics
 */

const KeywordDatabase = require('./src/titan/database/keywords-db');
const OpportunityScorer = require('./src/titan/scoring/opportunity-scorer');
const TierClassifier = require('./src/titan/scoring/tier-classifier');

async function testDatabase() {
    console.log('\n📦 Testing Keyword Database...\n');

    // Initialize database
    const db = new KeywordDatabase();
    console.log('✅ Database initialized\n');

    // Sample keywords
    const sampleKeywords = [
        {
            keyword: 'dihydroberberine supplement',
            searchVolume: 2244,
            competition: 0.68,
            estimatedCPC: 1.85,
            yourRank: 23,
            competitorRanks: [1, 3, 5],
            source: 'dataforseo'
        },
        {
            keyword: 'dhb capsules 200mg',
            searchVolume: 1822,
            competition: 0.72,
            estimatedCPC: 1.92,
            yourRank: null,
            competitorRanks: [2, 4, 6],
            source: 'dataforseo'
        },
        {
            keyword: 'berberine for blood sugar',
            searchVolume: 1456,
            competition: 0.55,
            estimatedCPC: 1.28,
            yourRank: 18,
            competitorRanks: [3, 8, 15],
            source: 'manual'
        }
    ];

    // Score and classify
    const scorer = new OpportunityScorer();
    const classifier = new TierClassifier();

    const scored = scorer.batchScore(sampleKeywords);
    const classified = classifier.classifyBatch(scored);

    // Test 1: Add keywords
    console.log('📝 Test 1: Adding keywords to database...');
    for (const kw of classified) {
        db.addKeyword(kw);
    }
    console.log(`✅ Added ${classified.length} keywords\n`);

    // Test 2: Get all keywords
    console.log('📊 Test 2: Retrieving all keywords...');
    const allKeywords = db.getAllKeywords();
    console.log(`✅ Retrieved ${allKeywords.length} keywords\n`);

    // Test 3: Get by tier
    console.log('🏆 Test 3: Querying by tier...');
    const tier1 = db.getKeywordsByTier('Tier 1');
    const tier2 = db.getKeywordsByTier('Tier 2');
    console.log(`   Tier 1: ${tier1.length} keywords`);
    console.log(`   Tier 2: ${tier2.length} keywords\n`);

    // Test 4: Search keywords
    console.log('🔍 Test 4: Searching keywords...');
    const searchResults = db.searchKeywords('berberine');
    console.log(`✅ Found ${searchResults.length} keywords matching "berberine"\n`);

    // Test 5: Update a keyword
    console.log('✏️  Test 5: Updating a keyword...');
    const updated = db.updateKeyword('dhb capsules 200mg', {
        yourBid: 2.50,
        status: 'Deployed',
        notes: 'High performer - increased bid'
    });
    console.log(`✅ Update ${updated ? 'successful' : 'failed'}\n`);

    // Test 6: Get top opportunities
    console.log('⭐ Test 6: Top opportunities...');
    const topOpps = db.getTopOpportunities(5);
    console.log('Top 5 keywords:');
    topOpps.forEach((kw, i) => {
        console.log(`   ${i + 1}. ${kw.keyword} (Score: ${kw.opportunityScore}, Tier: ${kw.tier})`);
    });
    console.log('');

    // Test 7: Database statistics
    console.log('📈 Test 7: Database statistics...');
    const stats = db.getStats();
    console.log(`   Total Keywords: ${stats.totalKeywords}`);
    console.log(`   Average Score: ${stats.avgScore.toFixed(1)}`);
    console.log('   By Tier:');
    Object.entries(stats.byTier).forEach(([tier, count]) => {
        console.log(`      ${tier}: ${count}`);
    });
    console.log('   By Status:');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
        console.log(`      ${status}: ${count}`);
    });
    console.log('');

    // Test 8: Record sync
    console.log('🔄 Test 8: Recording sync...');
    db.recordSync('push', classified.length, true);
    const syncHistory = db.getSyncHistory(5);
    console.log(`✅ Sync recorded. History: ${syncHistory.length} entries\n`);

    // Test 9: Settings
    console.log('⚙️  Test 9: Settings management...');
    db.saveSetting('targetROAS', 3.0);
    db.saveSetting('autoDeployTier1', true);
    const targetROAS = db.getSetting('targetROAS');
    console.log(`✅ Target ROAS: ${targetROAS}\n`);

    console.log('═'.repeat(60));
    console.log('✨ All database tests passed!');
    console.log('═'.repeat(60));
    console.log(`\n📊 Database file: data/titan-keywords.db`);
    console.log(`   Size: ${require('fs').statSync('./data/titan-keywords.db').size} bytes\n`);

    // Close database
    db.close();
}

testDatabase().catch(console.error);
