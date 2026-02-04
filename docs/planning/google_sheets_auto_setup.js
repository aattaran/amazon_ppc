/**
 * PPC Campaign Manager - Google Sheets Auto-Setup Script
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Extensions → Apps Script
 * 3. Delete any existing code
 * 4. Paste this entire script
 * 5. Click "Save" (disk icon)
 * 6. Click "Run" (play button) → Select "setupPPCSheets"
 * 7. Authorize when prompted
 * 8. Wait ~30 seconds for completion
 * 9. Check console for "✅ Setup complete!"
 */

function setupPPCSheets() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    Logger.log('🚀 Starting PPC Sheets setup...');

    // Step 1: Create new tabs if they don't exist
    createTabsIfNeeded(ss);

    // Step 2: Set up "PPC Campaigns" tab (update existing)
    setupCampaignsTab(ss);

    // Step 3: Set up "Ad Groups" tab
    setupAdGroupsTab(ss);

    // Step 4: Set up "Keywords" tab  
    setupKeywordsTab(ss);

    // Step 5: Set up "Targeting Clauses" tab (for Phase 1B)
    setupTargetingClausesTab(ss);

    // Step 6: Set up "Negative Keywords" tab
    setupNegativeKeywordsTab(ss);

    Logger.log('✅ Setup complete!');
    // Alert removed to prevent hanging - check Execution log for confirmation
}

/**
 * Create tabs if they don't exist
 */
function createTabsIfNeeded(ss) {
    const requiredTabs = [
        '1. Campaigns',
        '2. Ad Groups',
        '3. Keywords',
        '4. Targeting Clauses',
        '5. Negative Keywords'
    ];

    const existingSheets = ss.getSheets().map(s => s.getName());

    requiredTabs.forEach(tabName => {
        if (!existingSheets.includes(tabName)) {
            Logger.log(`Creating tab: ${tabName}`);
            ss.insertSheet(tabName);
        }
    });
}

/**
 * Setup PPC Campaigns tab (add columns Z and AA)
 */
function setupCampaignsTab(ss) {
    Logger.log('Setting up PPC Campaigns tab...');

    const sheet = ss.getSheetByName('1. Campaigns');
    if (!sheet) {
        Logger.log('⚠️ 1. Campaigns tab not found, skipping');
        return;
    }

    // Add title and instructions
    sheet.getRange('A1:AA1').merge();
    sheet.getRange('A1').setValue('1️⃣ CAMPAIGNS - READ ONLY');
    sheet.getRange('A1').setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange('A1').setBackground('#4285F4').setFontColor('#FFFFFF');

    sheet.getRange('A3:AA5').merge();
    const instructions = 'ℹ️ INFO: This is a reference tab showing all your campaigns.\n\n' +
        'Column Z (Test Group): A = Keywords Only, B = Keywords + Audiences, CONTROL = Not in test\n' +
        'To change test groups: Tag campaign names in Amazon with [KW-ONLY] or [KW+AUD], then re-fetch data.';
    sheet.getRange('A3').setValue(instructions);
    sheet.getRange('A3').setBackground('#E8F5E9').setFontSize(10).setVerticalAlignment('top').setWrap(true);

    // Add new headers in row 10
    sheet.getRange('Z10').setValue('Test Group');
    sheet.getRange('AA10').setValue('Optimization Type');

    // Format headers
    const headerRange = sheet.getRange('Z10:AA10');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    headerRange.setBackground('#4285F4');
    headerRange.setFontColor('#FFFFFF');
}

/**
 * Setup Ad Groups tab
 */
