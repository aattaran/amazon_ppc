/**
 * Titan Discovery Pipeline
 * End-to-end keyword discovery, scoring, and deployment system
 * 
 * Usage:
 *   node titan-discover.js --keywords "berberine,dhb supplement"
 *   node titan-discover.js --expand "berberine" --limit 1000
 *   node titan-discover.js --file keywords.txt
 */

require('dotenv').config();
const KeywordEnricher = require('./src/titan/services/keyword-enricher');
const OpportunityScorer = require('./src/titan/scoring/opportunity-scorer');
const TierClassifier = require('./src/titan/scoring/tier-classifier');
const KeywordDatabase = require('./src/titan/database/keywords-db');
const SyncCoordinator = require('./src/titan/sync/sync-coordinator');
const fs = require('fs');

class TitanPipeline {
    constructor() {
        this.enricher = new KeywordEnricher();
        this.scorer = new OpportunityScorer();
        this.classifier = new TierClassifier();
        this.db = new KeywordDatabase();
        this.sync = new SyncCoordinator(this.db);
    }

    /**
     * Run complete discovery pipeline
     * @param {Array<string>} keywords - Raw keywords to process
     * @param {Object} options - Pipeline options
     */
    async discover(keywords, options = {}) {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║     🚀 TITAN DISCOVERY PIPELINE           ║');
        console.log('║     Conquer Your Competitors              ║');
        console.log('╚════════════════════════════════════════════╝\n');

        const startTime = Date.now();

        try {
            // Step 1: Validate input
            if (!keywords || keywords.length === 0) {
                throw new Error('No keywords provided');
            }

            console.log(`📋 Input: ${keywords.length} keywords\n`);

            // Step 2: Expand keywords if requested
            let allKeywords = keywords;
            if (options.expand) {
                console.log('💡 STEP 1: Expanding Keywords...\n');
                const expandedKeywords = await this.enricher.expandKeywords(
                    keywords,
                    options.expandLimit || 100
                );
                allKeywords = expandedKeywords.map(kw => kw.keyword);
                console.log(`✅ Expanded to ${allKeywords.length} keywords\n`);
            }

            // Step 3: Enrich with DataForSEO
            console.log('📊 STEP 2: Enriching with DataForSEO...\n');
            const enriched = await this.enricher.enrichBatch(allKeywords, 100);
            console.log(`✅ Enriched ${enriched.length} keywords\n`);

            // Step 4: Score opportunities
            console.log('🎯 STEP 3: Scoring Opportunities...\n');
            const scored = this.scorer.batchScore(enriched);
            console.log(`✅ Scored ${scored.length} keywords\n`);

            // Step 5: Classify into tiers
            console.log('🏆 STEP 4: Classifying into Tiers...\n');
            const classified = this.classifier.classifyBatch(scored);
            console.log(`✅ Classified ${classified.length} keywords\n`);

            // Step 6: Save to database
            console.log('💾 STEP 5: Saving to Database...\n');
            let savedCount = 0;
            for (const kw of classified) {
                if (this.db.addKeyword(kw)) {
                    savedCount++;
                }
            }
            console.log(`✅ Saved ${savedCount} keywords to database\n`);

            // Step 7: Sync to Google Sheets (if enabled)
            if (!options.skipSync) {
                console.log('🔄 STEP 6: Syncing to Google Sheets...\n');
                await this.sync.pushToSheets();
                this.db.recordSync('push', savedCount, true);
                console.log(`✅ Synced to Google Sheets\n`);
            }

            // Step 8: Generate summary
            const summary = this.generateSummary(classified, startTime);
            this.displaySummary(summary);

            // Step 9: Show recommendations
            this.showRecommendations(classified);

            return {
                success: true,
                summary
            };

        } catch (error) {
            console.error('\n❌ Pipeline failed:', error.message);
            console.error(error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate pipeline summary
     */
    generateSummary(keywords, startTime) {
        const stats = {
            totalKeywords: keywords.length,
            executionTime: ((Date.now() - startTime) / 1000).toFixed(1),
            byTier: {},
            byStatus: {},
            topKeywords: keywords.slice(0, 10),
            avgScore: keywords.reduce((sum, kw) => sum + kw.opportunityScore, 0) / keywords.length,
            deployable: keywords.filter(kw =>
                kw.tier === 'Tier 1' || kw.tier === 'Tier 2' || kw.tier === 'Tier 3'
            ).length
        };

        // Count by tier
        for (let i = 1; i <= 5; i++) {
            const tierName = `Tier ${i}`;
            stats.byTier[tierName] = keywords.filter(kw => kw.tier === tierName).length;
        }

        // Estimated budget
        stats.estimatedDailyBudget = keywords.reduce((sum, kw) =>
            sum + (kw.dailyBudgetPerKeyword || 0), 0
        );
        stats.estimatedMonthlyBudget = stats.estimatedDailyBudget * 30;

        return stats;
    }

    /**
     * Display summary
     */
    displaySummary(summary) {
        console.log('\n' + '═'.repeat(60));
        console.log('📊 DISCOVERY SUMMARY');
        console.log('═'.repeat(60) + '\n');

        console.log(`⏱️  Execution Time: ${summary.executionTime}s`);
        console.log(`📝 Total Keywords Discovered: ${summary.totalKeywords}`);
        console.log(`📈 Average Opportunity Score: ${summary.avgScore.toFixed(1)}/100`);
        console.log(`🚀 Deployable Keywords: ${summary.deployable} (${((summary.deployable / summary.totalKeywords) * 100).toFixed(0)}%)\n`);

        console.log('🏆 Distribution by Tier:');
        Object.entries(summary.byTier).forEach(([tier, count]) => {
            const percentage = ((count / summary.totalKeywords) * 100).toFixed(0);
            console.log(`   ${tier}: ${count} keywords (${percentage}%)`);
        });

        console.log(`\n💰 Estimated Budget:`);
        console.log(`   Daily: $${summary.estimatedDailyBudget.toFixed(2)}`);
        console.log(`   Monthly: $${summary.estimatedMonthlyBudget.toFixed(2)}\n`);

        console.log('⭐ Top 10 Opportunities:');
        summary.topKeywords.forEach((kw, i) => {
            console.log(`   ${i + 1}. ${kw.keyword}`);
            console.log(`      Score: ${kw.opportunityScore}/100 | Tier: ${kw.tier} | Vol: ${kw.searchVolume} | Bid: $${kw.suggestedBid}`);
        });

        console.log('\n' + '═'.repeat(60));
    }

    /**
     * Show deployment recommendations
     */
    showRecommendations(keywords) {
        console.log('\n💡 RECOMMENDATIONS\n');

        const tier1 = keywords.filter(kw => kw.tier === 'Tier 1');
        const tier2 = keywords.filter(kw => kw.tier === 'Tier 2');
        const tier3 = keywords.filter(kw => kw.tier === 'Tier 3');

        if (tier1.length > 0) {
            console.log(`✅ IMMEDIATE ACTION: Deploy ${tier1.length} Tier 1 keywords`);
            console.log(`   These are elite opportunities - high volume, low competition`);
            console.log(`   Recommended budget: $${(tier1.length * 50).toFixed(2)}/day\n`);
        }

        if (tier2.length > 0) {
            console.log(`✅ NEXT: Deploy ${tier2.length} Tier 2 keywords`);
            console.log(`   Strong opportunities worth targeting`);
            console.log(`   Recommended budget: $${(tier2.length * 30).toFixed(2)}/day\n`);
        }

        if (tier3.length > 0) {
            console.log(`⚠️  CONSIDER: Test ${tier3.length} Tier 3 keywords`);
            console.log(`   Good opportunities but proceed cautiously`);
            console.log(`   Recommended budget: $${(tier3.length * 15).toFixed(2)}/day\n`);
        }

        console.log('📋 Next Steps:');
        console.log('   1. Review keywords in Google Sheets');
        console.log('   2. Adjust bids for top performers');
        console.log('   3. Mark keywords as "Ready" to deploy');
        console.log('   4. Run sync to update database');
        console.log('   5. Deploy campaigns to Amazon Ads\n');
    }

    /**
     * Run from seed keywords with expansion
     */
    async discoverFromSeeds(seedKeywords, expandLimit = 1000) {
        return this.discover(seedKeywords, {
            expand: true,
            expandLimit: expandLimit
        });
    }

    /**
     * Run from file
     */
    async discoverFromFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const keywords = content.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));

        return this.discover(keywords);
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const pipeline = new TitanPipeline();

    // Parse arguments
    let keywords = [];
    let options = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--keywords' && args[i + 1]) {
            keywords = args[i + 1].split(',').map(k => k.trim());
            i++;
        } else if (arg === '--expand' && args[i + 1]) {
            keywords = args[i + 1].split(',').map(k => k.trim());
            options.expand = true;
            i++;
        } else if (arg === '--limit' && args[i + 1]) {
            options.expandLimit = parseInt(args[i + 1]);
            i++;
        } else if (arg === '--file' && args[i + 1]) {
            const content = fs.readFileSync(args[i + 1], 'utf-8');
            keywords = content.split('\n').map(k => k.trim()).filter(k => k);
            i++;
        } else if (arg === '--skip-sync') {
            options.skipSync = true;
        }
    }

    // Show usage if no keywords
    if (keywords.length === 0) {
        console.log('\n🚀 Titan Discovery Pipeline\n');
        console.log('Usage:');
        console.log('  node titan-discover.js --keywords "keyword1,keyword2,keyword3"');
        console.log('  node titan-discover.js --expand "seed keyword" --limit 1000');
        console.log('  node titan-discover.js --file keywords.txt');
        console.log('  node titan-discover.js --keywords "kw1,kw2" --skip-sync\n');
        console.log('Examples:');
        console.log('  node titan-discover.js --keywords "berberine,dhb supplement"');
        console.log('  node titan-discover.js --expand "berberine" --limit 500');
        console.log('  node titan-discover.js --file my-keywords.txt\n');
        process.exit(0);
    }

    // Run pipeline
    const result = await pipeline.discover(keywords, options);

    if (result.success) {
        console.log('✨ Pipeline completed successfully!\n');
        process.exit(0);
    } else {
        console.error('❌ Pipeline failed\n');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = TitanPipeline;
