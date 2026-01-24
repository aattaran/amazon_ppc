const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

/**
 * Amazon Brand Analytics - Competitor Keyword Analyzer
 * 
 * Analyzes Search Terms Report to find:
 * 1. Keywords competitors rank for
 * 2. Keywords you're missing
 * 3. Your ranking positions
 * 4. Keyword opportunities for PPC
 */

// Configuration
const YOUR_ASINS = [
    // Add your product ASINs here
    'B0EXAMPLE1',
    'B0EXAMPLE2'
];

const COMPETITOR_ASINS = [
    // Add known competitor ASINs here
    'B08COMPETITOR1',
    'B08COMPETITOR2'
];

async function analyzeBrandAnalytics(csvFilePath) {
    console.log('\n📊 Analyzing Brand Analytics Search Terms Report...\n');

    const results = {
        yourKeywords: [],
        competitorKeywords: [],
        missingKeywords: [],
        opportunities: []
    };

    // Read CSV file
    const rows = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', () => {
                console.log(`✅ Loaded ${rows.length} search terms\n`);

                // Analyze each row
                for (const row of rows) {
                    const searchTerm = row['Search Term'] || row['search_term'];
                    const searchFreqRank = parseInt(row['Search Frequency Rank'] || row['search_frequency_rank'] || '999999');

                    // Get clicked ASINs
                    const clickedASINs = [
                        row['#1 Clicked ASIN'] || row['top_clicked_asin_1'],
                        row['#2 Clicked ASIN'] || row['top_clicked_asin_2'],
                        row['#3 Clicked ASIN'] || row['top_clicked_asin_3']
                    ].filter(Boolean);

                    // Get purchased ASINs
                    const purchasedASINs = [
                        row['#1 Purchased ASIN'] || row['top_purchased_asin_1'],
                        row['#2 Purchased ASIN'] || row['top_purchased_asin_2'],
                        row['#3 Purchased ASIN'] || row['top_purchased_asin_3']
                    ].filter(Boolean);

                    const allASINs = [...new Set([...clickedASINs, ...purchasedASINs])];

                    // Check if YOUR ASIN appears
                    const yourPosition = findPosition(YOUR_ASINS, clickedASINs);
                    const hasYourASIN = yourPosition !== -1;

                    // Check if COMPETITOR ASIN appears
                    const competitorPosition = findPosition(COMPETITOR_ASINS, clickedASINs);
                    const hasCompetitorASIN = competitorPosition !== -1;

                    // Categorize the keyword
                    if (hasYourASIN && hasCompetitorASIN) {
                        // You and competitor both rank
                        results.yourKeywords.push({
                            searchTerm,
                            yourPosition: yourPosition + 1,
                            competitorPosition: competitorPosition + 1,
                            searchFreqRank,
                            volume: estimateVolume(searchFreqRank),
                            status: yourPosition < competitorPosition ? '✅ Winning' : '⚠️ Losing'
                        });
                    }
                    else if (hasYourASIN && !hasCompetitorASIN) {
                        // Only you rank
                        results.yourKeywords.push({
                            searchTerm,
                            yourPosition: yourPosition + 1,
                            competitorPosition: null,
                            searchFreqRank,
                            volume: estimateVolume(searchFreqRank),
                            status: '🏆 Dominating'
                        });
                    }
                    else if (!hasYourASIN && hasCompetitorASIN) {
                        // Only competitor ranks - OPPORTUNITY!
                        results.missingKeywords.push({
                            searchTerm,
                            competitorPosition: competitorPosition + 1,
                            searchFreqRank,
                            volume: estimateVolume(searchFreqRank),
                            priority: searchFreqRank < 1000 ? '🔥 HIGH' : searchFreqRank < 10000 ? '⚡ MEDIUM' : '💡 LOW'
                        });
                    }
                }

                // Sort and output
                results.yourKeywords.sort((a, b) => a.searchFreqRank - b.searchFreqRank);
                results.missingKeywords.sort((a, b) => a.searchFreqRank - b.searchFreqRank);

                displayResults(results);
                saveResults(results);

                resolve(results);
            })
            .on('error', reject);
    });
}

function findPosition(yourASINs, clickedASINs) {
    for (let i = 0; i < clickedASINs.length; i++) {
        if (yourASINs.includes(clickedASINs[i])) {
            return i;
        }
    }
    return -1;
}

