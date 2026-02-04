/**
 * SEARCH QUERY PERFORMANCE CSV ANALYZER
 * Chris Rawlings "Sales Stealing" Strategy (Manual CSV Version)
 * 
 * This script analyzes a manually downloaded Brand Analytics CSV file
 * and identifies "hidden gems" - keywords where you're converting well
 * but not getting enough clicks.
 * 
 * Setup:
 * 1. Go to: Seller Central → Analytics → Brand Analytics
 * 2. Click "Search Query Performance"
 * 3. Select date range (last month)
 * 4. Click "Download" → Save CSV
 * 5. Place CSV in this directory as: search-query-performance.csv
 * 6. Run: node analyze-sqp-csv.js
 */

const fs = require('fs');
const path = require('path');

class SearchQueryCSVAnalyzer {
    constructor(csvPath) {
        this.csvPath = csvPath;
    }

    /**
     * Parse CSV file
     */
    parseCSV(data) {
        const lines = data.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        return lines.slice(1).map(line => {
            // Handle CSV with quoted values
            const values = [];
            let current = '';
            let inQuotes = false;

            for (let char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());

            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index]?.replace(/"/g, '') || '';
            });

            return row;
        });
    }

    /**
     * Analyze for hidden gems using Chris Rawlings logic
     */
    analyzeHiddenGems(data) {
        console.log('🔍 Analyzing for "Hidden Gems" (Sales Stealing Opportunities)...\n');

        const hiddenGems = [];

        data.forEach(row => {
            // Parse numeric values (handle various column name formats)
            const searchTerm = row['Search Term'] || row['Query'] || 'Unknown';

            const searchQueryVolume = parseInt(
                row['Search Frequency Rank'] ||
                row['Search Volume'] ||
                row['Total Searches'] ||
                '0'
            );

            const brandImpressions = parseInt(row['Your ASIN Impressions'] || row['Brand Impressions'] || '0');
            const brandClicks = parseInt(row['Your ASIN Clicks'] || row['Brand Clicks'] || '0');
            const brandPurchases = parseInt(row['Your ASIN Conversions'] || row['Brand Purchases'] || row['Your ASIN Orders'] || '0');

            const totalImpressions = parseInt(row['Total Impressions'] || row['#1 Clicked ASIN Impressions'] || '0');
            const totalClicks = parseInt(row['Total Clicks'] || row['#1 Clicked ASIN Clicks'] || '0');
            const totalPurchases = parseInt(row['Total Purchases'] || row['Total Conversions'] || '0');

            // Calculate metrics
            const myCTR = brandImpressions > 0 ? (brandClicks / brandImpressions) : 0;
            const marketCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) : 0;
            const myCVR = brandClicks > 0 ? (brandPurchases / brandClicks) : 0;
            const marketCVR = totalClicks > 0 ? (totalPurchases / totalClicks) : 0;

            // Apply Chris Rawlings criteria
            // IMPORTANT: Search Frequency Rank is INVERSE - lower rank = higher volume
            // Rank 1 = highest volume, Rank 1000 = lowest volume
            const volumeThreshold = searchQueryVolume < 500 || brandImpressions > 1000; // Rank < 500 means high volume
            const isHiddenGem = (
                volumeThreshold &&                    // High volume
                myCVR > marketCVR &&                  // Winning conversion
                myCTR < marketCTR &&                  // Losing clicks
                brandImpressions > 0 &&               // We're showing up
                marketCTR > 0 &&                      // Market has activity
                myCVR > 0                             // We have some conversions
            );

            if (isHiddenGem) {
                const ctrGap = ((marketCTR - myCTR) / marketCTR * 100);
                const cvrAdvantage = ((myCVR - marketCVR) / marketCVR * 100);
                const potentialClicks = brandImpressions * (marketCTR - myCTR);
                const potentialSales = Math.round(potentialClicks * myCVR);

                hiddenGems.push({
                    searchTerm,
                    searchQueryVolume,
                    brandImpressions,
                    myCTR: (myCTR * 100).toFixed(2),
                    marketCTR: (marketCTR * 100).toFixed(2),
                    ctrGap: ctrGap.toFixed(1),
                    myCVR: (myCVR * 100).toFixed(2),
                    marketCVR: (marketCVR * 100).toFixed(2),
                    cvrAdvantage: cvrAdvantage.toFixed(1),
                    potentialSales,
                    currentPurchases: brandPurchases
                });
            }
        });

        // Sort by potential sales (biggest opportunities first)
        hiddenGems.sort((a, b) => b.potentialSales - a.potentialSales);

        return hiddenGems;
    }

    /**
     * Print results
     */
    printResults(hiddenGems) {
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║  🎯 HIDDEN GEMS - SALES STEALING OPPORTUNITIES                 ║');
        console.log('║  Chris Rawlings Strategy: Fix Image/Title to Steal Clicks     ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        if (hiddenGems.length === 0) {
            console.log('✅ No hidden gems found. Your CTR is optimal on high-volume terms!\n');
            console.log('💡 This could mean:');
            console.log('   - Your images and titles are already optimized');
            console.log('   - Try analyzing more keywords (expand date range)');
            console.log('   - Consider looking at lower-volume terms\n');
            return;
        }

        console.log(`Found ${hiddenGems.length} opportunities:\n`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        hiddenGems.forEach((gem, index) => {
            console.log(`${index + 1}. 💎 ${gem.searchTerm.toUpperCase()}`);
            console.log(`   Impressions: ${gem.brandImpressions.toLocaleString()}`);
            console.log(`   CTR: Mine ${gem.myCTR}% vs Market ${gem.marketCTR}% (${gem.ctrGap}% gap)`);
            console.log(`   CVR: Mine ${gem.myCVR}% vs Market ${gem.marketCVR}% (+${gem.cvrAdvantage}% advantage)`);
            console.log(`   Current Sales: ${gem.currentPurchases}/month`);
            console.log(`   Potential: +${gem.potentialSales} sales/month if CTR matches market`);
            console.log(`   → ACTION: Optimize main image & title for "${gem.searchTerm}"\n`);
        });

        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log('📝 Recommended Actions (Priority Order):\n');

        hiddenGems.slice(0, 5).forEach((gem, index) => {
            console.log(`${index + 1}. "${gem.searchTerm}"`);
            console.log(`   - Update main image to highlight benefit shown in competitor listings`);
            console.log(`   - Add "${gem.searchTerm}" prominently in title (first 80 chars)`);
            console.log(`   - Expected uplift: +${gem.potentialSales} sales/month\n`);
        });

        // Calculate total opportunity
        const totalPotential = hiddenGems.reduce((sum, gem) => sum + gem.potentialSales, 0);
        const totalCurrent = hiddenGems.reduce((sum, gem) => sum + gem.currentPurchases, 0);
        const upliftPercent = totalCurrent > 0 ? ((totalPotential / totalCurrent) * 100).toFixed(1) : 0;

        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log('💰 TOTAL OPPORTUNITY:\n');
        console.log(`   Current monthly sales on these terms: ${totalCurrent}`);
        console.log(`   Potential additional sales: +${totalPotential}`);
        console.log(`   Total uplift potential: ${upliftPercent}% increase\n`);
    }

    /**
     * Main execution
     */
    run() {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║  🔍 SEARCH QUERY PERFORMANCE CSV ANALYZER                      ║');
        console.log('║  Chris Rawlings "Sales Stealing" Strategy                     ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        try {
            // Check if file exists
            if (!fs.existsSync(this.csvPath)) {
                console.error('❌ CSV file not found!\n');
                console.error(`Expected location: ${this.csvPath}\n`);
                console.error('📋 How to get the CSV file:\n');
                console.error('1. Go to: Seller Central → Analytics → Brand Analytics');
                console.error('2. Click "Search Query Performance"');
                console.error('3. Select date range (last 30 days recommended)');
                console.error('4. Click "Download" button');
                console.error('5. Save as: search-query-performance.csv');
                console.error('6. Place in this directory\n');
                console.error('Then run this script again!\n');
                process.exit(1);
            }

            // Read and parse CSV
            console.log(`📖 Reading CSV file: ${path.basename(this.csvPath)}\n`);
            const csvData = fs.readFileSync(this.csvPath, 'utf-8');
            const data = this.parseCSV(csvData);

            console.log(`   ✅ Parsed ${data.length} search terms\n`);

            // Analyze for hidden gems
            const hiddenGems = this.analyzeHiddenGems(data);

            // Print results
            this.printResults(hiddenGems);

            console.log('✅ Analysis complete!\n');

        } catch (error) {
            console.error('\n❌ Error:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const csvPath = process.argv[2] || path.join(__dirname, 'search-query-performance.csv');
    const analyzer = new SearchQueryCSVAnalyzer(csvPath);
    analyzer.run();
}

module.exports = SearchQueryCSVAnalyzer;
