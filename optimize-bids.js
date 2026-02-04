/**
 * TITAN PPC BID OPTIMIZER
 * Chris Rawlings 2026 Framework - Production Implementation
 * 
 * Senior PPC Algorithm Engineer
 * 
 * Framework Rules:
 * 1. Ideal Bid = (Sales / Clicks) × Target ACOS (30%)
 * 2. Smart Bleeder: Clicks > 30 AND Sales = 0 → PAUSE
 * 3. Winner: ACOS < 15% AND Orders > 5 → SCALE UP (+10%)
 * 4. Incremental Constraint: Max ±20% bid change
 * 
 * Sheet Structure:
 *   - Row 10: Headers
 *   - Row 11+: Data
 *   - Output: Columns R (New Bid), S (Action), T (Reason)
 * 
 * Usage: node optimize-bids.js
 */

require('dotenv').config();
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');
const NumberSanitizer = require('./src/titan/utils/number-sanitizer');

class TitanBidOptimizer {
    constructor() {
        this.sheetsService = new UnifiedSheetsService();
        this.sheetName = 'PPC Campaigns';

        // Framework Configuration
        this.TARGET_ACOS = 0.30;           // 30% target ACOS
        this.EXPECTED_CVR = 0.10;          // 10% expected conversion rate
        this.MAX_CHANGE_PERCENT = 0.20;    // Maximum 20% bid change
        this.BLEEDER_CLICK_THRESHOLD = 3 / this.EXPECTED_CVR; // 30 clicks
        this.WINNER_ACOS_THRESHOLD = 15;   // 15% ACOS or better
        this.WINNER_MIN_ORDERS = 5;        // Minimum 5 orders
        this.SCALE_UP_PERCENT = 0.10;      // 10% increase for winners

        // Performance tracking
        this.stats = {
            totalCampaigns: 0,
            bleeders: 0,
            winners: 0,
            increases: 0,
            decreases: 0,
            maintains: 0,
            pauses: 0
        };
    }

    /**
     * Calculate Value Per Click (VPC)
     * VPC = Total Sales / Total Clicks
     */
    calculateVPC(sales, clicks) {
        if (clicks === 0) return 0;
        return sales / clicks;
    }

    /**
     * Calculate Ideal Bid using Rawlings Formula
     * Ideal Bid = VPC × Target ACOS
     */
    calculateIdealBid(vpc) {
        return vpc * this.TARGET_ACOS;
    }

    /**
     * Apply 20% incremental change constraint
     * Prevents drastic bid changes that destabilize the algorithm
     */
    applyIncrementalConstraint(idealBid, currentCPC) {
        if (currentCPC === 0) {
            // No current CPC, use ideal bid as-is
            return idealBid;
        }

        const maxAllowedBid = currentCPC * (1 + this.MAX_CHANGE_PERCENT);
        const minAllowedBid = currentCPC * (1 - this.MAX_CHANGE_PERCENT);

        // Cap at maximum +20%
        if (idealBid > maxAllowedBid) {
            return maxAllowedBid;
        }

        // Floor at maximum -20%
        if (idealBid < minAllowedBid) {
            return minAllowedBid;
        }

        return idealBid;
    }

    /**
     * Smart Bleeder Detection (Statistical Significance)
     * New Rule: Clicks > (3 / Expected CVR) AND Sales = 0
     * 
     * Logic: With 10% CVR, we expect 1 sale per 10 clicks.
     * Wait for 3x that (30 clicks) for statistical significance.
     */
    isBleeder(clicks, sales) {
        return clicks > this.BLEEDER_CLICK_THRESHOLD && sales === 0;
    }

    /**
     * Winner Detection
     * Rule: ACOS < 15% AND Orders > 5
     */
    isWinner(acos, orders) {
        return acos < this.WINNER_ACOS_THRESHOLD && orders > this.WINNER_MIN_ORDERS;
    }

