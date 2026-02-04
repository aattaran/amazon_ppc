/**
 * Test Opportunity Scoring Engine
 * See the 5-dimensional scoring in action
 */

const OpportunityScorer = require('./src/titan/scoring/opportunity-scorer');
const TierClassifier = require('./src/titan/scoring/tier-classifier');

// Sample keywords with different characteristics
const sampleKeywords = [
    {
        keyword: 'dihydroberberine supplement',
        searchVolume: 2244,
        competition: 0.68,
        estimatedCPC: 1.85,
        yourRank: 23,
        competitorRanks: [1, 3, 5]
    },
    {
        keyword: 'dhb supplement',
        searchVolume: 1822,
        competition: 0.72,
        estimatedCPC: 1.92,
        yourRank: null, // Not ranking
        competitorRanks: [2, 4, 6]
    },
    {
        keyword: 'best berberine for blood sugar',
        searchVolume: 890,
        competition: 0.45,
        estimatedCPC: 1.45,
        yourRank: 45,
        competitorRanks: [1, 7, 12]
    },
    {
        keyword: 'berberine capsules 500mg',
        searchVolume: 1456,
        competition: 0.55,
        estimatedCPC: 1.28,
        yourRank: 18,
        competitorRanks: [3, 8, 15]
    },
    {
        keyword: 'what is berberine',
        searchVolume: 3200,
        competition: 0.25,
        estimatedCPC: 0.45,
        yourRank: 55,
        competitorRanks: [5, 12, 18]
    },
    {
        keyword: 'cheap berberine',
        searchVolume: 450,
        competition: 0.85,
        estimatedCPC: 2.15,
        yourRank: null,
        competitorRanks: [2, 5]
    },
    {
        keyword: 'berberine hcl pure',
        searchVolume: 678,
        competition: 0.40,
        estimatedCPC: 1.15,
        yourRank: 12,
        competitorRanks: [8, 15, 22]
    },
    {
        keyword: 'dhb 200mg capsules',
        searchVolume: 1100,
        competition: 0.60,
        estimatedCPC: 1.65,
        yourRank: null,
        competitorRanks: [1, 4]
    }
];

function testScoring() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  🎯 TITAN OPPORTUNITY SCORING ENGINE      ║');
    console.log('║  5-Dimensional Keyword Scoring System     ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Initialize services
    const scorer = new OpportunityScorer();
    const classifier = new TierClassifier();

    // Step 1: Score all keywords
    console.log('STEP 1: Scoring Keywords\n');
    const scoredKeywords = scorer.batchScore(sampleKeywords);

    // Step 2: Classify into tiers
    console.log('\nSTEP 2: Classifying into Tiers\n');
    const classifiedKeywords = classifier.classifyBatch(scoredKeywords);

    // Step 3: Show detailed breakdown for top 3
    console.log('\n' + '='.repeat(60));
    console.log('DETAILED BREAKDOWN - TOP 3 OPPORTUNITIES');
    console.log('='.repeat(60));

    classifiedKeywords.slice(0, 3).forEach((kw, index) => {
        console.log(`\n${index + 1}. ${kw.keyword.toUpperCase()}`);
        console.log('-'.repeat(60));
        scorer.explainScore(kw);
        console.log(`Tier: ${kw.tier}`);
        console.log(`Suggested Bid: $${kw.suggestedBid}`);
        console.log(`TOS Multiplier: ${kw.tosMultiplier}%`);
        console.log(`PP Multiplier: ${kw.ppMultiplier}%`);
        console.log(`Daily Budget: $${kw.dailyBudgetPerKeyword}`);
    });

    // Step 4: Show tier summary
    console.log('\n' + '='.repeat(60));
    console.log('TIER SUMMARY');
    console.log('='.repeat(60) + '\n');

    for (let i = 1; i <= 5; i++) {
        const tierName = `Tier ${i}`;
        const tierKeywords = classifier.getKeywordsByTier(classifiedKeywords, tierName);

        if (tierKeywords.length > 0) {
            console.log(`\n${tierName}:`);
            tierKeywords.forEach(kw => {
                console.log(`   • ${kw.keyword} (Score: ${kw.opportunityScore})`);
                console.log(`     Vol: ${kw.searchVolume} | Comp: ${(kw.competition * 100).toFixed(0)}% | CPC: $${kw.estimatedCPC} | Bid: $${kw.suggestedBid}`);
            });
        }
    }

    // Step 5: Deployment recommendations
    console.log('\n' + '='.repeat(60));
    console.log('DEPLOYMENT RECOMMENDATIONS');
    console.log('='.repeat(60) + '\n');

    const deployable = classifier.getDeployableKeywords(classifiedKeywords);
    const totalDailyBudget = deployable.reduce((sum, kw) => sum + kw.dailyBudgetPerKeyword, 0);
    const totalMonthlyBudget = totalDailyBudget * 30;

    console.log(`📊 Deployable Keywords: ${deployable.length}/${classifiedKeywords.length}`);
    console.log(`💰 Estimated Daily Budget: $${totalDailyBudget.toFixed(2)}`);
    console.log(`💰 Estimated Monthly Budget: $${totalMonthlyBudget.toFixed(2)}\n`);

    console.log('Recommended Actions:');
    console.log(`   ✅ Deploy ${classifier.getKeywordsByTier(classifiedKeywords, 'Tier 1').length} Tier 1 keywords immediately (high priority)`);
    console.log(`   ✅ Deploy ${classifier.getKeywordsByTier(classifiedKeywords, 'Tier 2').length} Tier 2 keywords (medium priority)`);
    console.log(`   ⚠️  Test ${classifier.getKeywordsByTier(classifiedKeywords, 'Tier 3').length} Tier 3 keywords with caution`);
    console.log(`   ⏸️  Hold ${classifier.getKeywordsByTier(classifiedKeywords, 'Tier 4').length} Tier 4 keywords for now`);
    console.log(`   ❌ Skip ${classifier.getKeywordsByTier(classifiedKeywords, 'Tier 5').length} Tier 5 keywords\n`);

    console.log('✨ Scoring Complete!\n');
}

// Run the test
testScoring();
