const XLSX = require('xlsx');
const fs = require('fs');

// Read original file to get exact column structure
const originalWorkbook = XLSX.readFile('bulk-a3snsjclchkfi8-20251118-20260117-1768683859196.xlsx');
const originalSheet = originalWorkbook.Sheets['Sponsored Products Campaigns'];
const originalData = XLSX.utils.sheet_to_json(originalSheet);

// Get exact column names from original
const amazonColumns = Object.keys(originalData[0]);

console.log('✅ Using Amazon Template Column Structure');
console.log(`   Total columns: ${amazonColumns.length}\n`);

// Helper to create row with all Amazon columns
function createRow(data) {
    const row = {};
    amazonColumns.forEach(col => {
        row[col] = data[col] || '';
    });
    return row;
}

const allRows = [];

// ===================
// PART 1: MODIFY EXISTING CAMPAIGNS
// ===================

console.log('📝 Phase 1: Modifying existing campaigns...');

// REDUCE: berberine exact new (106% ACOS)
allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Campaign',
    'Operation': 'update',
    'Campaign ID': '337423570829331',
    'Campaign Name': 'berberine exact new',
    'Daily Budget': 2,
    'State': 'enabled'
}));

// REDUCE: berberberine h phrase (81% ACOS)
allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Campaign',
    'Operation': 'update',
    'Campaign ID': '347066231335202',
    'Campaign Name': 'berberberine h phrase',
    'Daily Budget': 3,
    'State': 'enabled'
}));

// PAUSE: berberine auto new 2
allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Campaign',
    'Operation': 'update',
    'Campaign ID': '297136534969837',
    'Campaign Name': 'berberine auto new 2',
    'State': 'paused'
}));

// PAUSE: berberine asin new11
allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Campaign',
    'Operation': 'update',
    'Campaign ID': '521751871226682',
    'Campaign Name': 'berberine asin new11',
    'State': 'paused'
}));

// PAUSE: berberine broad new
allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Campaign',
    'Operation': 'update',
    'Campaign ID': '561057249153775',
    'Campaign Name': 'berberine broad new',
    'State': 'paused'
}));

console.log('  ✅ 2 campaigns reduced, 3 paused\n');

// ====================
// PART 2: NEW CAMPAIGNS
// ====================

console.log('📝 Phase 2: Creating new campaigns...\n');

// CAMPAIGN 1: Core DHB Exact - $10/day
const camp1Name = 'DHB Core Exact - Conservative';

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Campaign',
    'Operation': 'create',
    'Campaign ID': camp1Name,
    'Campaign Name': camp1Name,
    'Portfolio ID': '95232512935825',
    'Start Date': '20260118',
    'Targeting Type': 'Manual',
    'State': 'enabled',
    'Daily Budget': 10,
    'Bidding Strategy': 'Fixed bid'
}));

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Ad Group',
    'Operation': 'create',
    'Campaign ID': camp1Name,
    'Ad Group ID': 'Top 5 Keywords',
    'Ad Group Name': 'Top 5 Keywords',
    'Ad Group Default Bid': 0.85,
    'State': 'enabled'
}));

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Product Ad',
    'Operation': 'create',
    'Campaign ID': camp1Name,
    'Ad Group ID': 'Top 5 Keywords',
    'SKU': 'GC-TGFS-RCNL',
    'State': 'enabled'
}));

const camp1Keywords = [
    { keyword: 'dihydroberberine', bid: 1.00 },
    { keyword: 'dihydroberberine supplement', bid: 0.90 },
    { keyword: 'dihydroberberine 200mg', bid: 0.80 },
    { keyword: 'hydroberberine', bid: 0.85 },
    { keyword: 'dhb supplement', bid: 0.75 }
];

camp1Keywords.forEach(kw => {
    allRows.push(createRow({
        'Product': 'Sponsored Products',
        'Entity': 'Keyword',
        'Operation': 'create',
        'Campaign ID': camp1Name,
        'Ad Group ID': 'Top 5 Keywords',
        'Keyword Text': kw.keyword,
        'Match Type': 'Exact',
        'Bid': kw.bid,
        'State': 'enabled'
    }));
});

console.log(`  ✅ Campaign 1: ${camp1Name} - $10/day, 5 keywords`);

// CAMPAIGN 2: GlucoVantage - $8/day
const camp2Name = 'GlucoVantage Branded - Low Risk';

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Campaign',
    'Operation': 'create',
    'Campaign ID': camp2Name,
    'Campaign Name': camp2Name,
    'Portfolio ID': '95232512935825',
    'Start Date': '20260118',
    'Targeting Type': 'Manual',
    'State': 'enabled',
    'Daily Budget': 8,
    'Bidding Strategy': 'Fixed bid'
}));

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Ad Group',
    'Operation': 'create',
    'Campaign ID': camp2Name,
    'Ad Group ID': 'GlucoVantage Terms',
    'Ad Group Name': 'GlucoVantage Terms',
    'Ad Group Default Bid': 0.85,
    'State': 'enabled'
}));

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Product Ad',
    'Operation': 'create',
    'Campaign ID': camp2Name,
    'Ad Group ID': 'GlucoVantage Terms',
    'SKU': 'GC-TGFS-RCNL',
    'State': 'enabled'
}));

const camp2Keywords = [
    { keyword: 'glucovantage dihydroberberine', bid: 1.00, match: 'Exact' },
    { keyword: 'glucovantage dihydroberberine', bid: 0.90, match: 'Phrase' },
    { keyword: 'glucovantage', bid: 0.75, match: 'Exact' }
];

