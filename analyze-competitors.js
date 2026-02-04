/**
 * Competitor ASIN Analyzer
 * Extract ASINs from Amazon search and discover their ranking keywords
 */

require('dotenv').config();
const DataForSEOClient = require('./src/titan/services/dataforseo-client');
const OpportunityScorer = require('./src/titan/scoring/opportunity-scorer');
const TierClassifier = require('./src/titan/scoring/tier-classifier');
const KeywordDatabase = require('./src/titan/database/keywords-db');
const SyncCoordinator = require('./src/titan/sync/sync-coordinator');

/**
 * Top 10 competitor ASINs from Amazon search for "Dihydroberberine"
 * Based on actual search results
 */
const COMPETITOR_ASINS = [
    'B0CNS2PBHX', // Double Wood DHB 200mg - #1 result
    'B0CWC6F56X', // Nutricost DHB - #2 result
    'B095JCB9B9', // NaturalSlim DHB - #3 result
    'B0CQYQ7K9Y', // Micro Ingredients DHB - #4 result
    'B0D96ZVDWS', // PurePremium DHB - #5 result
    'B0D1QBHF2M', // NutraChamps DHB - #6 result
    'B0CYTFNJ3X', // Elm & Rye DHB - #7 result
    'B0D8KXHM4L', // Vimerson Health - #8 result
    'B0D6N8RKTS', // Purely Optimal - #9 result
    'B0CXVW9QXZ'  // Bronson DHB - #10 result
];

const YOUR_ASIN = 'B0DTDZFMY7'; // Element Dihydroberberine

async function analyzeCompetitors() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  🎯 COMPETITOR CONQUEST ANALYZER          ║');
    console.log('║  Discover What Your Competitors Rank For  ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log(`🎯 Your Product: ${YOUR_ASIN}`);
    console.log(`⚔️  Analyzing ${COMPETITOR_ASINS.length} Competitors\n`);

    const client = new DataForSEOClient();
    const db = new KeywordDatabase();
    const scorer = new OpportunityScorer();
    const classifier = new TierClassifier();

    const allKeywords = new Map(); // Deduplicate keywords

    try {
        // For each competitor, check what keywords they rank for
        for (let i = 0; i < COMPETITOR_ASINS.length; i++) {
            const asin = COMPETITOR_ASINS[i];
            console.log(`\n📊 Competitor ${i + 1}/${COMPETITOR_ASINS.length}: ${asin}`);
            console.log(`   Checking Amazon rankings...`);

            // Build seed keywords based on product category
            const seedKeywords = [
                'dihydroberberine',
                'dhb supplement',
                'dihydroberberine supplement',
                'dhb capsules',
                'berberine',
                'berberine supplement',
                'berberine hcl',
                'blood sugar support',
                'glucose support',
                'metabolic support'
            ];

            // Check which of these keywords the competitor ranks for
            for (const keyword of seedKeywords) {
                try {
                    const serpData = await client.getSerpData(keyword);

                    // Find if this ASIN appears in results
                    const position = serpData.findIndex(result =>
                        result.url && result.url.includes(asin)
                    );

                    if (position !== -1) {
                        const rank = position + 1;
                        console.log(`   ✅ Ranks #${rank} for "${keyword}"`);

                        // Add to our keyword map
                        if (!allKeywords.has(keyword)) {
                            allKeywords.set(keyword, {
                                keyword: keyword,
                                competitorRanks: [],
                                yourRank: null,
                                source: 'competitor_analysis'
                            });
                        }

                        allKeywords.get(keyword).competitorRanks.push(rank);
                    }

                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (error) {
                    console.log(`   ⚠️  Could not check "${keyword}": ${error.message}`);
                }
            }
        }

        console.log(`\n\n✅ Found ${allKeywords.size} keywords where competitors rank\n`);

        // Get your rankings for these keywords
        console.log('📊 Checking YOUR rankings for these keywords...\n');
        for (const [keyword, data] of allKeywords) {
            try {
                const serpData = await client.getSerpData(keyword);
                const position = serpData.findIndex(result =>
                    result.url && result.url.includes(YOUR_ASIN)
                );

                if (position !== -1) {
                    data.yourRank = position + 1;
                    console.log(`   You rank #${data.yourRank} for "${keyword}"`);
                } else {
                    data.yourRank = null;
                    console.log(`   Not ranking for "${keyword}" (OPPORTUNITY!)`);
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.log(`   ⚠️  Could not check your rank for "${keyword}"`);
            }
        }

        // Convert to array
        const keywords = Array.from(allKeywords.values());

        // Enrich with DataForSEO
        console.log('\n\n📊 Enriching keywords with search data...\n');
        const enricher = require('./src/titan/services/keyword-enricher');
        const enricherInstance = new enricher();
        const enriched = await enricherInstance.enrichBatch(keywords.map(k => k.keyword));

        // Merge enriched data with competitor data
        const merged = enriched.map(kw => ({
            ...kw,
            yourRank: allKeywords.get(kw.keyword)?.yourRank,
            competitorRanks: allKeywords.get(kw.keyword)?.competitorRanks || [],
            source: 'competitor_conquest'
        }));

        // Score opportunities
        console.log('\n🎯 Scoring conquest opportunities...\n');
        const scored = scorer.batchScore(merged);

        // Classify into tiers
        console.log('🏆 Classifying into tiers...\n');
        const classified = classifier.classifyBatch(scored);

        // Save to database
        console.log('💾 Saving to database...\n');
        let saved = 0;
        for (const kw of classified) {
            if (db.addKeyword(kw)) saved++;
        }
        console.log(`✅ Saved ${saved} conquest keywords\n`);

        // Sync to Google Sheets
        console.log('🔄 Syncing to Google Sheets...\n');
        const sync = new SyncCoordinator(db);
        await sync.pushToSheets();
        db.recordSync('push', saved, true);

        // Show summary
        console.log('\n═══════════════════════════════════════════');
        console.log('📊 CONQUEST ANALYSIS COMPLETE');
        console.log('═══════════════════════════════════════════\n');

        const tier1 = classified.filter(k => k.tier === 'Tier 1');
        const tier2 = classified.filter(k => k.tier === 'Tier 2');
        const tier3 = classified.filter(k => k.tier === 'Tier 3');

        console.log(`⚔️  Total Conquest Opportunities: ${classified.length}`);
        console.log(`🥇 Tier 1 (Elite): ${tier1.length} keywords`);
        console.log(`🥈 Tier 2 (Strong): ${tier2.length} keywords`);
        console.log(`🥉 Tier 3 (Good): ${tier3.length} keywords\n`);

        console.log('🎯 Top 10 Conquest Targets:');
        classified.slice(0, 10).forEach((kw, i) => {
            const compRank = Math.min(...kw.competitorRanks.filter(r => r));
            const yourRank = kw.yourRank || 'Not Ranking';
            const gap = kw.yourRank ? (kw.yourRank - compRank) : '100+';

            console.log(`\n${i + 1}. ${kw.keyword}`);
            console.log(`   Score: ${kw.opportunityScore} | Tier: ${kw.tier}`);
            console.log(`   Competitor: #${compRank} | You: ${yourRank} | Gap: ${gap}`);
            console.log(`   Volume: ${kw.searchVolume} | CPC: $${kw.estimatedCPC}`);
        });

        console.log('\n\n✅ Check Google Sheets for full conquest strategy!\n');
        console.log('https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

        db.close();

    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        console.error(error);
    }
}

analyzeCompetitors();
