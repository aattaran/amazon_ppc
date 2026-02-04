/**
 * Sheet Documentation & Setup
 * Adds comprehensive documentation to all Google Sheets tabs
 * Creates competitor tracking sheet
 * Explains tier criteria and how to use each sheet
 */

require('dotenv').config();
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

class SheetDocumentation {
    constructor() {
        this.sheetsService = new UnifiedSheetsService();
    }

    /**
     * Add documentation header to a sheet
     */
    async addSheetDocumentation(sheetName, documentation) {
        const { title, description, howToUse, criteria, filterTips } = documentation;

        // Create documentation rows
        const docRows = [
            [`📊 ${title}`],
            [''],
            ['WHAT THIS SHOWS:'],
            [description],
            [''],
            ['HOW TO USE:'],
            [howToUse],
            ['']
        ];

        if (criteria) {
            docRows.push(['CRITERIA:'], [criteria], ['']);
        }

        if (filterTips) {
            docRows.push(['💡 QUICK FILTERS:'], [filterTips], [''], ['═'.repeat(100)], ['']);
        }

        // Insert at the top
        await this.sheetsService.insertRowsAt(sheetName, 0, docRows);
    }

    /**
     * Create Competitors sheet
     */
    async createCompetitorsSheet() {
        const sheetName = 'Competitors';

        // Ensure sheet exists
        await this.sheetsService.ensureSheet(sheetName);
        await this.sheetsService.clearSheet(sheetName);

        const header = [
            'ASIN',
            'Brand',
            'Product Title',
            'Keywords They Rank For',
            'Avg Position',
            'Est. Monthly Search Volume',
            'Click Share %',
            'Conversion Share %',
            'Our Strategy',
            'Status'
        ];

        await this.sheetsService.writeRows(sheetName, [header]);

        console.log(`✅ Created "${sheetName}" sheet\n`);
    }

    /**
     * Add Tier Criteria sheet
     */
    async createTierCriteriaSheet() {
        const sheetName = 'Tier Criteria';

        await this.sheetsService.ensureSheet(sheetName);
        await this.sheetsService.clearSheet(sheetName);

        const rows = [
            ['🏆 KEYWORD TIER SYSTEM'],
            [''],
            ['Tier', 'Score Range', 'Criteria', 'What It Means', 'Action'],
            [''],
            [
                'Tier 1',
                '80-100',
                '• High search volume (>10,000)\n• Low-med competition\n• Strong intent (buy, best, review)\n• Good CPC (<$2)',
                'WINNERS - Highest ROI potential',
                'Deploy IMMEDIATELY with aggressive bids'
            ],
            [''],
            [
                'Tier 2',
                '60-79',
                '• Medium search volume (1,000-10,000)\n• Medium competition\n• Moderate intent\n• Decent CPC ($2-$5)',
                'SOLID - Good ROI with optimization',
                'Test with moderate bids, optimize weekly'
            ],
            [''],
            [
                'Tier 3',
                '0-59',
                '• Low volume (<1,000)\n• High competition OR\n• Weak intent (generic terms)\n• High CPC (>$5)',
                'RISKY - May not be profitable',
                'Test cautiously or skip entirely'
            ],
            [''],
            ['═'.repeat(120)],
            [''],
            ['📊 SCORING FACTORS'],
            [''],
            ['Factor', 'Weight', 'Impact'],
            ['Search Volume', '35%', 'Higher volume = higher score'],
            ['Competition', '25%', 'Lower competition = higher score'],
            ['Buyer Intent', '20%', 'Buy keywords get +20 points'],
            ['CPC Efficiency', '15%', 'Lower CPC = higher score'],
            ['Brand Analytics Bonus', '5%', '+10 points for high competitor share'],
            [''],
            ['═'.repeat(120)],
            [''],
            ['🎯 SPECIAL BONUSES'],
            [''],
            ['Bonus Type', 'Points', 'When Applied'],
            ['Brand Analytics - High Click Share', '+10', 'Competitors have >30% click share'],
            ['Brand Analytics - High Conv Share', '+10', 'Competitors have >30% conversion share'],
            ['Search Frequency Rank Top 10K', '+10', 'Search term is extremely popular'],
            ['Exact Match', '+10', 'Keyword is exact match type'],
            ['Long-tail (4+ words)', '+5', 'Specific intent, better conversion'],
            ['Your ASIN in Top 3', '+15', 'You\'re already ranking - defend it!'],
            [''],
            ['═'.repeat(120)],
            [''],
            ['🔥 CONQUEST vs DEFEND STRATEGY'],
            [''],
            ['Strategy', 'When', 'Goal', 'Tactics'],
            [
                'CONQUEST',
                'You\'re NOT in top 3',
                'Steal competitor traffic',
                '• Aggressive bids\n• Target exact ASINs\n• Undercut top positions by 10-20%'
            ],
            [''],
            [
                'DEFEND',
                'You ARE in top 3',
                'Maintain & grow share',
                '• Optimize listing quality\n• Monitor competitor bids\n• Increase budget gradually'
            ]
        ];

        await this.sheetsService.writeRows(sheetName, rows);

        console.log(`✅ Created "${sheetName}" sheet\n`);
    }