camp2Keywords.forEach(kw => {
    allRows.push(createRow({
        'Product': 'Sponsored Products',
        'Entity': 'Keyword',
        'Operation': 'create',
        'Campaign ID': camp2Name,
        'Ad Group ID': 'GlucoVantage Terms',
        'Keyword Text': kw.keyword,
        'Match Type': kw.match,
        'Bid': kw.bid,
        'State': 'enabled'
    }));
});

console.log(`  ✅ Campaign 2: ${camp2Name} - $8/day, 3 keywords`);

// CAMPAIGN 3: Formula Unique - $7/day
const camp3Name = 'Formula Unique - Test';

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Campaign',
    'Operation': 'create',
    'Campaign ID': camp3Name,
    'Campaign Name': camp3Name,
    'Portfolio ID': '95232512935825',
    'Start Date': '20260118',
    'Targeting Type': 'Manual',
    'State': 'enabled',
    'Daily Budget': 7,
    'Bidding Strategy': 'Fixed bid'
}));

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Ad Group',
    'Operation': 'create',
    'Campaign ID': camp3Name,
    'Ad Group ID': 'Unique Ingredients',
    'Ad Group Name': 'Unique Ingredients',
    'Ad Group Default Bid': 0.55,
    'State': 'enabled'
}));

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Product Ad',
    'Operation': 'create',
    'Campaign ID': camp3Name,
    'Ad Group ID': 'Unique Ingredients',
    'SKU': 'GC-TGFS-RCNL',
    'State': 'enabled'
}));

const camp3Keywords = [
    { keyword: 'dihydroberberine ceylon cinnamon', bid: 0.60 },
    { keyword: 'berberine lions mane', bid: 0.55 },
    { keyword: 'dihydroberberine chromium', bid: 0.50 }
];

camp3Keywords.forEach(kw => {
    allRows.push(createRow({
        'Product': 'Sponsored Products',
        'Entity': 'Keyword',
        'Operation': 'create',
        'Campaign ID': camp3Name,
        'Ad Group ID': 'Unique Ingredients',
        'Keyword Text': kw.keyword,
        'Match Type': 'Phrase',
        'Bid': kw.bid,
        'State': 'enabled'
    }));
});

console.log(`  ✅ Campaign 3: ${camp3Name} - $7/day, 3 keywords`);

// CAMPAIGN 4: Competitor Conquest - $5/day
const camp4Name = 'Competitor Conquest - Tiny Test';

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Campaign',
    'Operation': 'create',
    'Campaign ID': camp4Name,
    'Campaign Name': camp4Name,
    'Portfolio ID': '95232512935825',
    'Start Date': '20260118',
    'Targeting Type': 'Manual',
    'State': 'enabled',
    'Daily Budget': 5,
    'Bidding Strategy': 'Fixed bid'
}));

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Ad Group',
    'Operation': 'create',
    'Campaign ID': camp4Name,
    'Ad Group ID': 'Brand Alternatives',
    'Ad Group Name': 'Brand Alternatives',
    'Ad Group Default Bid': 0.80,
    'State': 'enabled'
}));

allRows.push(createRow({
    'Product': 'Sponsored Products',
    'Entity': 'Product Ad',
    'Operation': 'create',
    'Campaign ID': camp4Name,
    'Ad Group ID': 'Brand Alternatives',
    'SKU': 'GC-TGFS-RCNL',
    'State': 'enabled'
}));

const camp4Keywords = [
    { keyword: 'double wood dihydroberberine alternative', bid: 0.85 },
    { keyword: 'nutricost berberine alternative', bid: 0.75 }
];

camp4Keywords.forEach(kw => {
    allRows.push(createRow({
        'Product': 'Sponsored Products',
        'Entity': 'Keyword',
        'Operation': 'create',
        'Campaign ID': camp4Name,
        'Ad Group ID': 'Brand Alternatives',
        'Keyword Text': kw.keyword,
        'Match Type': 'Phrase',
        'Bid': kw.bid,
        'State': 'enabled'
    }));
});

console.log(`  ✅ Campaign 4: ${camp4Name} - $5/day, 2 keywords\n`);

// ==================
// CREATE WORKBOOK
// ==================

console.log('📊 Creating bulksheet with Amazon template format...');

const newWorkbook = XLSX.utils.book_new();
const newWorksheet = XLSX.utils.json_to_sheet(allRows, { header: amazonColumns });

// Add Portfolio sheet (keep from original)
const portfolioData = XLSX.utils.sheet_to_json(originalWorkbook.Sheets['Portfolios']);
const portfolioSheet = XLSX.utils.json_to_sheet(portfolioData);
XLSX.utils.book_append_sheet(newWorkbook, portfolioSheet, 'Portfolios');

// Add Sponsored Products Campaigns sheet
XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sponsored Products Campaigns');

// Save
const filename = 'CONSERVATIVE-BULKSHEET-AMAZON-FORMAT-20260117.xlsx';
XLSX.writeFile(newWorkbook, filename);

console.log(`\n✅ BULKSHEET GENERATED: ${filename}`);
console.log(`   Total rows: ${allRows.length}`);
console.log(`   Format: Amazon Ads Official Template`);
console.log(`   Sheets: Portfolios, Sponsored Products Campaigns`);
console.log('\n📤 This file is ready to upload to Amazon Ads Campaign Manager');
