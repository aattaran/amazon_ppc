/**
 * Brand Analytics Parser
 * Parse Amazon Brand Analytics Search Term data to find conquest opportunities
 */

require('dotenv').config();
const KeywordEnricher = require('./src/titan/services/keyword-enricher');
const OpportunityScorer = require('./src/titan/scoring/opportunity-scorer');
const TierClassifier = require('./src/titan/scoring/tier-classifier');
const KeywordDatabase = require('./src/titan/database/keywords-db');
const SyncCoordinator = require('./src/titan/sync/sync-coordinator');

// Your ASIN
const YOUR_ASIN = 'B0DTDZFMY7';

// Real Brand Analytics data from Amazon
const BRAND_ANALYTICS_DATA = [
    {
        searchTerm: 'dihydroberberine',
        searchFrequencyRank: 73890,
        topASINs: [
            { asin: 'B0D4RMJ8NB', brand: 'Nutricost', clickShare: 17.33, conversionShare: 16.41 },
            { asin: 'B0CNS2PBHX', brand: 'Double Wood Supplements', clickShare: 16.44, conversionShare: 14.44 },
            { asin: 'B0DJ7XMLXQ', brand: 'HealMeal', clickShare: 9.38, conversionShare: 4.04 }
        ]
    },
    {
        searchTerm: 'dihydroberberine supplement',
        searchFrequencyRank: 316086,
        topASINs: [
            { asin: 'B0CNS2PBHX', brand: 'Double Wood Supplements', clickShare: 13.53, conversionShare: 10.49 },
            { asin: 'B0FGNRSYCF', brand: 'Unknown', clickShare: 10.19, conversionShare: 10.49 },
            { asin: 'B0DJ7XMLXQ', brand: 'HealMeal', clickShare: 9.25, conversionShare: 5.57 }
        ]
    },
    {
        searchTerm: 'dihydroberberine 200mg',
        searchFrequencyRank: 704965,
        topASINs: [
            { asin: 'B0D4RMJ8NB', brand: 'Nutricost', clickShare: 15.44, conversionShare: 25 },
            { asin: 'B0CWC6F56X', brand: "NATURE'S FUSIONS", clickShare: 9.42, conversionShare: 8.33 },
            { asin: 'B0CNS2PBHX', brand: 'Double Wood Supplements', clickShare: 8.85, conversionShare: 3.33 }
        ]
    },
    {
        searchTerm: 'dihydroberberine 500mg',
        searchFrequencyRank: 1448955,
        topASINs: [
            { asin: 'B0DDMM94BF', brand: 'NATUREBELL', clickShare: 31.27, conversionShare: 31.34 },
            { asin: 'B0DCZPTMLX', brand: 'VINATURA', clickShare: 12.36, conversionShare: 11.94 },
            { asin: 'B0FGNRSYCF', brand: 'Unknown', clickShare: 10.42, conversionShare: 11.94 }
        ]
    }
];