function estimateVolume(rank) {
    // Rough estimate based on search frequency rank
    if (rank < 100) return 'Very High (10K+/mo)';
    if (rank < 1000) return 'High (1K-10K/mo)';
    if (rank < 10000) return 'Medium (100-1K/mo)';
    if (rank < 100000) return 'Low (10-100/mo)';
    return 'Very Low (<10/mo)';
}

function displayResults(results) {
    console.log('\n========================================');
    console.log('📊 BRAND ANALYTICS KEYWORD ANALYSIS');
    console.log('========================================\n');

    // Your Keywords
    console.log(`🎯 YOUR RANKING KEYWORDS (${results.yourKeywords.length} total)\n`);
    console.log('Top 20:\n');

    results.yourKeywords.slice(0, 20).forEach((kw, i) => {
        console.log(`${i + 1}. ${kw.status} "${kw.searchTerm}"`);
        console.log(`   Your Position: #${kw.yourPosition}`);
        if (kw.competitorPosition) {
            console.log(`   Competitor Position: #${kw.competitorPosition}`);
        }
        console.log(`   Search Volume: ${kw.volume}`);
        console.log(`   Frequency Rank: ${kw.searchFreqRank}\n`);
    });

    // Missing Keywords (OPPORTUNITIES!)
    console.log(`\n🚀 COMPETITOR KEYWORDS YOU'RE MISSING (${results.missingKeywords.length} total)\n`);
    console.log('Top 20 Opportunities:\n');

    results.missingKeywords.slice(0, 20).forEach((kw, i) => {
        console.log(`${i + 1}. ${kw.priority} "${kw.searchTerm}"`);
        console.log(`   Competitor Position: #${kw.competitorPosition}`);
        console.log(`   Search Volume: ${kw.volume}`);
        console.log(`   Frequency Rank: ${kw.searchFreqRank}\n`);
    });

    console.log('\n========================================');
    console.log('💡 RECOMMENDATIONS');
    console.log('========================================\n');

    const highPriority = results.missingKeywords.filter(k => k.searchFreqRank < 1000);
    console.log(`1. Add ${highPriority.length} HIGH PRIORITY keywords to PPC`);
    console.log(`2. Increase bids on ${results.yourKeywords.filter(k => k.status.includes('Losing')).length} keywords you're losing`);
    console.log(`3. Optimize listings for top ${Math.min(10, results.missingKeywords.length)} opportunity keywords\n`);
}

async function saveResults(results) {
    // Save missing keywords (opportunities) to CSV
    const csvWriter = createCsvWriter({
        path: 'data/brand-analytics/competitor-keywords-opportunities.csv',
        header: [
            { id: 'searchTerm', title: 'Search Term' },
            { id: 'competitorPosition', title: 'Competitor Position' },
            { id: 'searchFreqRank', title: 'Search Frequency Rank' },
            { id: 'volume', title: 'Estimated Volume' },
            { id: 'priority', title: 'Priority' }
        ]
    });

    await csvWriter.writeRecords(results.missingKeywords);
    console.log('✅ Saved opportunities to: data/brand-analytics/competitor-keywords-opportunities.csv\n');

    // Save your rankings
    const csvWriter2 = createCsvWriter({
        path: 'data/brand-analytics/your-keyword-rankings.csv',
        header: [
            { id: 'searchTerm', title: 'Search Term' },
            { id: 'yourPosition', title: 'Your Position' },
            { id: 'competitorPosition', title: 'Competitor Position' },
            { id: 'searchFreqRank', title: 'Search Frequency Rank' },
            { id: 'volume', title: 'Estimated Volume' },
            { id: 'status', title: 'Status' }
        ]
    });

    await csvWriter2.writeRecords(results.yourKeywords);
    console.log('✅ Saved your rankings to: data/brand-analytics/your-keyword-rankings.csv\n');
}

// Command-line usage
if (require.main === module) {
    const csvFile = process.argv[2];

    if (!csvFile) {
        console.log('\n📋 USAGE:');
        console.log('node analyze-brand-analytics.js <path-to-search-terms.csv>\n');
        console.log('STEPS:');
        console.log('1. Download Search Terms Report from Seller Central > Brand Analytics');
        console.log('2. Update YOUR_ASINS and COMPETITOR_ASINS in this script');
        console.log('3. Run: node analyze-brand-analytics.js data/brand-analytics/search-terms.csv\n');
        process.exit(1);
    }

    if (!fs.existsSync(csvFile)) {
        console.error(`❌ File not found: ${csvFile}`);
        process.exit(1);
    }

    analyzeBrandAnalytics(csvFile).catch(console.error);
}

module.exports = { analyzeBrandAnalytics };