    /**
     * Main optimization logic for a single campaign
     */
    optimizeCampaign(campaign) {
        const {
            campaignName,
            clicks,
            sales,
            spend,
            orders,
            acos,
            currentCPC
        } = campaign;

        // Parse numeric values
        const numClicks = parseFloat(clicks) || 0;
        const numSales = parseFloat(sales) || 0;
        const numSpend = parseFloat(spend) || 0;
        const numOrders = parseFloat(orders) || 0;
        const numAcos = parseFloat(acos) || 0;
        const cpc = numClicks > 0 ? numSpend / numClicks : parseFloat(currentCPC) || 0;

        // Result object
        const result = {
            campaignName,
            currentBid: cpc.toFixed(2),
            newBid: cpc.toFixed(2),
            action: 'MAINTAIN',
            reason: 'No action needed'
        };

        // ========================================
        // RULE 1: BLEEDER DETECTION (Highest Priority)
        // ========================================
        if (this.isBleeder(numClicks, numSales)) {
            result.newBid = '0.00';
            result.action = 'PAUSE';
            result.reason = `Bleeder: ${numClicks} clicks / $0 sales (exceeds ${this.BLEEDER_CLICK_THRESHOLD} click threshold)`;
            this.stats.bleeders++;
            this.stats.pauses++;
            return result;
        }

        // ========================================
        // RULE 2: INSUFFICIENT DATA
        // ========================================
        if (numClicks === 0 || numClicks < 5) {
            result.action = 'MAINTAIN';
            result.reason = `Insufficient data: Only ${numClicks} clicks`;
            this.stats.maintains++;
            return result;
        }

        // ========================================
        // RULE 3: WINNER DETECTION
        // ========================================
        if (this.isWinner(numAcos, numOrders)) {
            const newBid = cpc * (1 + this.SCALE_UP_PERCENT);
            result.newBid = newBid.toFixed(2);
            result.action = 'INCREASE';
            result.reason = `Winner: ${numAcos.toFixed(1)}% ACOS, ${numOrders} orders - Scale up +10%`;
            this.stats.winners++;
            this.stats.increases++;
            return result;
        }

        // ========================================
        // RULE 4: IDEAL BID CALCULATION
        // ========================================

        // Calculate VPC (Value Per Click)
        const vpc = this.calculateVPC(numSales, numClicks);

        // Calculate Ideal Bid
        const idealBid = this.calculateIdealBid(vpc);

        // Apply 20% incremental constraint
        const constrainedBid = this.applyIncrementalConstraint(idealBid, cpc);

        result.newBid = constrainedBid.toFixed(2);

        // ========================================
        // DETERMINE ACTION & REASON
        // ========================================

        const bidDifference = constrainedBid - cpc;
        const bidChangePercent = cpc > 0 ? (bidDifference / cpc * 100) : 0;

        if (Math.abs(bidDifference) < 0.05) {
            // Less than $0.05 change - maintain
            result.action = 'MAINTAIN';
            result.reason = `Optimal: Current bid $${cpc.toFixed(2)} is ideal (VPC: $${vpc.toFixed(2)})`;
            this.stats.maintains++;
        } else if (bidDifference > 0) {
            // Increase bid
            const capped = idealBid > constrainedBid ? ' (capped at +20%)' : '';
            result.action = 'INCREASE';
            result.reason = `Increase: $${cpc.toFixed(2)} → $${constrainedBid.toFixed(2)} (+${bidChangePercent.toFixed(1)}%)${capped}`;
            this.stats.increases++;
        } else {
            // Decrease bid
            const capped = idealBid < constrainedBid ? ' (capped at -20%)' : '';
            result.action = 'DECREASE';
            result.reason = `Decrease: $${cpc.toFixed(2)} → $${constrainedBid.toFixed(2)} (${bidChangePercent.toFixed(1)}%)${capped}`;
            this.stats.decreases++;
        }

        return result;
    }