function setupAdGroupsTab(ss) {
    Logger.log('Setting up Ad Groups tab...');

    const sheet = ss.getSheetByName('2. Ad Groups');
    if (!sheet) return;

    // Clear only header rows (preserve data in rows 11+)
    sheet.getRange('A1:Z10').clear();

    // Add title and instructions
    sheet.getRange('A1:L1').merge();
    sheet.getRange('A1').setValue('2️⃣ AD GROUPS - READ ONLY');
    sheet.getRange('A1').setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange('A1').setBackground('#4285F4').setFontColor('#FFFFFF');

    sheet.getRange('A3:L5').merge();
    const instructions = 'ℹ️ INFO: This is a reference tab showing all your ad groups.\n\n' +
        'Use this to understand campaign structure. All approvals happen in the KEYWORDS tab.';
    sheet.getRange('A3').setValue(instructions);
    sheet.getRange('A3').setBackground('#E8F5E9').setFontSize(10).setVerticalAlignment('top').setWrap(true);

    // Add headers in row 10
    const headers = [
        'Ad Group Name', 'Ad Group ID', 'Campaign ID', 'Campaign Name',
        'State', 'Default Bid', 'Clicks', 'Spend', 'Sales', 'Orders',
        'ACOS', 'CVR'
    ];

    sheet.getRange(10, 1, 1, headers.length).setValues([headers]);

    // Format headers
    const headerRange = sheet.getRange(10, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    headerRange.setBackground('#4285F4');
    headerRange.setFontColor('#FFFFFF');

    // Freeze rows 1-10
    sheet.setFrozenRows(10);
}

/**
 * Setup Keywords tab with conditional formatting and dropdowns
 */
function setupKeywordsTab(ss) {
    Logger.log('Setting up Keywords tab...');

    const sheet = ss.getSheetByName('3. Keywords');
    if (!sheet) return;

    // Clear only header rows (preserve data in rows 11+)
    sheet.getRange('A1:Z10').clear();

    // Add dashboard (rows 1-9)
    setupKeywordsDashboard(sheet);

    // Add headers in row 10
    const headers = [
        'Keyword Text', 'Keyword ID', 'Match Type', 'Ad Group ID', 'Campaign ID',
        'Campaign Name', 'Test Group', 'State', 'Current Bid', 'Clicks',
        'Spend', 'Sales', 'Orders', 'ACOS', 'CVR', 'VPC',
        'Recommended Bid', 'Action', 'Priority', 'Approval', 'Last Updated'
    ];

    sheet.getRange(10, 1, 1, headers.length).setValues([headers]);

    // Format headers
    const headerRange = sheet.getRange(10, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    headerRange.setBackground('#4285F4');
    headerRange.setFontColor('#FFFFFF');

    // Freeze rows 1-10
    sheet.setFrozenRows(10);

    // Add conditional formatting for Priority column (column S = 19)
    addPriorityFormatting(sheet);

    // Add conditional formatting for Action column (column R = 18)
    addActionFormatting(sheet);

    // Add approval dropdown (column T = 20)
    addApprovalDropdown(sheet);

    // Add row highlighting based on approval
    addApprovalRowHighlighting(sheet);

    Logger.log('Keywords tab setup complete');
}

/**
 * Add dashboard to Keywords tab
 */
function setupKeywordsDashboard(sheet) {
    // Row 1: Title
    sheet.getRange('A1:U1').merge();
    sheet.getRange('A1').setValue('3️⃣ KEYWORDS - APPROVAL WORKFLOW');
    sheet.getRange('A1').setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange('A1').setBackground('#4285F4').setFontColor('#FFFFFF');

    // Rows 3-8: Step-by-step instructions
    sheet.getRange('A3:U8').merge();
    const instructions =
        '🎯 WHAT TO DO:\n\n' +
        '1️⃣ FETCH DATA: Run "node fetch-ppc-data.js" in terminal (or use menu: PPC Optimizer → Data Operations → Fetch PPC Data)\n' +
        '2️⃣ REVIEW: Focus on CRITICAL (red) and HIGH (orange) priority keywords first (column S)\n' +
        '3️⃣ DECIDE: Click dropdown in "Approval" column (T) and select:\n' +
        '     • APPROVE = Include in bulk file (row turns green)\n' +
        '     • REJECT = Skip this keyword (row turns red)\n' +
        '     • HOLD = Review later (row turns yellow)\n' +
        '4️⃣ EXPORT: When done, run "node generate-bulk-csv.js" in terminal\n' +
        '5️⃣ UPLOAD: Upload generated Excel file to Amazon Ads Console → Bulk Operations';

    sheet.getRange('A3').setValue(instructions);
    sheet.getRange('A3').setBackground('#FFF9C4').setFontSize(10).setVerticalAlignment('top').setWrap(true);
}

/**
 * Add Priority column conditional formatting
 */
function addPriorityFormatting(sheet) {
    const priorityColumn = 19; // Column S
    const range = sheet.getRange(11, priorityColumn, 1000, 1);

    // Clear existing rules for this range
    const rules = sheet.getConditionalFormatRules();
    const filteredRules = rules.filter(rule => {
        const ruleRange = rule.getRanges()[0];
        return ruleRange.getColumn() !== priorityColumn;
    });

    // CRITICAL - Red
    const criticalRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('CRITICAL')
        .setBackground('#F4CCCC')
        .setFontColor('#990000')
        .setBold(true)
        .setRanges([range])
        .build();

    // HIGH - Orange
    const highRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('HIGH')
        .setBackground('#FCE5CD')
        .setFontColor('#E69138')
        .setRanges([range])
        .build();

    // MEDIUM - Yellow
    const mediumRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('MEDIUM')
        .setBackground('#FFF2CC')
        .setFontColor('#BF9000')
        .setRanges([range])
        .build();

    // LOW - Green
    const lowRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('LOW')
        .setBackground('#D9EAD3')
        .setFontColor('#38761D')
        .setRanges([range])
        .build();

    filteredRules.push(criticalRule, highRule, mediumRule, lowRule);
    sheet.setConditionalFormatRules(filteredRules);
}

/**
 * Add Action column conditional formatting
 */
function addActionFormatting(sheet) {
    const actionColumn = 18; // Column R
    const range = sheet.getRange(11, actionColumn, 1000, 1);

    const rules = sheet.getConditionalFormatRules();

    // INCREASE - Blue
    const increaseRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('INCREASE')
        .setBackground('#C9DAF8')
        .setFontColor('#1155CC')
        .setRanges([range])
        .build();

    // REDUCE - Pink
    const reduceRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('REDUCE')
        .setBackground('#EAD1DC')
        .setFontColor('#A64D79')
        .setRanges([range])
        .build();

    // PAUSE - Red
    const pauseRule = SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('PAUSE')
        .setBackground('#F4CCCC')
        .setFontColor('#990000')
        .setRanges([range])
        .build();

    rules.push(increaseRule, reduceRule, pauseRule);
    sheet.setConditionalFormatRules(rules);
}

/**
 * Add approval dropdown validation
 */
function addApprovalDropdown(sheet) {
    const approvalColumn = 20; // Column T
    const range = sheet.getRange(11, approvalColumn, 1000, 1);

    const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['APPROVE', 'REJECT', 'HOLD'], true)
        .setAllowInvalid(false)
        .build();

    range.setDataValidation(rule);
}

/**
 * Add row highlighting based on approval status
 */
function addApprovalRowHighlighting(sheet) {
    const approvalColumn = 20; // Column T
    const rowRange = sheet.getRange('A11:U1000');

    const rules = sheet.getConditionalFormatRules();

    // Approved rows - Light green
    const approveRule = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$T11="APPROVE"')
        .setBackground('#E8F5E9')
        .setRanges([rowRange])
        .build();

    // Rejected rows - Light red
    const rejectRule = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$T11="REJECT"')
        .setBackground('#FFEBEE')
        .setRanges([rowRange])
        .build();

    // Hold rows - Light yellow
    const holdRule = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$T11="HOLD"')
        .setBackground('#FFF9C4')
        .setRanges([rowRange])
        .build();

    rules.push(approveRule, rejectRule, holdRule);
    sheet.setConditionalFormatRules(rules);
}

/**
 * Setup Targeting Clauses tab
 */
function setupTargetingClausesTab(ss) {
    Logger.log('Setting up Targeting Clauses tab...');

    const sheet = ss.getSheetByName('4. Targeting Clauses');
    if (!sheet) return;

    // Clear only header rows (preserve data)
    sheet.getRange('A1:Z10').clear();

    // Add title and instructions
    sheet.getRange('A1:T1').merge();
    sheet.getRange('A1').setValue('4️⃣ TARGETING CLAUSES - READ ONLY');
    sheet.getRange('A1').setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange('A1').setBackground('#4285F4').setFontColor('#FFFFFF');

    sheet.getRange('A3:T7').merge();
    const instructions = '🎯 WHAT TO DO (Phase 1B - Optional):\n\n' +
        '1️⃣ This tab will be populated when you fetch audience targeting data\n' +
        '2️⃣ Review CVR Lift column to see which audiences perform better\n' +
        '3️⃣ Use "Approval" dropdown (column S) to approve/reject bid changes\n' +
        '4️⃣ Export approved changes with bulk file generator\n\n' +
        '💡 TIP: Focus on Set B campaigns ([KW+AUD]) to test audience targeting effectiveness.';
    sheet.getRange('A3').setValue(instructions);
    sheet.getRange('A3').setBackground('#FFF9C4').setFontSize(10).setVerticalAlignment('top').setWrap(true);

    const headers = [
        'Targeting Clause ID', 'Expression Type', 'Expression Value', 'Audience Name',
        'Campaign ID', 'Campaign Name', 'Test Group', 'Ad Group ID', 'State',
        'Current Bid', 'Clicks', 'Conversions', 'Spend', 'Sales', 'CVR',
        'CVR Lift', 'Recommended Bid', 'Action', 'Approval', 'Last Updated'
    ];

    sheet.getRange(10, 1, 1, headers.length).setValues([headers]);

    const headerRange = sheet.getRange(10, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    headerRange.setBackground('#4285F4');
    headerRange.setFontColor('#FFFFFF');

    sheet.setFrozenRows(10);

    // Add approval dropdown
    const approvalRange = sheet.getRange(11, 19, 1000, 1); // Column S
    const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['APPROVE', 'REJECT', 'HOLD'], true)
        .setAllowInvalid(false)
        .build();
    approvalRange.setDataValidation(rule);
}

/**
 * Setup Negative Keywords tab
 */
function setupNegativeKeywordsTab(ss) {
    Logger.log('Setting up Negative Keywords tab...');

    const sheet = ss.getSheetByName('5. Negative Keywords');
    if (!sheet) return;

    // Clear only header rows (preserve data)
    sheet.getRange('A1:Z10').clear();

    // Add title and instructions
    sheet.getRange('A1:H1').merge();
    sheet.getRange('A1').setValue('5️⃣ NEGATIVE KEYWORDS - READ ONLY');
    sheet.getRange('A1').setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange('A1').setBackground('#4285F4').setFontColor('#FFFFFF');

    sheet.getRange('A3:H5').merge();
    const instructions = 'ℹ️ INFO: This is a reference tab showing negative keywords preventing unwanted searches.\n\n' +
        'To add negative keywords: Use Amazon Ads Console → Campaign Settings → Negative Keywords.';
    sheet.getRange('A3').setValue(instructions);
    sheet.getRange('A3').setBackground('#E8F5E9').setFontSize(10).setVerticalAlignment('top').setWrap(true);

    const headers = [
        'Negative Keyword Text', 'Negative Keyword ID', 'Match Type',
        'Campaign ID', 'Campaign Name', 'Ad Group ID', 'State', 'Last Updated'
    ];

    sheet.getRange(10, 1, 1, headers.length).setValues([headers]);

    const headerRange = sheet.getRange(10, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    headerRange.setBackground('#4285F4');
    headerRange.setFontColor('#FFFFFF');

    sheet.setFrozenRows(10);
}

/**
 * Create custom menu (optional - for future)
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🎯 PPC Optimizer')
        .addSubMenu(ui.createMenu('⚙️ Setup')
            .addItem('📋 Create All Tabs', 'createTabsOnly')
            .addItem('📊 Setup Headers Only', 'setupHeadersOnly')
            .addItem('🎨 Apply Formatting', 'applyFormattingOnly')
            .addSeparator()
            .addItem('⚠️ Full Setup (Initial Only)', 'setupPPCSheets'))
        .addSeparator()
        .addSubMenu(ui.createMenu('🔄 Data Operations')
            .addItem('📥 Fetch PPC Data', 'showFetchInstructions')
            .addItem('� Show ENABLED Keywords Only', 'filterToEnabledOnly')
            .addItem('�🗑️ Clear All Data', 'clearAllDataWithConfirm')
            .addItem('🗑️ Clear Keywords Only', 'clearKeywordsOnly'))
        .addSeparator()
        .addItem('📊 Generate Bulk File', 'generateBulkFile')
        .addToUi();
}

/**
 * Placeholder for bulk file generation (Phase 2)
 */
function generateBulkFile() {
    SpreadsheetApp.getUi().alert(
        'Bulk file generation is not yet implemented.\n' +
        'Please run: node generate-bulk-csv.js'
    );
}

/**
 * Filter Keywords sheet to show only ENABLED keywords
 */
function filterToEnabledOnly() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('3. Keywords');

    if (!sheet) {
        SpreadsheetApp.getUi().alert('❌ Keywords sheet not found!');
        return;
    }

    // Get the data range (assuming headers are in row 10)
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow <= 10) {
        SpreadsheetApp.getUi().alert('⚠️ No data found in Keywords sheet');
        return;
    }

    // Remove existing filter if any
    const existingFilter = sheet.getFilter();
    if (existingFilter) {
        existingFilter.remove();
    }

    // Create filter on entire data range
    const filterRange = sheet.getRange(10, 1, lastRow - 9, lastCol);
    const filter = filterRange.createFilter();

    // Find the "State" column (column H is index 8)
    const stateColumnIndex = 8;

    // Apply filter to show only ENABLED
    const criteria = SpreadsheetApp.newFilterCriteria()
        .setHiddenValues(['ARCHIVED', 'PAUSED'])
        .build();

    filter.setColumnFilterCriteria(stateColumnIndex, criteria);

    SpreadsheetApp.getUi().alert('✅ Filter applied! Now showing ENABLED keywords only.\n\nTo see all keywords again, click Data → Remove filter.');
}

