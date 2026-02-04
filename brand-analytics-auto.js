/**
 * Automated Brand Analytics Workflow
 * Schedules automatic processing of Brand Analytics CSVs
 * Enriches keywords, scores them, syncs to Google Sheets
 */

require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const BrandAnalyticsParser = require('./src/titan/brand-analytics/csv-parser');
const KeywordEnricher = require('./src/titan/services/keyword-enricher');
const OpportunityScorer = require('./src/titan/scoring/opportunity-scorer');
const TierClassifier = require('./src/titan/scoring/tier-classifier');
const KeywordDatabase = require('./src/titan/database/keywords-db');
const SyncCoordinator = require('./src/titan/sync/sync-coordinator');

class AutomatedBrandAnalytics {
    constructor() {
        this.parser = new BrandAnalyticsParser();
        this.enricher = new KeywordEnricher();
        this.scorer = new OpportunityScorer();
        this.classifier = new TierClassifier();
        this.db = new KeywordDatabase();
        this.sync = new SyncCoordinator(this.db);

        this.csvDirectory = path.join(__dirname, 'docs');
        this.processedFiles = new Set();
    }

    /**
     * Process all CSV files in docs directory
     */
    async processAllCSVFiles() {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║  📊 AUTO BRAND ANALYTICS PROCESSOR         ║');
        console.log('║  Automatic Keyword Discovery & Sync        ║');
        console.log('╚════════════════════════════════════════════╝\n');

        try {
            // Find all Brand Analytics CSV files
            const files = fs.readdirSync(this.csvDirectory)
                .filter(f => f.includes('Top_search_terms') && f.endsWith('.csv'))
                .map(f => path.join(this.csvDirectory, f));

            if (files.length === 0) {
                console.log('❌ No Brand Analytics CSV files found in docs/');
                return;
            }

            console.log(`✅ Found ${files.length} Brand Analytics files\n`);

            // Parse all files
            const allTerms = [];
            for (const file of files) {
                const terms = await this.parser.parseCSV(file);
                allTerms.push(...terms);
            }

            // Deduplicate by search term (keep most recent)
            const uniqueTerms = new Map();
            for (const term of allTerms) {
                const existing = uniqueTerms.get(term.searchTerm);
                if (!existing || new Date(term.reportingDate) > new Date(existing.reportingDate)) {
                    uniqueTerms.set(term.searchTerm, term);
                }
            }

            console.log(`\n📊 Total unique search terms: ${uniqueTerms.size}\n`);

            // Analyze
            const analysis = this.parser.analyzeOpportunities(Array.from(uniqueTerms.values()));

            console.log('🎯 Analysis Results:');
            console.log(`   Conquest Targets: ${analysis.conquestTargets.length}`);
            console.log(`   Defend Positions: ${analysis.defendPositions.length}`);
            console.log(`   Avg Competitor Click Share: ${analysis.summary.avgCompetitorClickShare.toFixed(1)}%\n`);

            // Convert to keyword format
            const keywords = [];

            // Conquest targets (high priority)
            for (const target of analysis.conquestTargets) {
                keywords.push({
                    keyword: target.searchTerm,
                    searchVolume: null, // Will enrich
                    competition: null,
                    estimatedCPC: null,
                    yourRank: null,
                    competitorRanks: target.competitorASINs.map(c => c.position),
                    competitorASINs: target.competitorASINs.map(c => c.asin),
                    competitorClickShare: target.totalCompetitorClickShare,
                    competitorConversionShare: target.totalCompetitorConversionShare,
                    searchFrequencyRank: target.searchFrequencyRank,
                    source: 'brand_analytics_conquest',
                    reportingDate: target.reportingDate
                });
            }

            // Defend positions (medium priority)
            for (const defend of analysis.defendPositions) {
                keywords.push({
                    keyword: defend.searchTerm,
                    searchVolume: null,
                    competition: null,
                    estimatedCPC: null,
                    yourRank: defend.yourPosition,
                    yourClickShare: defend.yourClickShare,
                    yourConversionShare: defend.yourConversionShare,
                    searchFrequencyRank: defend.searchFrequencyRank,
                    source: 'brand_analytics_defend',
                    reportingDate: defend.reportingDate
                });
            }

            console.log(`\n📊 Enriching ${keywords.length} keywords with search data...\n`);

            // Enrich with DataForSEO (batch)
            const keywordList = keywords.map(k => k.keyword);
            const enriched = await this.enricher.enrichBatch(keywordList);

            // Merge enriched data
            const merged = enriched.map((kw, i) => ({
                ...kw,
                ...keywords[i],
                searchVolume: kw.searchVolume || keywords[i].searchVolume
            }));

            // Score with bonus for Brand Analytics data
            console.log('\n🎯 Scoring opportunities...\n');
            const scored = merged.map(kw => {
                const baseScore = this.scorer.scoreKeyword(kw);

                let bonusPoints = 0;

                // High competitor share = valuable
                if (kw.competitorClickShare > 30) bonusPoints += 10;
                else if (kw.competitorClickShare > 20) bonusPoints += 5;

                // High conversion share = very valuable
                if (kw.competitorConversionShare > 30) bonusPoints += 10;
                else if (kw.competitorConversionShare > 20) bonusPoints += 5;

                // Top search frequency = very popular
                if (kw.searchFrequencyRank < 10000) bonusPoints += 10;
                else if (kw.searchFrequencyRank < 50000) bonusPoints += 5;
                else if (kw.searchFrequencyRank < 100000) bonusPoints += 3;

                return {
                    ...baseScore,
                    opportunityScore: Math.min(100, baseScore.opportunityScore + bonusPoints),
                    bonusPoints
                };
            });

            // Classify
            console.log('🏆 Classifying into tiers...\n');
            const classified = this.classifier.classifyBatch(scored);

            // Save to database
            console.log('💾 Saving to database...\n');
            let saved = 0;
            for (const kw of classified) {
                if (this.db.addKeyword(kw)) saved++;
            }

            console.log(`✅ Saved ${saved} keywords\n`);

            // Sync to Google Sheets
            console.log('🔄 Syncing to Google Sheets...\n');
            await this.sync.pushToSheets();
            this.db.recordSync('push', saved, true);

            // Summary
            console.log('\n═══════════════════════════════════════════');
            console.log('📊 AUTO-SYNC COMPLETE');
            console.log('═══════════════════════════════════════════\n');

            const tier1 = classified.filter(k => k.tier === 'Tier 1');
            const tier2 = classified.filter(k => k.tier === 'Tier 2');
            const tier3 = classified.filter(k => k.tier === 'Tier 3');

            console.log(`⚔️  Total Keywords: ${classified.length}`);
            console.log(`🥇 Tier 1: ${tier1.length} keywords`);
            console.log(`🥈 Tier 2: ${tier2.length} keywords`);
            console.log(`🥉 Tier 3: ${tier3.length} keywords\n`);
            console.log(`🎯 Conquest Targets: ${analysis.conquestTargets.length}`);
            console.log(`🛡️  Defend Positions: ${analysis.defendPositions.length}\n`);

            console.log('✅ Google Sheets updated!\n');
            console.log('https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

            return classified;

        } catch (error) {
            console.error('❌ Auto-processing failed:', error.message);
            console.error(error);
        }
    }

    /**
     * Schedule automatic processing
     * Runs daily at 3 AM
     */
    scheduleAutoSync() {
        console.log('\n⏰ Scheduling automatic Brand Analytics processing...');
        console.log('   Schedule: Daily at 3:00 AM\n');

        // Run daily at 3 AM
        cron.schedule('0 3 * * *', async () => {
            console.log(`\n[${new Date().toISOString()}] Starting scheduled Brand Analytics sync...`);
            await this.processAllCSVFiles();
        });

        console.log('✅ Auto-sync scheduled! Add new CSV files to docs/ and they will be processed automatically.\n');
    }

    /**
     * Run manual sync now
     */
    async runNow() {
        return await this.processAllCSVFiles();
    }
}

// If run directly
if (require.main === module) {
    const auto = new AutomatedBrandAnalytics();

    const args = process.argv.slice(2);

    if (args.includes('--schedule')) {
        // Start scheduler
        auto.scheduleAutoSync();
        console.log('Press Ctrl+C to stop the scheduler.\n');
    } else {
        // Run once now
        auto.runNow().then(() => {
            process.exit(0);
        }).catch(err => {
            console.error(err);
            process.exit(1);
        });
    }
}

module.exports = AutomatedBrandAnalytics;