    /**
     * Read campaign data from Google Sheets
     * Headers in Row 10, Data starts Row 11
     */
    async readCampaignData() {
        console.log(`📖 Reading data from "${this.sheetName}" sheet...\n`);
        console.log('   Sheet structure: Headers in Row 10, Data starts Row 11\n');

        // Read all data from the sheet
        const allData = await this.sheetsService.readSheet(this.sheetName);

        if (!allData || allData.length <= 10) {
            throw new Error('No campaign data found in sheet (or only headers present)');
        }

        // Headers are in row 10 (index 9), data starts row 11 (index 10)
        const headers = allData[9]; // Row 10 (0-indexed)
        const data = allData.slice(10); // Rows 11+ (0-indexed)

        console.log(`   Headers (Row 10): ${headers.slice(0, 5).join(', ')}...`);
        console.log(`   Data rows: ${data.length}\n`);

        // Map sheet columns to campaign objects
        // Expected columns (based on fetch-ppc-campaigns.js):
        // A: Campaign Name
        // B: State
        // C: Targeting Type
        // D: Budget
        // E: Spend
        // F: Sales
        // G: Impressions
        // H: Clicks
        // I: Orders
        // J: CTR
        // K: CPC
        // L: ACOS
        // M: ROAS
        const campaigns = data.map(row => ({
            campaignName: row[0] || 'Unknown',
            state: row[1] || 'UNKNOWN',
            targetingType: row[2] || 'UNKNOWN',
            budget: NumberSanitizer.sanitizeCurrency(row[3]),
            spend: NumberSanitizer.sanitizeCurrency(row[4]),
            sales: NumberSanitizer.sanitizeCurrency(row[5]),
            impressions: NumberSanitizer.sanitize(row[6]),
            clicks: NumberSanitizer.sanitize(row[7]),
            orders: NumberSanitizer.sanitize(row[8]),
            ctr: NumberSanitizer.sanitizePercentage(row[9]),
            currentCPC: NumberSanitizer.sanitizeCurrency(row[10]),
            acos: NumberSanitizer.sanitizePercentage(row[11]),
            roas: NumberSanitizer.sanitize(row[12])
        }));

        console.log(`✅ Loaded ${campaigns.length} campaigns\n`);
        this.stats.totalCampaigns = campaigns.length;

        return campaigns;
    }

    /**
     * Write optimization results to Google Sheets
     * Columns R (New Bid), S (Action), T (Reason)
     */
    async writeResults(results) {
        console.log('\n💾 Writing optimization results to Google Sheets...\n');
        console.log('   Target columns: R (New Bid), S (Action), T (Reason)\n');

        // Prepare rows for columns R, S, T
        const rows = results.map(result => [
            `$${result.newBid}`,   // Column R: New Bid
            result.action,         // Column S: Action
            result.reason          // Column T: Reason
        ]);

        // Write headers first (row 10)
        await this.sheetsService.writeRows(
            this.sheetName,
            [['New Bid', 'Action', 'Reason']],
            'R10'
        );

        // Write data starting at R11
        await this.sheetsService.writeRows(
            this.sheetName,
            rows,
            'R11'
        );

        console.log(`✅ Written ${rows.length} optimization recommendations\n`);
    }

