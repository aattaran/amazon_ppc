const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

/**
 * Audit all Google Sheets and recommend updates
 */
async function auditSheets() {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('         GOOGLE SHEETS AUDIT - What Needs Updating?');
    console.log('════════════════════════════════════════════════════════════════\n');

    const sheetsService = new UnifiedSheetsService();

    try {
        // 1. Get all sheet names
        const { google } = require('googleapis');
        const sheets = google.sheets({ version: 'v4', auth: sheetsService.auth });
        const response = await sheets.spreadsheets.get({
            spreadsheetId: sheetsService.spreadsheetId
        });

        const sheetNames = response.data.sheets.map(s => s.properties.title);

        console.log(`📊 Found ${sheetNames.length} sheets:\n`);
        sheetNames.forEach((name, i) => {
            console.log(`   ${i + 1}. ${name}`);
        });

        console.log('\n════════════════════════════════════════════════════════════════\n');

        // 2. Check each sheet
        for (const sheetName of sheetNames) {
            await analyzeSheet(sheetsService, sheetName);
        }

        // 3. Print recommendations
        printRecommendations(sheetNames);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

async function analyzeSheet(sheetsService, sheetName) {
    console.log(`\n📋 ${sheetName}`);
    console.log('─'.repeat(64));

    const data = await sheetsService.readSheet(sheetName);

    if (!data || data.length === 0) {
        console.log('   ⚠️  Sheet is empty');
        return;
    }

    const headers = data[0];
    const rowCount = data.length - 1; // Exclude header

    console.log(`   Columns: ${headers.join(', ')}`);
    console.log(`   Rows: ${rowCount}`);

    // Check what's in this sheet
    if (sheetName === 'Keywords') {
        checkKeywordsSheet(headers);
    } else if (sheetName === 'PPC Campaigns') {
        checkCampaignsSheet(headers);
    } else if (sheetName === 'Tier Criteria') {
        checkTierCriteriaSheet(headers);
    } else if (sheetName === 'Competitors') {
        checkCompetitorsSheet(headers);
    } else if (sheetName === 'Product Segments') {
        checkProductSegmentsSheet(headers);
    } else {
        console.log('   ℹ️  Unknown sheet type');
    }
}

function checkKeywordsSheet(headers) {
    const hasASIN = headers.some(h => h.toLowerCase().includes('asin'));
    const hasTier = headers.some(h => h.toLowerCase().includes('tier'));
    const hasSegment = headers.some(h => h.toLowerCase().includes('segment'));

    if (!hasASIN) {
        console.log('   ⚠️  Missing: ASIN column (needed to link to Product Segments)');
    }
    if (hasTier) {
        console.log('   ✅ Has tier classification');
    }
    if (!hasSegment) {
        console.log('   💡 RECOMMENDATION: Add "Product Segment" column');
        console.log('      (Shows which lifecycle segment the product is in)');
    }
}

function checkCampaignsSheet(headers) {
    const hasASIN = headers.some(h => h.toLowerCase().includes('asin'));
    const hasTACoS = headers.some(h => h.toLowerCase().includes('tacos') || h.toLowerCase().includes('tac'));
    const hasSegment = headers.some(h => h.toLowerCase().includes('segment'));

    if (!hasASIN) {
        console.log('   ⚠️  Missing: ASIN column');
    }
    if (hasTACoS) {
        console.log('   ✅ Has TACoS tracking');
    }
    if (!hasSegment) {
        console.log('   💡 RECOMMENDATION: Add "Product Segment" column');
        console.log('      (Shows if campaign is for HIGH TACOS, LAUNCH, etc.)');
    }
    console.log('   💡 RECOMMENDATION: Add "Budget Action" column');
    console.log('      (Shows recommended budget multiplier: 0.7x, 2.0x, etc.)');
}

function checkTierCriteriaSheet(headers) {
    console.log('   ✅ Tier Criteria is reference data - no updates needed');
    console.log('   ℹ️  Tiers classify KEYWORDS, Segments classify PRODUCTS');
}

function checkCompetitorsSheet(headers) {
    console.log('   ✅ Competitors sheet is fine as-is');
    console.log('   ℹ️  Used for conquest keyword targeting');
}

function checkProductSegmentsSheet(headers) {
    const expectedCols = [
        'ASIN', 'Product Name', 'Days Live', 'Segment', 'Priority',
        'Total Sales', 'Ad Sales', 'Organic Sales', 'Ad Spend',
        'Ad Dep %', 'TACoS %', 'CVR %', 'Budget Multiplier',
        'Primary Strategy', 'Health Status'
    ];

    const hasAllCols = expectedCols.every(col =>
        headers.some(h => h.toLowerCase() === col.toLowerCase())
    );

    if (hasAllCols) {
        console.log('   ✅ All expected columns present');
    } else {
        const missing = expectedCols.filter(col =>
            !headers.some(h => h.toLowerCase() === col.toLowerCase())
        );
        console.log(`   ⚠️  Missing columns: ${missing.join(', ')}`);
    }
}

function printRecommendations(sheetNames) {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('RECOMMENDED UPDATES:');
    console.log('════════════════════════════════════════════════════════════════\n');

    console.log('1. ✅ Product Segments (NEW) - Already created!');
    console.log('   This is your master "Brain" sheet\n');

    if (sheetNames.includes('Keywords')) {
        console.log('2. 📝 Keywords Sheet - ADD COLUMN:');
        console.log('   Column: "Product Segment"');
        console.log('   Formula: =VLOOKUP(ASIN, ProductSegments!A:D, 4, FALSE)');
        console.log('   Shows: Which segment the product is in\n');
    }

    if (sheetNames.includes('PPC Campaigns')) {
        console.log('3. 📝 PPC Campaigns Sheet - ADD COLUMNS:');
        console.log('   Column A: "Product Segment"');
        console.log('   Column B: "Budget Action"');
        console.log('   Column C: "Recommended Budget"');
        console.log('   Shows: Segment, budget multiplier, new budget amount\n');
    }

    console.log('4. ℹ️  Tier Criteria - NO CHANGES NEEDED');
    console.log('   Tiers classify keywords, Segments classify products\n');

    console.log('5. ℹ️  Competitors - NO CHANGES NEEDED\n');

    console.log('════════════════════════════════════════════════════════════════');
    console.log('PRIORITY ACTIONS:');
    console.log('════════════════════════════════════════════════════════════════\n');

    console.log('🔥 HIGH PRIORITY:');
    console.log('   1. Add "Product Segment" to PPC Campaigns sheet');
    console.log('      (Links campaigns to lifecycle analysis)\n');

    console.log('📊 MEDIUM PRIORITY:');
    console.log('   2. Add "Budget Action" to PPC Campaigns sheet');
    console.log('      (Shows 0.7x, 1.2x, 2.0x multipliers)\n');

    console.log('📌 LOW PRIORITY:');
    console.log('   3. Add "Product Segment" to Keywords sheet');
    console.log('      (Nice to have for context)\n');

    console.log('════════════════════════════════════════════════════════════════\n');
}

// Run
auditSheets().catch(console.error);
