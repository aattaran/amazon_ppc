/**
 * Opportunity Scorer
 * Scores keywords 0-100 using 5-dimensional framework
 * 
 * Scoring Dimensions:
 * 1. Search Volume (0-25 points)
 * 2. Competition (0-20 points)
 * 3. Rank Gap (0-25 points)
 * 4. Intent Signal (0-15 points)
 * 5. Cost Efficiency (0-15 points)
 */

class OpportunityScorer {
    /**
     * Score a keyword based on all dimensions
     * @param {Object} keyword - Keyword object with metrics
     * @returns {Object} Scored keyword with breakdown
     */
    scoreKeyword(keyword) {
        const scores = {
            searchVolume: this.scoreSearchVolume(keyword.searchVolume || 0),
            competition: this.scoreCompetition(keyword.competition || 0),
            rankGap: this.scoreRankGap(keyword.yourRank, keyword.competitorRanks),
            intentSignal: this.scoreIntent(keyword.keyword),
            costEfficiency: this.scoreCostEfficiency(keyword.estimatedCPC || 0, keyword.searchVolume || 0)
        };

        const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

        return {
            ...keyword,
            opportunityScore: Math.round(totalScore),
            scoreBreakdown: scores
        };
    }

    /**
     * Dimension 1: Search Volume (0-25 points)
     * Higher volume = more opportunity
     */
    scoreSearchVolume(volume) {
        if (volume >= 2000) return 25;
        if (volume >= 1000) return 20;
        if (volume >= 500) return 15;
        if (volume >= 200) return 12;
        if (volume >= 100) return 10;
        if (volume >= 50) return 7;
        if (volume >= 20) return 5;
        return Math.min(volume / 5, 3);
    }

    /**
     * Dimension 2: Competition (0-20 points)
     * Lower competition = more opportunity (inverse scoring)
     */
    scoreCompetition(competition) {
        // competition is 0-1 from DataForSEO
        // 0 = no competition (best) = 20 points
        // 1 = max competition (worst) = 0 points
        return Math.round((1 - competition) * 20);
    }

    /**
     * Dimension 3: Rank Gap (0-25 points)
     * Bigger gap between you and competitor = more opportunity
     */
    scoreRankGap(yourRank, competitorRanks = []) {
        // If you're not ranking, assume position 100
        const effectiveYourRank = yourRank || 100;

        // Find best competitor rank (lowest number = highest position)
        const bestCompetitorRank = competitorRanks.length > 0
            ? Math.min(...competitorRanks.filter(r => r !== null && r !== undefined))
            : null;

        // If no competitor data, give moderate score
        if (!bestCompetitorRank) {
            return effectiveYourRank > 50 ? 15 : 10;
        }

        // Calculate gap (positive = you're behind, negative = you're ahead)
        const gap = effectiveYourRank - bestCompetitorRank;

        // Score based on gap size
        if (gap >= 50) return 25; // Massive opportunity - competitor dominates
        if (gap >= 30) return 22;
        if (gap >= 20) return 18;
        if (gap >= 10) return 15;
        if (gap >= 5) return 12;
        if (gap >= 0) return 8;  // Tied or slightly ahead
        if (gap >= -5) return 5;  // Slightly ahead of competitor
        if (gap >= -10) return 3; // You're ahead
        return 1; // You dominate (less conquest opportunity)
    }

    /**
     * Dimension 4: Intent Signal (0-15 points)
     * Buyer intent keywords score higher
     */
    scoreIntent(keyword) {
        const lowerKeyword = keyword.toLowerCase();

        // High buyer intent signals
        const highIntentPatterns = [
            'buy', 'purchase', 'order', 'shop',
            'best', 'top rated', 'reviews', 'compare',
            'cheap', 'discount', 'deal', 'price',
            'supplement', 'capsules', 'pills', 'tablets',
            'mg', 'dose', 'dosage',
            'organic', 'natural', 'pure',
            'brand name (e.g., specific supplement brands)'
        ];

        // Low intent (informational) signals  
        const lowIntentPatterns = [
            'what is', 'how to', 'why',
            'benefits', 'side effects', 'risks',
            'vs', 'difference',
            'wikipedia', 'definition',
            'research', 'studies', 'clinical'
        ];

        // Negative keywords (not relevant)
        const negativePatterns = [
            'free', 'diy', 'homemade',
            'recipe', 'make your own'
        ];

        // Check for negative patterns first
        if (negativePatterns.some(pattern => lowerKeyword.includes(pattern))) {
            return 0;
        }

        // Check for low intent
        if (lowIntentPatterns.some(pattern => lowerKeyword.includes(pattern))) {
            return 5;
        }

        // Check for high intent
        if (highIntentPatterns.some(pattern => lowerKeyword.includes(pattern))) {
            return 15;
        }

        // Neutral/moderate intent
        return 10;
    }

