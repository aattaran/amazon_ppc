/**
 * Tier Classifier
 * Classifies keywords into tiers based on opportunity score
 * Each tier has different budget allocation and bidding strategy
 */

class TierClassifier {
    constructor() {
        // Tier thresholds
        this.thresholds = {
            tier1: 80,  // Elite opportunities
            tier2: 60,  // Strong opportunities
            tier3: 40,  // Good opportunities
            tier4: 20,  // Moderate opportunities
            tier5: 0    // Low opportunities
        };

        // Bidding strategies per tier
        this.strategies = {
            'Tier 1': {
                name: 'Elite - Aggressive',
                tosMultiplier: 200,      // 200% top of search bid
                ppMultiplier: 100,       // 100% product pages bid
                aggressive: true,
                dailyBudgetPerKeyword: 50,
                description: 'Highest potential - dominate these keywords'
            },
            'Tier 2': {
                name: 'Strong - Moderate',
                tosMultiplier: 150,
                ppMultiplier: 75,
                aggressive: false,
                dailyBudgetPerKeyword: 30,
                description: 'Strong opportunities - competitive bidding'
            },
            'Tier 3': {
                name: 'Good - Conservative',
                tosMultiplier: 100,
                ppMultiplier: 50,
                aggressive: false,
                dailyBudgetPerKeyword: 15,
                description: 'Solid opportunities - moderate bidding'
            },
            'Tier 4': {
                name: 'Moderate - Minimal',
                tosMultiplier: 50,
                ppMultiplier: 25,
                aggressive: false,
                dailyBudgetPerKeyword: 5,
                description: 'Test these with minimal budget'
            },
            'Tier 5': {
                name: 'Low - Watch List',
                tosMultiplier: 0,
                ppMultiplier: 0,
                aggressive: false,
                dailyBudgetPerKeyword: 0,
                description: 'Monitor only - do not deploy'
            }
        };
    }

    /**
     * Classify a keyword into a tier based on score
     * @param {number} score - Opportunity score (0-100)
     * @returns {string} Tier name
     */
    classify(score) {
        if (score >= this.thresholds.tier1) return 'Tier 1';
        if (score >= this.thresholds.tier2) return 'Tier 2';
        if (score >= this.thresholds.tier3) return 'Tier 3';
        if (score >= this.thresholds.tier4) return 'Tier 4';
        return 'Tier 5';
    }

    /**
     * Get bidding strategy for a tier
     * @param {string} tier - Tier name (e.g., 'Tier 1')
     * @returns {Object} Strategy configuration
     */
    getStrategy(tier) {
        return this.strategies[tier] || this.strategies['Tier 5'];
    }

    /**
     * Calculate suggested bid for a keyword
     * @param {Object} keyword - Keyword with tier and CPC
     * @returns {number} Suggested bid
     */
    calculateBid(keyword) {
        const strategy = this.getStrategy(keyword.tier);
        const baseCPC = keyword.estimatedCPC || 0;

        if (baseCPC === 0) return 0;

        // Use 85% of estimated CPC as base bid
        const baseBid = baseCPC * 0.85;

        // Don't apply multipliers, just return base bid
        // Multipliers are for Amazon's dynamic bidding adjustments
        return parseFloat(baseBid.toFixed(2));
    }

    /**
     * Add tier classification to keywords
     * @param {Array} keywords - Keywords with opportunity scores
     * @returns {Array} Keywords with tier and strategy
     */
    classifyBatch(keywords) {
        console.log(`\n🏆 Classifying ${keywords.length} keywords into tiers...\n`);

        const classified = keywords.map(kw => {
            const tier = this.classify(kw.opportunityScore || 0);
            const strategy = this.getStrategy(tier);

            return {
                ...kw,
                tier: tier,
                tosMultiplier: strategy.tosMultiplier,
                ppMultiplier: strategy.ppMultiplier,
                suggestedBid: this.calculateBid({ ...kw, tier }),
                dailyBudgetPerKeyword: strategy.dailyBudgetPerKeyword
            };
        });

        // Statistics by tier
        const tierCounts = {};
        const tierBudgets = {};

        for (let i = 1; i <= 5; i++) {
            const tierName = `Tier ${i}`;
            const tierKeywords = classified.filter(kw => kw.tier === tierName);
            tierCounts[tierName] = tierKeywords.length;
            tierBudgets[tierName] = tierKeywords.reduce((sum, kw) =>
                sum + (kw.dailyBudgetPerKeyword || 0), 0
            );
        }

        console.log('📊 Classification Summary:');
        for (let i = 1; i <= 5; i++) {
            const tierName = `Tier ${i}`;
            const strategy = this.strategies[tierName];
            console.log(`\n   ${tierName} - ${strategy.name}`);
            console.log(`   Keywords: ${tierCounts[tierName]}`);
            console.log(`   Daily Budget: $${tierBudgets[tierName].toFixed(2)}`);
            console.log(`   Strategy: TOS ${strategy.tosMultiplier}%, PP ${strategy.ppMultiplier}%`);
        }

        const totalBudget = Object.values(tierBudgets).reduce((a, b) => a + b, 0);
        console.log(`\n   💰 Total Daily Budget: $${totalBudget.toFixed(2)}\n`);

        return classified;
    }

    /**
     * Get keywords by tier
     * @param {Array} keywords - Classified keywords
     * @param {string} tier - Tier to filter by
     * @returns {Array} Keywords in that tier
     */
    getKeywordsByTier(keywords, tier) {
        return keywords.filter(kw => kw.tier === tier);
    }

    /**
     * Get deployment-ready keywords (Tier 1-3)
     * @param {Array} keywords - Classified keywords
     * @returns {Array} Keywords ready to deploy
     */
    getDeployableKeywords(keywords) {
        return keywords.filter(kw =>
            kw.tier === 'Tier 1' ||
            kw.tier === 'Tier 2' ||
            kw.tier === 'Tier 3'
        );
    }

    /**
     * Recommend match types based on tier
     * @param {string} tier - Tier name
     * @returns {Array<string>} Recommended match types
     */
    getRecommendedMatchTypes(tier) {
        switch (tier) {
            case 'Tier 1':
                return ['EXACT', 'PHRASE']; // Precise targeting for elite keywords
            case 'Tier 2':
                return ['PHRASE', 'EXACT'];
            case 'Tier 3':
                return ['PHRASE', 'BROAD']; // Some exploration
            case 'Tier 4':
                return ['BROAD'];           // Maximum discovery
            default:
                return [];
        }
    }
}

module.exports = TierClassifier;