/**
 * Create tabs only (doesn't touch data)
 */
function createTabsOnly() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    createTabsIfNeeded(ss);
    SpreadsheetApp.getUi().alert('✅ Tabs created successfully!');
}

/**
 * Setup headers only (preserves data in rows 11+)
 */
function setupHeadersOnly() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    Logger.log('Setting up headers (preserving data)...');
    setupCampaignsTab(ss);
    setupAdGroupsTab(ss);
    setupKeywordsTab(ss);
    setupTargetingClausesTab(ss);
    setupNegativeKeywordsTab(ss);

    SpreadsheetApp.getUi().alert('✅ Headers refreshed! Your data is safe.');
}

/**
 * Apply formatting only (colors, dropdowns, etc.)
 */
function applyFormattingOnly() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Keywords');

    if (!sheet) {
        SpreadsheetApp.getUi().alert('❌ Keywords tab not found!');
        return;
    }

    addPriorityFormatting(sheet);
    addActionFormatting(sheet);
    addApprovalDropdown(sheet);
    addApprovalRowHighlighting(sheet);

    SpreadsheetApp.getUi().alert('✅ Formatting applied!');
}

/**
 * Show instructions for fetching PPC data
 */
function showFetchInstructions() {
    const ui = SpreadsheetApp.getUi();
    const html = HtmlService.createHtmlOutput(
        '<h2>Fetch PPC Data from Amazon</h2>' +
        '<p><strong>Run this command in your terminal:</strong></p>' +
        '<pre style="background:#f0f0f0;padding:10px;border-radius:5px;">cd C:\\Users\\AATTARAN\\workspace\\amazon-ppc-platform<br>node fetch-ppc-data.js</pre>' +
        '<p><strong>This will:</strong></p>' +
        '<ul>' +
        '<li>Fetch campaigns, ad groups, and keywords from Amazon</li>' +
        '<li>Sync all data to this Google Sheet</li>' +
        '<li>Take about 3-5 minutes</li>' +
        '</ul>' +
        '<p><em>Note: This must be run from your computer terminal, not from Google Sheets.</em></p>'
    ).setWidth(500).setHeight(300);

    ui.showModalDialog(html, '📥 Fetch PPC Data Instructions');
}

/**
 * Clear all data with confirmation
 */
function clearAllDataWithConfirm() {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
        '⚠️ WARNING',
        'This will delete ALL data from all tabs (rows 11+).\n\nAre you sure?',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        ['PPC Campaigns', 'Ad Groups', 'Keywords', 'Targeting Clauses', 'Negative Keywords'].forEach(tabName => {
            const sheet = ss.getSheetByName(tabName);
            if (sheet) {
                const lastRow = sheet.getLastRow();
                if (lastRow >= 11) {
                    sheet.getRange(`A11:Z${lastRow}`).clear();
                }
            }
        });

        ui.alert('✅ All data cleared. Headers preserved.');
    }
}

/**
 * Clear keywords only
 */
function clearKeywordsOnly() {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
        '⚠️ Clear Keywords',
        'This will delete all keyword data (rows 11+).\n\nContinue?',
        ui.ButtonSet.YES_NO
    );

    if (response === ui.Button.YES) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('Keywords');

        if (sheet) {
            const lastRow = sheet.getLastRow();
            if (lastRow >= 11) {
                sheet.getRange(`A11:Z${lastRow}`).clear();
            }
            ui.alert('✅ Keywords cleared.');
        }
    }
}
