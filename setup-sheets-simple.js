/**
 * Simple Sheet Setup - Add Documentation & New Sheets
 * Creates new sheets and adds usage documentation headers
 */

require('dotenv').config();
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

async function setupSheets() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  📝 SETTING UP GOOGLE SHEETS               ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const sheets = new UnifiedSheetsService();

    try {
        // 1. Create Tier Criteria Sheet
        console.log('📊 Creating Tier Criteria sheet...\n');
        await sheets.ensureSheet('Tier Criteria');
        await sheets.clearSheet('Tier Criteria');

        const tierRows = [
            ['🏆 KEYWORD TIER SYSTEM - How Keywords are Scored'],
            [''],
            ['Tier', 'Score Range', 'Criteria', 'What It Means', 'Action'],
            ['Tier 1', ' 80-100', 'High volume (>10K), Low competition, Strong intent, Low CPC (<$2)', 'WINNERS - Deploy immediately', 'Aggressive bids, max budget'],
            ['Tier 2', '60-79', 'Medium volume (1K-10K), Medium competition, Moderate intent, CPC $2-$5', 'SOLID - Test & optimize', 'Moderate bids, weekly optimization'],
            ['Tier 3', '0-59', 'Low volume (<1K), High competition OR weak intent, High CPC (>$5)', 'RISKY - Test cautiously', 'Low bids or skip'],
            [''],
            ['═══════════════════════════════════════════════════════════════════════════════════'],
            [''],
            ['📊 SCORING FACTORS'],
            ['Factor', 'Weight', 'Impact'],
            ['Search Volume', '35%', 'Higher volume = higher score'],
            ['Competition', '25%', 'Lower competition = higher score'],
            ['Buyer Intent', '20%', 'Buy/best/review keywords get +20 points'],
            ['CPC Efficiency', '15%', 'Lower CPC = higher score'],
            ['Brand Analytics', '5%', '+10 points for high competitor shares'],
            [''],
            ['🎯 SPECIAL BONUSES'],
            ['Bonus', 'Points', 'When'],
            ['High Competitor Click Share', '+10', 'Competitors have >30% click share'],
            ['High Competitor Conv Share', '+10', 'Competitors have >30% conversion share'],
            ['Top Search Frequency', '+10', 'Search rank < 10,000'],
            ['Your ASIN in Top 3', '+15', 'You\'re already ranking - defend!'],
            ['Exact Match', '+10', 'Exact match keyword'],
            ['Long-tail (4+ words)', '+5', 'Specific intent, better conversion'],
            [''],
            [' ═══════════════════════════════════════════════════════════════════════════════════'],
            [''],
            ['🔥 CONQUEST vs DEFEND'],
            ['Strategy', 'When', 'Goal', 'Tactics'],
            ['CONQUEST', 'NOT in top 3', 'Steal traffic', 'Aggressive bids, target exact ASINs'],
            ['DEFEND', 'IN top 3', 'Maintain share', 'Optimize listing, monitor competitors']
        ];

        await sheets.writeRows('Tier Criteria', tierRows);
        console.log('✅ Tier Criteria created\n');

        // 2. Create Competitors Sheet
        console.log('📊 Creating Competitors sheet...\n');
        await sheets.ensureSheet('Competitors');
        await sheets.clearSheet('Competitors');

        const competitorHeaders = [
            ['📊 COMPETITOR ASIN TRACKING'],
            [''],
            ['WHAT THIS SHOWS: Top competing ASINs from Brand Analytics - who\'s winning on your keywords'],
            ['HOW TO USE: 1) Review ASINs dominating keywords  2) Check click/conversion shares  3) Set conquest strategy  4) Track status'],
            ['💡 TIP: Sort by Click Share % to see biggest threats first'],
            [''],
            ['═══════════════════════════════════════════════════════════════════════════════════'],
            [''],
            ['ASIN', 'Brand', 'Product Title', 'Keywords They Rank For', 'Avg Position', 'Est. Monthly Volume', 'Click Share %', 'Conversion Share %', 'Strategy', 'Status']
        ];

        await sheets.writeRows('Competitors', competitorHeaders);
        console.log('✅ Competitors created\n');

        // 3. Ensure PPC Campaigns sheet exists
        console.log('📊 Creating PPC Campaigns sheet...\n');
        await sheets.ensureSheet('PPC Campaigns');
        await sheets.clearSheet('PPC Campaigns');

        const ppcHeaders = [
            ['📊 ACTIVE PPC CAMPAIGNS & BLEEDERS'],
            [''],
            ['WHAT THIS SHOWS: Live campaign data from Amazon Ads - spend, sales, ACOS, and "bleeders" losing money'],
            ['HOW TO USE: 1) Filter Bleeder=YES  2) Check Severity (HIGH=urgent)  3) Follow recommendations  4) Pause/optimize'],
            ['BLEEDER CRITERIA: Spend >$50 AND (ACOS >100% OR Zero Sales)'],
            ['💡 TIP: Filter Bleeder=YES, sort by Severity HIGH first'],
            [''],
            ['═══════════════════════════════════════════════════════════════════════════════════'],
            [''],
            ['Campaign Name', 'State', 'Type', 'Budget', 'Spend (30d)', 'Sales (30d)', 'Impressions', 'Clicks', 'Orders', 'CTR %', 'CPC $', 'ACOS %', 'ROAS', 'CVR %', 'Bleeder?', 'Severity', 'Recommendation']
        ];

        await sheets.writeRows('PPC Campaigns', ppcHeaders);
        console.log('✅ PPC Campaigns created\n');

        console.log('\n═══════════════════════════════════════════');
        console.log('✅ ALL SHEETS SETUP COMPLETE!');
        console.log('═══════════════════════════════════════════\n');
        console.log('Created/Updated:');
        console.log('  ✓ Tier Criteria (explains scoring system)');
        console.log('  ✓ Competitors (track competing ASINs)');
        console.log('  ✓ PPC Campaigns (bleeders & recommendations)\n');
        console.log('🔗 https://docs.google.com/spreadsheets/d/1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc/edit\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

setupSheets().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