    /**
     * Setup all documentation
     */
    async setupAllDocumentation() {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║  📝 SHEET DOCUMENTATION SETUP              ║');
        console.log('║  Adding Guides to Every Sheet             ║');
        console.log('╚════════════════════════════════════════════╝\n');

        // Keywords sheet documentation
        await this.addSheetDocumentation('Keywords', {
            title: 'TITAN KEYWORD OPPORTUNITIES',
            description: 'All discovered keywords with search data, competition analysis, and opportunity scores. Auto-synced from Titan engine.',
            howToUse: '1. Filter by Tier (Tier 1 = best)\n2. Sort by Opportunity Score (higher = better)\n3. Filter Search Volume >1000 for high-traffic terms\n4. Filter Competition = Low or Medium\n5. Add top keywords to PPC campaigns',
            filterTips: 'Color Filter: Search Volume >1000 + Competition Low/Med = GREEN highlights (best opportunities)'
        });

        // PPC Campaigns documentation
        await this.addSheetDocumentation('PPC Campaigns', {
            title: 'ACTIVE campaign PERFORMANCE & BLEEDERS',
            description: 'Live PPC campaign data from Amazon Ads. Shows spend, sales, ACOS, and identifies "bleeders" (campaigns losing money).',
            howToUse: '1. Check "Bleeder?" column - YES = losing money\n2. Review "Severity" - HIGH = urgent action needed\n3. Follow "Recommendation" for each campaign\n4. Pause HIGH severity bleeders immediately\n5. Optimize MEDIUM severity bleeders\n6. Scale WINNER campaigns',
            criteria: 'BLEEDER = Spend >$50 AND (ACOS >100% OR Zero Sales)',
            filterTips: 'Filter Bleeder = YES, then sort by Severity (HIGH first)'
        });

        // Create Tier Criteria sheet
        await this.createTierCriteriaSheet();

        // Create Competitors sheet
        await this.createCompetitorsSheet();

        // Add Competitors documentation
        await this.addSheetDocumentation('Competitors', {
            title: 'COMPETITOR ASIN TRACKING',
            description: 'Top competing ASINs from Brand Analytics. Shows which products are winning on your target keywords and their performance metrics.',
            howToUse: '1. Review ASINs dominating your keywords\n2. Check their Click Share % and Conversion Share %\n3. Analyze their titles and positioning\n4. Set strategy: Conquest (steal traffic) or Defend (maintain position)\n5. Update Status as you deploy campaigns',
            filterTips: 'Sort by Click Share % to see biggest threats first'
        });

        console.log('\n═══════════════════════════════════════════');
        console.log('✅ DOCUMENTATION COMPLETE');
        console.log('═══════════════════════════════════════════\n');
        console.log('All sheets now have:');
        console.log('  • Clear explanations of what they show');
        console.log('  • Step-by-step usage instructions');
        console.log('  • Filter tips and best practices\n');
        console.log('New sheets created:');
        console.log('  • Tier Criteria (explains scoring system)');
        console.log('  • Competitors (track competing ASINs)\n');
    }

    /**
     * Populate competitors from Brand Analytics data
     */
    async populateCompetitors() {
        console.log('📊 Populating competitors from Brand Analytics...\n');

        // Read keywords sheet to extract competitor ASINs
        const keywords = await this.sheetsService.readSheet('Keywords');

        const competitorMap = new Map();

        for (const row of keywords.slice(1)) { // Skip header
            const [keyword, , , , , , , competitorASINs, competitorClickShare, competitorConversionShare] = row;

            if (competitorASINs) {
                const asins = competitorASINs.toString().split(',').map(a => a.trim());
                const clickShares = competitorClickShare ? competitorClickShare.toString().split(',').map(s => parseFloat(s)) : [];
                const convShares = competitorConversionShare ? competitorConversionShare.toString().split(',').map(s => parseFloat(s)) : [];

                asins.forEach((asin, i) => {
                    if (!competitorMap.has(asin)) {
                        competitorMap.set(asin, {
                            asin,
                            keywords: [],
                            totalClickShare: 0,
                            totalConvShare: 0,
                            count: 0
                        });
                    }

                    const comp = competitorMap.get(asin);
                    comp.keywords.push(keyword);
                    comp.totalClickShare += (clickShares[i] || 0);
                    comp.totalConvShare += (convShares[i] || 0);
                    comp.count++;
                });
            }
        }

        // Convert to rows
        const competitorRows = Array.from(competitorMap.values()).map(comp => [
            comp.asin,
            '', // Brand - to be filled manually
            '', // Title - to be filled manually
            comp.keywords.slice(0, 5).join(', '), // Top 5 keywords
            '', // Avg position - to be calculated
            '', // Monthly volume - to be calculated
            (comp.totalClickShare / comp.count).toFixed(1),
            (comp.totalConvShare / comp.count).toFixed(1),
            'Conquest', // Default strategy
            'Active' // Default status
        ]);

        // Sort by click share descending
        competitorRows.sort((a, b) => parseFloat(b[6]) - parseFloat(a[6]));

        // Append to Competitors sheet
        await this.sheetsService.appendRows('Competitors', competitorRows);

        console.log(`✅ Added ${competitorRows.length} competitors\n`);
    }

    async run() {
        try {
            await this.setupAllDocumentation();
            await this.populateCompetitors();

            console.log('🎉 All sheets are now documented and ready to use!\n');
            console.log('https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

        } catch (error) {
            console.error('❌ Error:', error.message);
            console.error(error);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const docs = new SheetDocumentation();
    docs.run().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = SheetDocumentation;