    /**
     * Dimension 5: Cost Efficiency (0-15 points)
     * High volume + low CPC = high efficiency
     */
    scoreCostEfficiency(cpc, volume) {
        if (cpc === 0 || volume === 0) return 5; // No data, give neutral score

        // Calculate efficiency ratio (searches per dollar)
        const efficiency = volume / cpc;

        if (efficiency >= 2000) return 15;
        if (efficiency >= 1500) return 13;
        if (efficiency >= 1000) return 11;
        if (efficiency >= 750) return 9;
        if (efficiency >= 500) return 7;
        if (efficiency >= 250) return 5;
        if (efficiency >= 100) return 3;
        return 1;
    }

    /**
     * Batch score multiple keywords
     * @param {Array} keywords - Array of keyword objects
     * @returns {Array} Scored keywords
     */
    batchScore(keywords) {
        console.log(`\n🎯 Scoring ${keywords.length} keywords...\n`);

        const scored = keywords.map(kw => this.scoreKeyword(kw));

        // Sort by score descending
        scored.sort((a, b) => b.opportunityScore - a.opportunityScore);

        // Statistics
        const avgScore = scored.reduce((sum, kw) => sum + kw.opportunityScore, 0) / scored.length;
        const maxScore = scored[0]?.opportunityScore || 0;
        const minScore = scored[scored.length - 1]?.opportunityScore || 0;

        const tier1Count = scored.filter(kw => kw.opportunityScore >= 80).length;
        const tier2Count = scored.filter(kw => kw.opportunityScore >= 60 && kw.opportunityScore < 80).length;
        const tier3Count = scored.filter(kw => kw.opportunityScore >= 40 && kw.opportunityScore < 60).length;

        console.log('📊 Scoring Summary:');
        console.log(`   Total Keywords: ${scored.length}`);
        console.log(`   Average Score: ${avgScore.toFixed(1)}`);
        console.log(`   Max Score: ${maxScore}`);
        console.log(`   Min Score: ${minScore}`);
        console.log(`   Tier 1 (80-100): ${tier1Count} keywords`);
        console.log(`   Tier 2 (60-79): ${tier2Count} keywords`);
        console.log(`   Tier 3 (40-59): ${tier3Count} keywords\n`);

        return scored;
    }

    /**
     * Get top opportunities
     * @param {Array} keywords - Scored keywords
     * @param {number} limit - Max results
     * @returns {Array} Top scoring keywords
     */
    getTopOpportunities(keywords, limit = 100) {
        return keywords
            .sort((a, b) => b.opportunityScore - a.opportunityScore)
            .slice(0, limit);
    }

    /**
     * Explain scoring for a keyword
     * @param {Object} keyword - Keyword to explain
     */
    explainScore(keyword) {
        const scored = this.scoreKeyword(keyword);

        console.log(`\n📊 Score Breakdown for "${scored.keyword}"`);
        console.log(`\nTotal Score: ${scored.opportunityScore}/100\n`);
        console.log('Dimensions:');
        console.log(`  🔍 Search Volume (${scored.searchVolume}): ${scored.scoreBreakdown.searchVolume}/25 pts`);
        console.log(`  ⚔️  Competition (${(scored.competition || 0).toFixed(2)}): ${scored.scoreBreakdown.competition}/20 pts`);
        console.log(`  📈 Rank Gap (You: ${scored.yourRank || 'NR'}, Comp: ${scored.competitorRanks?.join(',') || 'N/A'}): ${scored.scoreBreakdown.rankGap}/25 pts`);
        console.log(`  🎯 Intent Signal: ${scored.scoreBreakdown.intentSignal}/15 pts`);
        console.log(`  💰 Cost Efficiency ($${scored.estimatedCPC}/${scored.searchVolume}): ${scored.scoreBreakdown.costEfficiency}/15 pts`);
        console.log('');

        return scored;
    }
}

module.exports = OpportunityScorer;
