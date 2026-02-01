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
    SpreadsheetApp.getUi().alert('✅ PPC Sheets configured successfully!');
}

/**
 * Create tabs if they don't exist
 */
function createTabsIfNeeded(ss) {
    const requiredTabs = [
        'PPC Campaigns',
        'Ad Groups',
        'Keywords',
        'Targeting Clauses',
        'Negative Keywords'
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

    const sheet = ss.getSheetByName('PPC Campaigns');
    if (!sheet) {
        Logger.log('⚠️ PPC Campaigns tab not found, skipping');
        return;
    }

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

    const sheet = ss.getSheetByName('Ad Groups');
    if (!sheet) return;

    // Clear existing content
    sheet.clear();

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

    // Add dashboard placeholder
    sheet.getRange('A1').setValue('📊 AD GROUPS DASHBOARD');
    sheet.getRange('A1').setFontSize(18).setFontWeight('bold');
}

/**
 * Setup Keywords tab with conditional formatting and dropdowns
 */
function setupKeywordsTab(ss) {
    Logger.log('Setting up Keywords tab...');

    const sheet = ss.getSheetByName('Keywords');
    if (!sheet) return;

    // Clear existing content
    sheet.clear();

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
    sheet.getRange('A1').setValue('📊 PPC KEYWORDS DASHBOARD');
    sheet.getRange('A1').setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center');

    // Row 3: Stats placeholders
    sheet.getRange('A3').setValue('📊 SET A (Keywords Only)');
    sheet.getRange('A3').setFontWeight('bold');

    sheet.getRange('I3').setValue('📊 SET B (Keywords + Audiences)');
    sheet.getRange('I3').setFontWeight('bold');

    // Rows 5-7: Instructions
    sheet.getRange('A5:U7').merge();
    const instructions =
        'HOW TO USE:\n' +
        '1. Review keywords with CRITICAL priority (red) first\n' +
        '2. Click "Approval" dropdown and select APPROVE, REJECT, or HOLD\n' +
        '3. Row highlights green (approved), red (rejected), or yellow (hold)\n' +
        '4. When ready, use PPC Optimizer menu → Generate Bulk File\n' +
        '5. Upload Excel file to Amazon Ads Console';

    sheet.getRange('A5').setValue(instructions);
    sheet.getRange('A5').setBackground('#F3F3F3').setFontSize(10);
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

    const sheet = ss.getSheetByName('Targeting Clauses');
    if (!sheet) return;

    sheet.clear();

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

    sheet.getRange('A1').setValue('📊 AUDIENCE TARGETING CLAUSES');
    sheet.getRange('A1').setFontSize(18).setFontWeight('bold');

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

    const sheet = ss.getSheetByName('Negative Keywords');
    if (!sheet) return;

    sheet.clear();

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

    sheet.getRange('A1').setValue('📊 NEGATIVE KEYWORDS');
    sheet.getRange('A1').setFontSize(18).setFontWeight('bold');
}

/**
 * Create custom menu (optional - for future)
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🎯 PPC Optimizer')
        .addItem('🔄 Refresh Setup', 'setupPPCSheets')
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
