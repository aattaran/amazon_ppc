/**
 * Generate Amazon Ads Bulksheet - Bleeder Fixes & New Campaigns
 * Creates two Excel sheets:
 * 1. Bleeder fixes for current campaign
 * 2. New high-performing campaigns with researched keywords
 */

const ExcelJS = require('exceljs');

async function generateBulksheets() {
    // Create workbook with two sheets
    const workbook = new ExcelJS.Workbook();

    // ============================================
    // SHEET 1: BLEEDER FIXES
    // ============================================
    const fixSheet = workbook.addWorksheet('1. Fix Current Bleeder');

    // Define columns for fix sheet
    fixSheet.columns = [
        { header: 'Product', key: 'product', width: 18 },
        { header: 'Entity', key: 'entity', width: 15 },
        { header: 'Operation', key: 'operation', width: 12 },
        { header: 'Campaign ID', key: 'campaignId', width: 25 },
        { header: 'Ad Group ID', key: 'adGroupId', width: 25 },
        { header: 'Campaign Name', key: 'campaignName', width: 35 },
        { header: 'Ad Group Name', key: 'adGroupName', width: 30 },
        { header: 'Start Date', key: 'startDate', width: 12 },
        { header: 'End Date', key: 'endDate', width: 12 },
        { header: 'Targeting Type', key: 'targetingType', width: 15 },
        { header: 'State', key: 'state', width: 10 },
        { header: 'Daily Budget', key: 'dailyBudget', width: 12 },
        { header: 'Ad Group Default Bid', key: 'defaultBid', width: 18 },
        { header: 'Bidding Strategy', key: 'biddingStrategy', width: 25 },
    ];

    // Style header row
    fixSheet.getRow(1).font = { bold: true };
    fixSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE74C3C' } // Red for fixes
    };

    // Add fix instructions
    fixSheet.addRow({
        product: 'INSTRUCTIONS:',
        entity: `This sheet pauses your current bleeder campaign (ACOS 172.77%, losing ~$95/month)`,
    });

    fixSheet.addRow({
        product: '→',
        entity: 'Upload this sheet to Amazon Ads Console to implement fixes',
    });

    fixSheet.addRow({}); // Empty row

    // Fix 1: Pause current campaign
    fixSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Campaign',
        operation: 'Update',
        campaignId: '[YOUR_CAMPAIGN_ID]', // User needs to replace
        campaignName: '',
        state: 'paused',
        dailyBudget: '',
        biddingStrategy: '',
    });

    // Note row
    fixSheet.addRow({
        product: '→ REPLACE',
        entity: '[YOUR_CAMPAIGN_ID] with actual ID from Amazon console',
    });

    // ============================================
    // SHEET 2: NEW CAMPAIGNS WITH KEYWORDS
    // ============================================
    const newSheet = workbook.addWorksheet('2. New Winning Campaigns');

    // Define columns for new campaigns
    newSheet.columns = [
        { header: 'Product', key: 'product', width: 18 },
        { header: 'Entity', key: 'entity', width: 20 },
        { header: 'Operation', key: 'operation', width: 12 },
        { header: 'Campaign ID', key: 'campaignId', width: 35 },
        { header: 'Ad Group ID', key: 'adGroupId', width: 30 },
        { header: 'Keyword ID', key: 'keywordId', width: 15 },
        { header: 'Campaign Name', key: 'campaignName', width: 40 },
        { header: 'Ad Group Name', key: 'adGroupName', width: 35 },
        { header: 'Start Date', key: 'startDate', width: 12 },
        { header: 'Targeting Type', key: 'targetingType', width: 15 },
        { header: 'State', key: 'state', width: 10 },
        { header: 'Daily Budget', key: 'dailyBudget', width: 12 },
        { header: 'ASIN', key: 'asin', width: 15 },
        { header: 'Ad Group Default Bid', key: 'defaultBid', width: 18 },
        { header: 'Bid', key: 'bid', width: 8 },
        { header: 'Keyword Text', key: 'keywordText', width: 35 },
        { header: 'Match Type', key: 'matchType', width: 12 },
        { header: 'Bidding Strategy', key: 'biddingStrategy', width: 25 },
        { header: 'Placement', key: 'placement', width: 15 },
        { header: 'Percentage', key: 'percentage', width: 12 },
    ];

    // Style header row
    newSheet.getRow(1).font = { bold: true };
    newSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF27AE60' } // Green for new campaigns
    };

    // Add instructions
    newSheet.addRow({
        product: 'INSTRUCTIONS:',
        entity: 'This sheet creates 4 new high-performing campaigns with researched keywords',
    });

    newSheet.addRow({
        product: '→',
        entity: 'Replace [YOUR_ASIN] with your actual product ASIN',
    });

    newSheet.addRow({
        product: '→',
        entity: 'Upload to Amazon Ads Console - Campaigns will be created automatically',
    });

    newSheet.addRow({}); // Empty row

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // ============================================
    // CAMPAIGN 1: DISCOVERY (AUTO-TARGETING)
    // ============================================

    // Campaign row
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Campaign',
        operation: 'Create',
        campaignId: 'DHB Discovery Auto',
        campaignName: 'DHB Discovery Auto',
        startDate: today,
        targetingType: 'Auto',
        state: 'enabled',
        dailyBudget: 40,
        biddingStrategy: 'Dynamic bids - down only',
    });

    // Bidding adjustment for top of search
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Bidding adjustment',
        operation: 'Create',
        campaignId: 'DHB Discovery Auto',
        biddingStrategy: 'Dynamic bids - down only',
        placement: 'placementTop',
        percentage: 25,
    });

    // Ad Group
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Ad Group',
        operation: 'Create',
        campaignId: 'DHB Discovery Auto',
        adGroupId: 'AG Main Products',
        adGroupName: 'AG Main Products',
        state: 'enabled',
        defaultBid: 1.00,
    });

    // Product Ad
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Product Ad',
        operation: 'Create',
        campaignId: 'DHB Discovery Auto',
        adGroupId: 'AG Main Products',
        state: 'enabled',
        asin: '[YOUR_ASIN]',
    });

    newSheet.addRow({}); // Separator

    // ============================================
    // CAMPAIGN 2: EXACT MATCH HIGH-INTENT
    // ============================================

    // Campaign row
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Campaign',
        operation: 'Create',
        campaignId: 'DHB Exact Match High Intent',
        campaignName: 'DHB Exact Match High Intent',
        startDate: today,
        targetingType: 'Manual',
        state: 'enabled',
        dailyBudget: 30,
        biddingStrategy: 'Fixed bid',
    });

    // Ad Group
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Ad Group',
        operation: 'Create',
        campaignId: 'DHB Exact Match High Intent',
        adGroupId: 'AG High Intent KWs',
        adGroupName: 'AG High Intent KWs',
        state: 'enabled',
        defaultBid: 0.80,
    });

    // Product Ad
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Product Ad',
        operation: 'Create',
        campaignId: 'DHB Exact Match High Intent',
        adGroupId: 'AG High Intent KWs',
        state: 'enabled',
        asin: '[YOUR_ASIN]',
    });

    // High-Intent Keywords (Exact Match)
    const highIntentKeywords = [
        { keyword: 'dihydroberberine', bid: 0.90 },
        { keyword: 'dhb supplement', bid: 0.70 },
        { keyword: 'glucovantage', bid: 1.10 },
        { keyword: 'dihydroberberine supplement', bid: 0.85 },
        { keyword: 'dhb berberine', bid: 0.75 },
        { keyword: 'advanced berberine', bid: 0.80 },
        { keyword: 'best dihydroberberine', bid: 1.00 },
        { keyword: 'dihydroberberine capsules', bid: 0.65 },
    ];

    highIntentKeywords.forEach(kw => {
        newSheet.addRow({
            product: 'Sponsored Products',
            entity: 'Keyword',
            operation: 'Create',
            campaignId: 'DHB Exact Match High Intent',
            adGroupId: 'AG High Intent KWs',
            state: 'enabled',
            bid: kw.bid,
            keywordText: kw.keyword,
            matchType: 'exact',
        });
    });

    newSheet.addRow({}); // Separator

    // ============================================
    // CAMPAIGN 3: PHRASE MATCH - BLOOD SUGAR
    // ============================================

    // Campaign row
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Campaign',
        operation: 'Create',
        campaignId: 'DHB Phrase Blood Sugar',
        campaignName: 'DHB Phrase Blood Sugar',
        startDate: today,
        targetingType: 'Manual',
        state: 'enabled',
        dailyBudget: 25,
        biddingStrategy: 'Fixed bid',
    });

    // Ad Group
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Ad Group',
        operation: 'Create',
        campaignId: 'DHB Phrase Blood Sugar',
        adGroupId: 'AG Blood Sugar KWs',
        adGroupName: 'AG Blood Sugar KWs',
        state: 'enabled',
        defaultBid: 0.75,
    });

    // Product Ad
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Product Ad',
        operation: 'Create',
        campaignId: 'DHB Phrase Blood Sugar',
        adGroupId: 'AG Blood Sugar KWs',
        state: 'enabled',
        asin: '[YOUR_ASIN]',
    });

    // Blood Sugar Keywords (Phrase Match)
    const bloodSugarKeywords = [
        { keyword: 'berberine for blood sugar', bid: 0.85 },
        { keyword: 'blood sugar support supplement', bid: 0.70 },
        { keyword: 'berberine blood sugar control', bid: 0.80 },
        { keyword: 'natural blood sugar support', bid: 0.65 },
        { keyword: 'glucose support supplement', bid: 0.75 },
        { keyword: 'berberine metabolic support', bid: 0.70 },
        { keyword: 'blood sugar management', bid: 0.60 },
    ];

    bloodSugarKeywords.forEach(kw => {
        newSheet.addRow({
            product: 'Sponsored Products',
            entity: 'Keyword',
            operation: 'Create',
            campaignId: 'DHB Phrase Blood Sugar',
            adGroupId: 'AG Blood Sugar KWs',
            state: 'enabled',
            bid: kw.bid,
            keywordText: kw.keyword,
            matchType: 'phrase',
        });
    });

    newSheet.addRow({}); // Separator

    // ============================================
    // CAMPAIGN 4: COMPETITOR CONQUEST
    // ============================================

    // Campaign row
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Campaign',
        operation: 'Create',
        campaignId: 'DHB Competitor Conquest',
        campaignName: 'DHB Competitor Conquest',
        startDate: today,
        targetingType: 'Manual',
        state: 'enabled',
        dailyBudget: 20,
        biddingStrategy: 'Fixed bid',
    });

    // Ad Group
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Ad Group',
        operation: 'Create',
        campaignId: 'DHB Competitor Conquest',
        adGroupId: 'AG Competitor KWs',
        adGroupName: 'AG Competitor KWs',
        state: 'enabled',
        defaultBid: 1.00,
    });

    // Product Ad
    newSheet.addRow({
        product: 'Sponsored Products',
        entity: 'Product Ad',
        operation: 'Create',
        campaignId: 'DHB Competitor Conquest',
        adGroupId: 'AG Competitor KWs',
        state: 'enabled',
        asin: '[YOUR_ASIN]',
    });

    // Competitor Keywords (Phrase Match)
    const competitorKeywords = [
        { keyword: 'berberine alternative', bid: 1.10 },
        { keyword: 'better than berberine', bid: 1.20 },
        { keyword: 'glucovantage alternative', bid: 1.30 },
        { keyword: 'thorne berberine alternative', bid: 1.00 },
        { keyword: 'now foods berberine alternative', bid: 0.95 },
        { keyword: 'best berberine supplement', bid: 1.00 },
    ];

    competitorKeywords.forEach(kw => {
        newSheet.addRow({
            product: 'Sponsored Products',
            entity: 'Keyword',
            operation: 'Create',
            campaignId: 'DHB Competitor Conquest',
            adGroupId: 'AG Competitor KWs',
            state: 'enabled',
            bid: kw.bid,
            keywordText: kw.keyword,
            matchType: 'phrase',
        });
    });

    // ============================================
    // SHEET 3: NEGATIVE KEYWORDS
    // ============================================

    const negSheet = workbook.addWorksheet('3. Negative Keywords');

    negSheet.columns = [
        { header: 'Product', key: 'product', width: 18 },
        { header: 'Entity', key: 'entity', width: 20 },
        { header: 'Operation', key: 'operation', width: 12 },
        { header: 'Campaign ID', key: 'campaignId', width: 35 },
        { header: 'Keyword Text', key: 'keywordText', width: 30 },
        { header: 'Match Type', key: 'matchType', width: 20 },
        { header: 'State', key: 'state', width: 10 },
    ];

    // Style header
    negSheet.getRow(1).font = { bold: true };
    negSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF39C12' } // Orange for warnings
    };

    // Instructions
    negSheet.addRow({
        product: 'INSTRUCTIONS:',
        entity: 'Add these negative keywords to ALL campaigns to prevent wasted spend',
    });

    negSheet.addRow({
        product: '→',
        entity: 'Apply to all 4 new campaigns created in Sheet 2',
    });

    negSheet.addRow({}); // Empty row

    // Negative keywords to add to all campaigns
    const negativeKeywords = [
        'free',
        'sample',
        'cheap',
        'discount',
        'coupon',
        'wholesale',
        'bulk',
        'powder',
        'liquid',
        'side effects',
        'reviews reddit',
        'scam',
        'dangerous',
        'prescription',
    ];

    const campaigns = [
        'DHB Discovery Auto',
        'DHB Exact Match High Intent',
        'DHB Phrase Blood Sugar',
        'DHB Competitor Conquest',
    ];

    campaigns.forEach(campaign => {
        negativeKeywords.forEach(negKw => {
            negSheet.addRow({
                product: 'Sponsored Products',
                entity: 'Negative Keyword',
                operation: 'Create',
                campaignId: campaign,
                keywordText: negKw,
                matchType: 'negativeExact',
                state: 'enabled',
            });
        });
        negSheet.addRow({}); // Separator between campaigns
    });

    // ============================================
    // SHEET 4: SUMMARY & METRICS
    // ============================================

    const summarySheet = workbook.addWorksheet('4. Summary & Targets');

    summarySheet.columns = [
        { key: 'metric', width: 30 },
        { key: 'value', width: 20 },
        { key: 'notes', width: 50 },
    ];

    // Add summary data
    summarySheet.addRow({ metric: 'CAMPAIGN STRATEGY SUMMARY', value: '', notes: '' });
    summarySheet.getRow(1).font = { bold: true, size: 14 };
    summarySheet.addRow({});

    summarySheet.addRow({ metric: 'Total Daily Budget', value: '$115', notes: 'Discovery $40 + Exact $30 + Phrase $25 + Competitor $20' });
    summarySheet.addRow({ metric: 'Total Monthly Budget', value: '$3,450', notes: '$115/day × 30 days' });
    summarySheet.addRow({ metric: 'Total Keywords', value: '35', notes: '8 exact + 7 phrase blood sugar + 6 competitor + 14 negatives' });
    summarySheet.addRow({});

    summarySheet.addRow({ metric: 'TARGET METRICS (30 days)', value: '', notes: '' });
    summarySheet.getRow(7).font = { bold: true };
    summarySheet.addRow({ metric: 'Target ACOS', value: '30-35%', notes: 'Supplement industry standard' });
    summarySheet.addRow({ metric: 'Target ROAS', value: '3.0-3.5', notes: '$3-3.50 sales per $1 spend' });
    summarySheet.addRow({ metric: 'Target CVR', value: '8-12%', notes: 'Conversion rate goal' });
    summarySheet.addRow({ metric: 'Expected Revenue', value: '$8,000-10,000', notes: 'Month 1-2 projection' });
    summarySheet.addRow({ metric: 'Expected Profit', value: '$2,000-3,000', notes: 'After ad spend & COGS' });
    summarySheet.addRow({});

    summarySheet.addRow({ metric: 'CAMPAIGN BREAKDOWN', value: '', notes: '' });
    summarySheet.getRow(13).font = { bold: true };
    summarySheet.addRow({ metric: '1. Discovery (Auto)', value: '$40/day', notes: 'Find winning keywords - Allow 30-60% ACOS' });
    summarySheet.addRow({ metric: '2. Exact Match', value: '$30/day', notes: 'High-intent keywords - Target 25% ACOS' });
    summarySheet.addRow({ metric: '3. Phrase Blood Sugar', value: '$25/day', notes: 'Medium-intent - Target 35% ACOS' });
    summarySheet.addRow({ metric: '4. Competitor Conquest', value: '$20/day', notes: 'Steal share - Allow 40-45% ACOS' });
    summarySheet.addRow({});

    summarySheet.addRow({ metric: 'NEXT STEPS', value: '', notes: '' });
    summarySheet.getRow(19).font = { bold: true };
    summarySheet.addRow({ metric: '1. Replace [YOUR_ASIN]', value: 'REQUIRED', notes: 'Find in Sheet 2, replace with actual ASIN' });
    summarySheet.addRow({ metric: '2. Replace [YOUR_CAMPAIGN_ID]', value: 'REQUIRED', notes: 'Find in Sheet 1 for bleeder fix' });
    summarySheet.addRow({ metric: '3. Upload Sheet 1', value: 'FIRST', notes: 'Pause current bleeder campaign' });
    summarySheet.addRow({ metric: '4. Upload Sheet 2', value: 'SECOND', notes: 'Create 4 new campaigns' });
    summarySheet.addRow({ metric: '5. Upload Sheet 3', value: 'THIRD', notes: 'Add negative keywords' });
    summarySheet.addRow({ metric: '6. Monitor daily', value: 'ONGOING', notes: 'Check Search Term Reports, add negatives' });

    // Save file
    const filename = `Amazon_PPC_Bulksheet_${new Date().toISOString().slice(0, 10)}.xlsx`;
    await workbook.xlsx.writeFile(filename);

    console.log('✅ Excel bulksheet generated successfully!');
    console.log(`📄 Filename: ${filename}`);
    console.log('\nSheets created:');
    console.log('  1. Fix Current Bleeder - Pause losing campaign');
    console.log('  2. New Winning Campaigns - 4 campaigns with 35 keywords');
    console.log('  3. Negative Keywords - 14 terms to block');
    console.log('  4. Summary & Targets - Strategy overview');
    console.log('\n📋 Total Keywords: 35 (21 positive + 14 negative)');
    console.log('💰 Total Daily Budget: $115');
    console.log('🎯 Target ACOS: 30-35%');
    console.log('\n🚀 Next: Replace [YOUR_ASIN] and upload to Amazon Ads Console!');
}

// Run the generator
generateBulksheets().catch(console.error);