    /**
     * Print optimization summary with detailed breakdown
     */
    printSummary(results) {
        console.log('\n╔════════════════════════════════════════════════════╗');
        console.log('║  📊 TITAN BID OPTIMIZATION SUMMARY                ║');
        console.log('║  Chris Rawlings 2026 Framework                     ║');
        console.log('╚════════════════════════════════════════════════════╝\n');

        console.log(`Total Campaigns: ${this.stats.totalCampaigns}\n`);

        console.log('Action Breakdown:');
        console.log(`  ❌ PAUSE (Bleeders): ${this.stats.pauses}`);
        console.log(`  📈 INCREASE (Including Winners): ${this.stats.increases}`);
        console.log(`  📉 DECREASE: ${this.stats.decreases}`);
        console.log(`  ⏸️  MAINTAIN: ${this.stats.maintains}\n`);

        console.log('Special Categories:');
        console.log(`  🏆 Winners (ACOS < 15%, Orders > 5): ${this.stats.winners}`);
        console.log(`  🩸 Bleeders (30+ clicks, $0 sales): ${this.stats.bleeders}\n`);

        console.log('═══════════════════════════════════════════════════\n');

        // Show critical actions first: BLEEDERS
        const bleeders = results.filter(r => r.action === 'PAUSE');
        if (bleeders.length > 0) {
            console.log('🚨 CRITICAL: BLEEDERS TO PAUSE\n');
            bleeders.forEach((r, i) => {
                console.log(`${i + 1}. ❌ ${r.campaignName}`);
                console.log(`   ${r.reason}\n`);
            });
        }

        // Show winners
        const winners = results.filter(r => r.reason.startsWith('Winner'));
        if (winners.length > 0) {
            console.log('═══════════════════════════════════════════════════\n');
            console.log('🏆 WINNERS TO SCALE UP\n');
            winners.forEach((r, i) => {
                console.log(`${i + 1}. 📈 ${r.campaignName}`);
                console.log(`   Current: $${r.currentBid} → New: $${r.newBid}`);
                console.log(`   ${r.reason}\n`);
            });
        }

        // Show top bid changes by magnitude
        const significantChanges = results
            .filter(r => r.action === 'INCREASE' || r.action === 'DECREASE')
            .filter(r => !r.reason.startsWith('Winner')) // Exclude winners (already shown)
            .map(r => {
                const current = parseFloat(r.currentBid);
                const proposed = parseFloat(r.newBid);
                const changePercent = current > 0 ? Math.abs((proposed - current) / current * 100) : 0;
                return { ...r, changePercent };
            })
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 10);

        if (significantChanges.length > 0) {
            console.log('═══════════════════════════════════════════════════\n');
            console.log('📊 TOP 10 BID ADJUSTMENTS\n');
            significantChanges.forEach((r, i) => {
                const arrow = r.action === 'INCREASE' ? '📈' : '📉';
                console.log(`${i + 1}. ${arrow} ${r.campaignName}`);
                console.log(`   ${r.reason}\n`);
            });
        }
    }

    /**
     * Main execution
     */
    async run() {
        console.log('\n╔════════════════════════════════════════════════════╗');
        console.log('║  🎯 TITAN PPC BID OPTIMIZER                        ║');
        console.log('║  Chris Rawlings 2026 Framework                     ║');
        console.log('╚════════════════════════════════════════════════════╝\n');

        console.log('Configuration:');
        console.log(`  Target ACOS: ${(this.TARGET_ACOS * 100).toFixed(0)}%`);
        console.log(`  Expected CVR: ${(this.EXPECTED_CVR * 100).toFixed(0)}%`);
        console.log(`  Bleeder Threshold: ${this.BLEEDER_CLICK_THRESHOLD} clicks`);
        console.log(`  Winner Threshold: ACOS < ${this.WINNER_ACOS_THRESHOLD}%, Orders > ${this.WINNER_MIN_ORDERS}`);
        console.log(`  Max Bid Change: ±${(this.MAX_CHANGE_PERCENT * 100).toFixed(0)}%\n`);

        console.log('═══════════════════════════════════════════════════\n');

        try {
            // 1. Read campaign data from sheets (Row 11+)
            const campaigns = await this.readCampaignData();

            // 2. Optimize each campaign
            console.log('🔍 Analyzing campaigns with Rawlings algorithm...\n');
            const results = campaigns.map(campaign => this.optimizeCampaign(campaign));

            // 3. Write results to columns R, S, T
            await this.writeResults(results);

            // 4. Print detailed summary
            this.printSummary(results);

            console.log('═══════════════════════════════════════════════════\n');
            console.log('✅ Optimization complete!\n');
            console.log('📝 Next Steps:');
            console.log('   1. Review columns R, S, T in Google Sheets');
            console.log('   2. Start with BLEEDERS (PAUSE recommendations)');
            console.log('   3. Then scale WINNERS (+10% bids)');
            console.log('   4. Apply other bid adjustments in Amazon Ad Console');
            console.log('   5. Re-run weekly to monitor performance\n');

            console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

        } catch (error) {
            console.error('\n❌ Error:', error.message);
            console.error(error.stack);
            throw error;
        }
    }
}

// Run if called directly
if (require.main === module) {
    const optimizer = new TitanBidOptimizer();

    optimizer.run().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = TitanBidOptimizer;