async function analyzeBrandAnalytics() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  📊 BRAND ANALYTICS CONQUEST ANALYZER     ║');
    console.log('║  Real Amazon Search Term Data             ║');
    console.log('╚════════════════════════════════════════════╝\n');

    console.log(`🎯 Your ASIN: ${YOUR_ASIN}`);
    console.log(`📊 Analyzing ${BRAND_ANALYTICS_DATA.length} search terms\n`);

    const db = new KeywordDatabase();
    const scorer = new OpportunityScorer();
    const classifier = new TierClassifier();
    const enricher = new KeywordEnricher();

    const conquestOpportunities = [];

    try {
        // Analyze each search term
        for (const term of BRAND_ANALYTICS_DATA) {
            console.log(`\n📊 "${term.searchTerm}"`);
            console.log(`   Search Frequency Rank: #${term.searchFrequencyRank.toLocaleString()}`);

            // Check if YOUR ASIN is in top 3
            const yourPosition = term.topASINs.findIndex(a => a.asin === YOUR_ASIN);
            const isInTop3 = yourPosition !== -1;

            if (isInTop3) {
                console.log(`   ✅ You're in top 3! Position #${yourPosition + 1}`);
                console.log(`      Your click share: ${term.topASINs[yourPosition].clickShare}%`);
                console.log(`      Your conversion share: ${term.topASINs[yourPosition].conversionShare}%`);
            } else {
                console.log(`   ❌ NOT in top 3 - CONQUEST OPPORTUNITY!`);
            }

            console.log(`\n   Top 3 Competitors:`);
            term.topASINs.forEach((asin, i) => {
                const isYou = asin.asin === YOUR_ASIN;
                const marker = isYou ? '👉 YOU' : '';
                console.log(`      ${i + 1}. ${asin.brand} (${asin.asin}) ${marker}`);
                console.log(`         Click: ${asin.clickShare}% | Conv: ${asin.conversionShare}%`);
            });

            // Calculate opportunity metrics
            const totalCompetitorClickShare = term.topASINs
                .filter(a => a.asin !== YOUR_ASIN)
                .reduce((sum, a) => sum + a.clickShare, 0);

            const totalCompetitorConversionShare = term.topASINs
                .filter(a => a.asin !== YOUR_ASIN)
                .reduce((sum, a) => sum + a.conversionShare, 0);

            // Get competitor ASINs
            const competitorASINs = term.topASINs
                .filter(a => a.asin !== YOUR_ASIN)
                .map(a => a.asin);

            // Create keyword object
            const keyword = {
                keyword: term.searchTerm,
                searchVolume: null, // Will enrich
                competition: null,
                estimatedCPC: null,
                yourRank: isInTop3 ? yourPosition + 1 : null,
                competitorRanks: [1, 2, 3].filter(r => !isInTop3 || r !== yourPosition + 1),
                competitorASINs: competitorASINs,
                competitorClickShare: totalCompetitorClickShare,
                competitorConversionShare: totalCompetitorConversionShare,
                yourClickShare: isInTop3 ? term.topASINs[yourPosition].clickShare : 0,
                yourConversionShare: isInTop3 ? term.topASINs[yourPosition].conversionShare : 0,
                searchFrequencyRank: term.searchFrequencyRank,
                source: 'brand_analytics'
            };

            conquestOpportunities.push(keyword);
        }

        console.log(`\n\n✅ Found ${conquestOpportunities.length} keywords in Brand Analytics\n`);

        // Enrich with DataForSEO
        console.log('📊 Enriching with search volume and competition data...\n');
        const keywords = conquestOpportunities.map(k => k.keyword);
        const enriched = await enricher.enrichBatch(keywords);

        // Merge enriched data with Brand Analytics data
        const merged = enriched.map((kw, i) => ({
            ...kw,
            ...conquestOpportunities[i],
            searchVolume: kw.searchVolume || conquestOpportunities[i].searchVolume
        }));

        // Score opportunities (with bonus for Brand Analytics data)
        console.log('\n🎯 Scoring conquest opportunities...\n');
        const scored = merged.map(kw => {
            const baseScore = scorer.scoreKeyword(kw);

            // Bonus points for high competitor click/conversion share
            let bonusPoints = 0;

            // If competitors have high click share, it's valuable
            if (kw.competitorClickShare > 30) bonusPoints += 5;
            else if (kw.competitorClickShare > 20) bonusPoints += 3;

            // If competitors have high conversion share, it's VERY valuable
            if (kw.competitorConversionShare > 30) bonusPoints += 5;
            else if (kw.competitorConversionShare > 20) bonusPoints += 3;

            // If search frequency rank is <100k (very popular), bonus
            if (kw.searchFrequencyRank < 100000) bonusPoints += 5;
            else if (kw.searchFrequencyRank < 500000) bonusPoints += 3;

            return {
                ...baseScore,
                opportunityScore: Math.min(100, baseScore.opportunityScore + bonusPoints),
                bonusPoints: bonusPoints
            };
        });

        // Classify
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
        console.log('📊 BRAND ANALYTICS CONQUEST SUMMARY');
        console.log('═══════════════════════════════════════════\n');

        const tier1 = classified.filter(k => k.tier === 'Tier 1');
        const tier2 = classified.filter(k => k.tier === 'Tier 2');
        const tier3 = classified.filter(k => k.tier === 'Tier 3');

        console.log(`⚔️  Total Keywords Analyzed: ${classified.length}`);
        console.log(`🥇 Tier 1 (Elite): ${tier1.length} keywords`);
        console.log(`🥈 Tier 2 (Strong): ${tier2.length} keywords`);
        console.log(`🥉 Tier 3 (Good): ${tier3.length} keywords\n`);

        console.log('🎯 Conquest Analysis:\n');
        classified.forEach((kw, i) => {
            const inTop3 = kw.yourRank && kw.yourRank <= 3;
            const status = inTop3 ? '✅ IN TOP 3' : '❌ CONQUEST TARGET';

            console.log(`${i + 1}. ${kw.keyword}`);
            console.log(`   ${status} | Score: ${kw.opportunityScore} | Tier: ${kw.tier}`);
            if (kw.bonusPoints) console.log(`   Bonus: +${kw.bonusPoints} points (from Brand Analytics)`);
            console.log(`   Competitor Click Share: ${kw.competitorClickShare?.toFixed(1)}%`);
            console.log(`   Competitor Conv Share: ${kw.competitorConversionShare?.toFixed(1)}%`);
            console.log(`   Search Rank: #${kw.searchFrequencyRank?.toLocaleString()}`);
            if (kw.searchVolume) console.log(`   Volume: ${kw.searchVolume} | CPC: $${kw.estimatedCPC}`);
            console.log('');
        });

        console.log('\n💡 STRATEGY RECOMMENDATIONS:\n');

        const notInTop3 = classified.filter(k => !k.yourRank || k.yourRank > 3);

        if (notInTop3.length > 0) {
            console.log(`🎯 CONQUEST: ${notInTop3.length} keywords where competitors dominate`);
            console.log(`   These are your PRIMARY targets - competitors are winning here`);
            console.log(`   Deploy aggressive PPC campaigns to steal their traffic\n`);
        }

        const inTop3 = classified.filter(k => k.yourRank && k.yourRank <= 3);
        if (inTop3.length > 0) {
            console.log(`✅ DEFEND: ${inTop3.length} keywords where you're already in top 3`);
            console.log(`   Maintain your position, optimize for higher click/conversion share\n`);
        }

        console.log('📋 Next Steps:');
        console.log('   1. Review all keywords in Google Sheets');
        console.log('   2. Focus budget on conquest targets (not in top 3)');
        console.log('   3. Set aggressive bids to break into top 3');
        console.log('   4. Monitor click/conversion share weekly');
        console.log('   5. Add more Brand Analytics data for more keywords\n');

        console.log('✅ Check Google Sheets for full strategy!\n');
        console.log('https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

        db.close();

    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        console.error(error);
    }
}

analyzeBrandAnalytics();
