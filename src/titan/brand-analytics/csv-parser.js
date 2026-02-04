/**
 * Brand Analytics CSV Parser
 * Parses monthly Amazon Brand Analytics search term reports
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class BrandAnalyticsParser {
    constructor() {
        this.YOUR_ASIN = 'B0DTDZFMY7'; // Element Dihydroberberine
    }

    /**
     * Parse a Brand Analytics CSV file
     * @param {string} filePath - Path to CSV file
     * @returns {Promise<Array>} Parsed search terms with competitor data
     */
    async parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];

            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    // Skip header rows
                    if (row['Search Frequency Rank'] === 'Search Frequency Rank') return;

                    try {
                        const searchTerm = {
                            searchTerm: row['Search Term'],
                            searchFrequencyRank: parseInt(row['Search Frequency Rank']) || null,
                            reportingDate: row['Reporting Date'],
                            topBrands: [
                                row['Top Clicked Brand #1'],
                                row['Top Clicked Brands #2'],
                                row['Top Clicked Brands #3']
                            ].filter(Boolean),
                            topASINs: []
                        };

                        // Parse top 3 clicked ASINs
                        for (let i = 1; i <= 3; i++) {
                            const asin = row[`Top Clicked Product #${i}: ASIN`];
                            if (asin) {
                                searchTerm.topASINs.push({
                                    asin: asin,
                                    title: row[`Top Clicked Product #${i}: Product Title`],
                                    clickShare: parseFloat(row[`Top Clicked Product #${i}: Click Share`]) || 0,
                                    conversionShare: parseFloat(row[`Top Clicked Product #${i}: Conversion Share`]) || 0,
                                    position: i
                                });
                            }
                        }

                        results.push(searchTerm);
                    } catch (error) {
                        console.error(`Error parsing row:`, error.message);
                    }
                })
                .on('end', () => {
                    console.log(`✅ Parsed ${results.length} search terms from ${path.basename(filePath)}`);
                    resolve(results);
                })
                .on('error', reject);
        });
    }

    /**
     * Analyze conquest opportunities
     * @param {Array} searchTerms - Parsed search terms
     * @returns {Object} Analysis results
     */
    analyzeOpportunities(searchTerms) {
        const conquestTargets = [];
        const defendPositions = [];
        const noPresence = [];

        for (const term of searchTerms) {
            const yourPosition = term.topASINs.findIndex(a => a.asin === this.YOUR_ASIN);
            const isInTop3 = yourPosition !== -1;

            if (isInTop3) {
                // You're in top 3 - defend it
                defendPositions.push({
                    ...term,
                    yourPosition: yourPosition + 1,
                    yourClickShare: term.topASINs[yourPosition].clickShare,
                    yourConversionShare: term.topASINs[yourPosition].conversionShare
                });
            } else {
                // Not in top 3 - conquest opportunity
                const competitorData = term.topASINs.map(a => ({
                    asin: a.asin,
                    position: a.position,
                    clickShare: a.clickShare,
                    conversionShare: a.conversionShare
                }));

                const totalCompetitorClick = competitorData.reduce((sum, c) => sum + c.clickShare, 0);
                const totalCompetitorConv = competitorData.reduce((sum, c) => sum + c.conversionShare, 0);

                conquestTargets.push({
                    ...term,
                    yourPosition: null,
                    competitorASINs: competitorData,
                    totalCompetitorClickShare: totalCompetitorClick,
                    totalCompetitorConversionShare: totalCompetitorConv
                });
            }
        }

        return {
            total: searchTerms.length,
            conquestTargets,
            defendPositions,
            summary: {
                totalTerms: searchTerms.length,
                conquestOpportunities: conquestTargets.length,
                defendPositions: defendPositions.length,
                avgCompetitorClickShare: conquestTargets.reduce((sum, t) =>
                    sum + t.totalCompetitorClickShare, 0) / conquestTargets.length || 0
            }
        };
    }

    /**
     * Find gap keywords - terms competitors are NOT targeting
     * @param {Array} nov Data from November
     * @param {Array} dec Data from December
     * @returns {Array} Gap keywords
     */
    findGapKeywords(novData, decData) {
        const gaps = [];

        // Find keywords in Nov but not in Dec (declining competitor interest)
        for (const novTerm of novData) {
            const inDec = decData.find(d => d.searchTerm === novTerm.searchTerm);

            if (!inDec) {
                gaps.push({
                    keyword: novTerm.searchTerm,
                    reason: 'Competitors stopped targeting this keyword',
                    lastSeen: novTerm.reportingDate,
                    searchFrequencyRank: novTerm.searchFrequencyRank,
                    gapType: 'abandoned'
                });
            }
        }

        // Find keywords with declining click share
        for (const decTerm of decData) {
            const novTerm = novData.find(n => n.searchTerm === decTerm.searchTerm);

            if (novTerm) {
                const novTotal = novTerm.topASINs.reduce((sum, a) => sum + a.clickShare, 0);
                const decTotal = decTerm.topASINs.reduce((sum, a) => sum + a.clickShare, 0);

                if (decTotal < novTotal * 0.7) { // 30% drop
                    gaps.push({
                        keyword: decTerm.searchTerm,
                        reason: 'Competitor click share dropped significantly',
                        novClickShare: novTotal,
                        decClickShare: decTotal,
                        drop: ((novTotal - decTotal) / novTotal * 100).toFixed(1) + '%',
                        searchFrequencyRank: decTerm.searchFrequencyRank,
                        gapType: 'declining_competition'
                    });
                }
            }
        }

        return gaps;
    }

    /**
     * Parse both monthly files and combine
     * @param {string} novPath - November CSV
     * @param {string} decPath - December CSV
     * @returns {Promise<Object>} Combined analysis
     */
    async parseMonthlyReports(novPath, decPath) {
        console.log('\n📊 Parsing Brand Analytics Monthly Reports...\n');

        const novData = await this.parseCSV(novPath);
        const decData = await this.parseCSV(decPath);

        console.log('\n🔍 Analyzing opportunities...\n');
        const novAnalysis = this.analyzeOpportunities(novData);
        const decAnalysis = this.analyzeOpportunities(decData);

        console.log('\n🎯 Finding gap keywords...\n');
        const gaps = this.findGapKeywords(novData, decData);

        return {
            november: {
                data: novData,
                analysis: novAnalysis
            },
            december: {
                data: decData,
                analysis: decAnalysis
            },
            gapKeywords: gaps,
            combined: {
                totalUniqueTerms: new Set([...novData.map(d => d.searchTerm), ...decData.map(d => d.searchTerm)]).size,
                conquestTargetsNov: novAnalysis.conquestTargets.length,
                conquestTargetsDec: decAnalysis.conquestTargets.length,
                gapOpportunities: gaps.length
            }
        };
    }
}

module.exports = BrandAnalyticsParser;
