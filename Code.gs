/**
 * Code.gs — PPC Sync for Google Sheets
 *
 * Runs the full campaign + keyword pipeline entirely within Google Apps Script.
 * No local machine or Node.js needed.
 *
 * ─── ONE-TIME SETUP ──────────────────────────────────────────────────────────
 * In Apps Script editor: Extensions > Apps Script
 * Go to: ⚙️ Project Settings > Script properties > Add property
 *
 *   AMAZON_CLIENT_ID      your client ID
 *   AMAZON_CLIENT_SECRET  your client secret
 *   AMAZON_REFRESH_TOKEN  your refresh token
 *   AMAZON_PROFILE_ID     1130011681132849
 *   TARGET_ACOS           30   (optional, default 30)
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 * In Google Sheets: click "🔄 PPC Sync" menu
 *   • Sync Campaigns + Request Metrics   → Campaign-level data (auto-applies in ~15 min)
 *   • Sync Keyword ACOS                  → Keyword ACOS analysis (auto-applies in ~15 min)
 *   • Sync Search Terms                  → Search term intelligence (auto-applies in ~15 min)
 *   • Push Bid Updates to Amazon         → Reads columns U/V and pushes live campaign changes
 *   • Push Keyword Bid Updates to Amazon → Reads Keyword Performance cols S/U and pushes live
 */

// ─── Config ───────────────────────────────────────────────────────────────────

var SHEET_NAME  = 'PPC Campaigns';
var DATA_START  = 11;   // first data row (1-based)
var HEADER_ROW  = 10;
var MIN_VPC     = 12;
var REPORT_DAYS = 30;
var MAX_RETRIES = 3;

var KW_SHEET_NAME = 'Keyword Performance';

// Keyword bid optimization — Rawlings 2026 Framework
var KW_TARGET_ACOS    = 0.30;   // 30% target ACOS
var KW_MAX_CHANGE_PCT = 0.20;   // ±20% max bid change
var KW_BLEEDER_CLICKS = 30;     // clicks threshold for bleeder (no sales)
var KW_WINNER_ACOS    = 15;     // ACOS% threshold for winner
var KW_WINNER_ORDERS  = 5;      // min orders for winner
var KW_MIN_BID        = 0.02;   // Amazon minimum keyword bid
var KW_SCALE_UP_PCT   = 0.10;   // winner scale-up %

// Search Term intelligence
var ST_SHEET_NAME     = 'Search Terms';
var ST_REPORT_DAYS    = 30;
var ST_BLEEDER_CLICKS = 20;    // lower than KW (20 vs 30) — more granular data
var ST_BLEEDER_SPEND  = 5;     // $5 min spend for negative candidate
var ST_NEG_CLICKS     = 15;    // clicks threshold for negative keyword candidate
var ST_WINNER_ACOS    = 15;    // ACOS% threshold for winner
var ST_WINNER_ORDERS  = 3;     // min orders (lower than KW: 3 vs 5)

var HEADERS = [
  'Campaign Name', 'State', 'Type', 'Daily Budget ($)',
  'Spend 30d ($)', 'Sales 30d ($)', 'Impressions', 'Clicks', 'Orders',
  'CTR%', 'CPC ($)', 'CVR%', 'ACOS%', 'ROAS', 'VPC ($)',
  'Target ACOS', 'Min VPC ($)',
  'Bleeder?', 'Severity', 'Score', 'Action', 'Bid Δ ($)',
  'Campaign ID', 'Last Updated'
];

var KW_HEADERS = [
  'Keyword', 'Keyword ID', 'Match Type', 'Campaign', 'State', 'Bid ($)',
  'Clicks', 'Impressions', 'Spend ($)', 'Orders', 'Sales ($)',
  'CTR%', 'CPC ($)', 'ACOS%', 'CVR%', 'Tag',
  'Ideal Bid', 'Bid Δ ($)', 'Action', 'Reason', 'New Bid ($)'
];

var ST_HEADERS = [
  'Search Term',          // A
  'Campaign',             // B
  'Ad Group',             // C
  'Triggering Keyword',   // D
  'Match Type',           // E
  'Impressions',          // F
  'Clicks',               // G
  'Spend ($)',            // H
  'Orders',               // I
  'Sales ($)',            // J
  'CTR%',                 // K
  'CPC ($)',              // L
  'ACOS%',                // M
  'CVR%',                 // N
  'ROAS',                 // O
  'Tag',                  // P
  'Targeted?',            // Q
  'Opportunity',          // R
  'Reason',               // S
  'Action',               // T  (dropdown: APPROVE / SKIP)
  'Campaign ID',          // U  (hidden — for API)
  'Ad Group ID'           // V  (hidden — for API)
];

// ─── Menu ─────────────────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 PPC Sync')
    .addItem('📖 How to Use This Sheet', 'showInstructions')
    .addSeparator()
    .addItem('Sync Campaigns + Request Metrics', 'startSync')
    .addItem('Check & Apply Metrics Now', 'checkAndApplyReport_')
    .addSeparator()
    .addItem('Sync Keyword ACOS', 'startKeywordSync')
    .addItem('Check Keyword Metrics Now', 'checkAndApplyKeywordReport_')
    .addSeparator()
    .addItem('Sync Search Terms', 'startSearchTermSync')
    .addItem('Check Search Term Report', 'checkAndApplySearchTermReport_')
    .addItem('Push Search Term Actions to Amazon', 'pushSearchTermActions')
    .addSeparator()
    .addItem('Push Bid Updates to Amazon', 'pushBidUpdates')
    .addItem('Push Keyword Bid Updates to Amazon', 'pushKeywordBidUpdates')
    .addSeparator()
    .addItem('Clear Pending Report', 'clearPendingReport')
    .addSeparator()
    .addItem('🗑 Clean Up Old Sheets', 'cleanupOldSheets')
    .addToUi();
}

// ─── Phase 1: Fetch campaigns + request report ────────────────────────────────

function startSync() {
  var props = PropertiesService.getScriptProperties();
  var ss    = SpreadsheetApp.getActiveSpreadsheet();

  validateProps_(props);

  ss.toast('Authenticating with Amazon...', '🔄 PPC Sync', 5);
  var token = getAccessToken_(props);

  ss.toast('Fetching campaigns...', '🔄 PPC Sync', 60);
  var campaigns = fetchAllCampaigns_(token, props);
  Logger.log('Fetched ' + campaigns.length + ' campaigns');

  ss.toast('Writing ' + campaigns.length + ' campaigns to sheet...', '🔄 PPC Sync', 15);
  writeCampaignsToSheet_(ss, campaigns, props);

  ss.toast('Requesting 30-day metrics report...', '🔄 PPC Sync', 15);
  var reportId = requestCampaignReport_(token, props);
  Logger.log('Report requested: ' + reportId);

  props.setProperties({
    REPORT_ID:      reportId,
    REPORT_RETRIES: '0'
  });

  deleteTriggerByName_('checkAndApplyReport_');
  ScriptApp.newTrigger('checkAndApplyReport_')
    .timeBased()
    .after(15 * 60 * 1000)
    .create();

  ss.toast(
    campaigns.length + ' campaigns synced. Metrics will auto-apply in ~15 min.',
    '✅ Done', 10
  );
}

// ─── Phase 2: Check campaign report status + apply metrics ────────────────────

function checkAndApplyReport_() {
  deleteTriggerByName_('checkAndApplyReport_');

  var props    = PropertiesService.getScriptProperties();
  var reportId = props.getProperty('REPORT_ID');

  if (!reportId) {
    Logger.log('checkAndApplyReport_: No pending report found.');
    return;
  }

  var retries = parseInt(props.getProperty('REPORT_RETRIES') || '0', 10);
  var ss      = SpreadsheetApp.getActiveSpreadsheet();

  Logger.log('Checking report ' + reportId + ' (attempt ' + (retries + 1) + ')');

  var token  = getAccessToken_(props);
  var status = getReportStatus_(token, reportId, props);

  if (status.state === 'COMPLETED') {
    ss.toast('Downloading and applying metrics...', '📥 PPC Metrics', 30);

    var records = downloadAndParseReport_(status.url);
    Logger.log('Report downloaded: ' + records.length + ' records');

    var sheet = getOrCreateSheet_(ss);
    var index = readCampaignIndex_(sheet);
    applyMetrics_(sheet, records, index);

    props.deleteProperty('REPORT_ID');
    props.deleteProperty('REPORT_RETRIES');

    ss.toast('Metrics applied successfully!', '✅ Done', 10);
    Logger.log('Metrics applied.');

  } else if (status.state === 'FAILED') {
    Logger.log('Report FAILED: ' + status.reason);
    ss.toast('Report failed: ' + status.reason, '❌ Error', 15);
    clearPendingReport();

  } else {
    if (retries >= MAX_RETRIES) {
      Logger.log('Max retries reached. Report still ' + status.state);
      ss.toast(
        'Report timed out. Use menu: "Check & Apply Metrics Now" to retry.',
        '⚠️ Timeout', 15
      );
      return;
    }

    props.setProperty('REPORT_RETRIES', String(retries + 1));
    Logger.log('Report still ' + status.state + '. Rescheduling in 5 min...');

    ScriptApp.newTrigger('checkAndApplyReport_')
      .timeBased()
      .after(5 * 60 * 1000)
      .create();
  }
}

// ─── Manual cleanup ───────────────────────────────────────────────────────────

function clearPendingReport() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('REPORT_ID');
  props.deleteProperty('REPORT_RETRIES');
  props.deleteProperty('KW_REPORT_ID');
  props.deleteProperty('KW_REPORT_RETRIES');
  props.deleteProperty('ST_REPORT_ID');
  props.deleteProperty('ST_REPORT_RETRIES');
  deleteTriggerByName_('checkAndApplyReport_');
  deleteTriggerByName_('checkAndApplyKeywordReport_');
  deleteTriggerByName_('checkAndApplySearchTermReport_');
  Logger.log('Pending reports cleared.');
  SpreadsheetApp.getActiveSpreadsheet().toast('Pending reports cleared.', 'PPC Sync', 5);
}

// ─── Keyword ACOS Sync — Phase 1 ─────────────────────────────────────────────

function startKeywordSync() {
  var props = PropertiesService.getScriptProperties();
  var ss    = SpreadsheetApp.getActiveSpreadsheet();

  validateProps_(props);

  ss.toast('Authenticating...', '🔍 Keyword Sync', 5);
  var token = getAccessToken_(props);

  ss.toast('Fetching keyword structure...', '🔍 Keyword Sync', 60);
  var keywords  = fetchAllKeywords_(token, props);
  var campaigns = fetchAllCampaigns_(token, props);
  Logger.log('Fetched ' + keywords.length + ' keywords, ' + campaigns.length + ' campaigns');

  // Build campaign name lookup
  var campaignNames = {};
  campaigns.forEach(function(c) { campaignNames[c.campaignId] = c.name; });

  ss.toast('Writing ' + keywords.length + ' keywords to sheet...', '🔍 Keyword Sync', 15);
  writeKeywordsToSheet_(ss, keywords, campaignNames);

  ss.toast('Requesting keyword metrics report...', '🔍 Keyword Sync', 15);
  var reportId = requestKeywordReport_(token, props);
  Logger.log('Keyword report requested: ' + reportId);

  props.setProperties({
    KW_REPORT_ID:      reportId,
    KW_REPORT_RETRIES: '0'
  });

  deleteTriggerByName_('checkAndApplyKeywordReport_');
  ScriptApp.newTrigger('checkAndApplyKeywordReport_')
    .timeBased()
    .after(15 * 60 * 1000)
    .create();

  ss.toast(keywords.length + ' keywords synced. Metrics apply in ~15 min.', '✅ Done', 10);
}

// ─── Keyword ACOS Sync — Phase 2 ─────────────────────────────────────────────

function checkAndApplyKeywordReport_() {
  deleteTriggerByName_('checkAndApplyKeywordReport_');

  var props    = PropertiesService.getScriptProperties();
  var reportId = props.getProperty('KW_REPORT_ID');

  if (!reportId) {
    Logger.log('checkAndApplyKeywordReport_: No pending report.');
    return;
  }

  var retries = parseInt(props.getProperty('KW_REPORT_RETRIES') || '0', 10);
  var ss      = SpreadsheetApp.getActiveSpreadsheet();

  Logger.log('Checking keyword report ' + reportId + ' (attempt ' + (retries + 1) + ')');

  var token  = getAccessToken_(props);
  var status = getReportStatus_(token, reportId, props);

  if (status.state === 'COMPLETED') {
    ss.toast('Downloading keyword metrics...', '📥 Keyword Metrics', 30);

    var records = downloadAndParseReport_(status.url);
    Logger.log('Keyword report: ' + records.length + ' records');

    var sheet = ss.getSheetByName(KW_SHEET_NAME);
    if (!sheet) {
      Logger.log('Keyword Performance sheet not found');
      return;
    }

    var index = readKeywordIndex_(sheet);
    applyKeywordMetrics_(sheet, records, index);

    props.deleteProperty('KW_REPORT_ID');
    props.deleteProperty('KW_REPORT_RETRIES');

    ss.toast('Keyword metrics applied!', '✅ Done', 10);
    Logger.log('Keyword metrics applied.');

  } else if (status.state === 'FAILED') {
    Logger.log('Keyword report FAILED: ' + status.reason);
    ss.toast('Keyword report failed: ' + status.reason, '❌ Error', 15);
    props.deleteProperty('KW_REPORT_ID');
    props.deleteProperty('KW_REPORT_RETRIES');

  } else {
    if (retries >= MAX_RETRIES) {
      Logger.log('Max retries reached for keyword report.');
      ss.toast('Keyword report timed out. Use "Sync Keyword ACOS" to retry.', '⚠️ Timeout', 15);
      return;
    }

    props.setProperty('KW_REPORT_RETRIES', String(retries + 1));
    Logger.log('Keyword report still ' + status.state + '. Rescheduling in 5 min...');

    ScriptApp.newTrigger('checkAndApplyKeywordReport_')
      .timeBased()
      .after(5 * 60 * 1000)
      .create();
  }
}

// ─── Search Term Sync — Phase 1 ──────────────────────────────────────────────

function startSearchTermSync() {
  var props = PropertiesService.getScriptProperties();
  var ss    = SpreadsheetApp.getActiveSpreadsheet();

  validateProps_(props);

  ss.toast('Authenticating...', '🔍 Search Term Sync', 5);
  var token = getAccessToken_(props);

  ss.toast('Requesting search term report...', '🔍 Search Term Sync', 15);
  var reportId = requestSearchTermReport_(token, props);
  Logger.log('Search term report requested: ' + reportId);

  props.setProperties({
    ST_REPORT_ID:      reportId,
    ST_REPORT_RETRIES: '0'
  });

  deleteTriggerByName_('checkAndApplySearchTermReport_');
  ScriptApp.newTrigger('checkAndApplySearchTermReport_')
    .timeBased()
    .after(15 * 60 * 1000)
    .create();

  ss.toast('Search term report requested. Data will auto-apply in ~15 min.', '✅ Done', 10);
}

// ─── Search Term Sync — Phase 2 ──────────────────────────────────────────────

function checkAndApplySearchTermReport_() {
  deleteTriggerByName_('checkAndApplySearchTermReport_');

  var props    = PropertiesService.getScriptProperties();
  var reportId = props.getProperty('ST_REPORT_ID');

  if (!reportId) {
    Logger.log('checkAndApplySearchTermReport_: No pending report.');
    return;
  }

  var retries = parseInt(props.getProperty('ST_REPORT_RETRIES') || '0', 10);
  var ss      = SpreadsheetApp.getActiveSpreadsheet();

  Logger.log('Checking search term report ' + reportId + ' (attempt ' + (retries + 1) + ')');

  var token  = getAccessToken_(props);
  var status = getReportStatus_(token, reportId, props);

  if (status.state === 'COMPLETED') {
    ss.toast('Downloading search term data...', '📥 Search Terms', 30);

    var records = downloadAndParseReport_(status.url);
    Logger.log('Search term report: ' + records.length + ' records');

    var kwSet = buildKeywordLookup_(ss);
    writeSearchTermsToSheet_(ss, records, kwSet);

    props.deleteProperty('ST_REPORT_ID');
    props.deleteProperty('ST_REPORT_RETRIES');

    ss.toast(records.length + ' search terms applied!', '✅ Done', 10);
    Logger.log('Search terms applied.');

  } else if (status.state === 'FAILED') {
    Logger.log('Search term report FAILED: ' + status.reason);
    ss.toast('Search term report failed: ' + status.reason, '❌ Error', 15);
    props.deleteProperty('ST_REPORT_ID');
    props.deleteProperty('ST_REPORT_RETRIES');

  } else {
    if (retries >= MAX_RETRIES) {
      Logger.log('Max retries reached for search term report.');
      ss.toast('Search term report timed out. Use "Sync Search Terms" to retry.', '⚠️ Timeout', 15);
      return;
    }

    props.setProperty('ST_REPORT_RETRIES', String(retries + 1));
    Logger.log('Search term report still ' + status.state + '. Rescheduling in 5 min...');

    ScriptApp.newTrigger('checkAndApplySearchTermReport_')
      .timeBased()
      .after(5 * 60 * 1000)
      .create();
  }
}

// ─── Push Bid Updates ─────────────────────────────────────────────────────────

function pushBidUpdates() {
  var props = PropertiesService.getScriptProperties();
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  var ui    = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('Sheet "' + SHEET_NAME + '" not found. Run "Sync Campaigns + Request Metrics" first.');
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < DATA_START) {
    ui.alert('No campaign data found. Run "Sync Campaigns + Request Metrics" first.');
    return;
  }

  // Read cols A-W (1-23) from data rows
  var data    = sheet.getRange(DATA_START, 1, lastRow - DATA_START + 1, 23).getValues();
  var updates = [];

  data.forEach(function(row, i) {
    var name       = String(row[0]  || '').trim();
    var state      = String(row[1]  || '').trim().toUpperCase();
    var budget     = parseFloat(row[3])  || 0;       // D  Daily Budget
    var action     = String(row[20] || '').trim().toUpperCase();  // U  Action
    var bidDelta   = parseFloat(row[21]) || 0;       // V  Bid Δ
    var campaignId = String(row[22] || '').trim();   // W  Campaign ID

    if (!campaignId || !name) return;

    if (action === 'PAUSE' && state === 'ENABLED') {
      updates.push({
        rowNum: DATA_START + i, campaignId: campaignId, name: name, action: action,
        currentState: state, currentBudget: budget, newState: 'PAUSED', newBudget: budget
      });
    } else if ((action === 'REDUCE_BID' || action === 'INCREASE_BID') && bidDelta !== 0) {
      var newBudget = Math.max(1.00, Math.round((budget + bidDelta) * 100) / 100);
      updates.push({
        rowNum: DATA_START + i, campaignId: campaignId, name: name, action: action,
        currentState: state, currentBudget: budget, newState: null, newBudget: newBudget
      });
    }
  });

  if (updates.length === 0) {
    ui.alert('No actionable recommendations found.\n\nRun "Sync Campaigns + Request Metrics" first so columns U and V have PAUSE / REDUCE_BID / INCREASE_BID values.');
    return;
  }

  // Build preview (max 10 lines)
  var pauses    = updates.filter(function(u) { return u.action === 'PAUSE'; });
  var reduces   = updates.filter(function(u) { return u.action === 'REDUCE_BID'; });
  var increases = updates.filter(function(u) { return u.action === 'INCREASE_BID'; });

  var preview = 'Changes to push (' + updates.length + ' campaigns):\n\n';
  if (pauses.length)    preview += '⏸ PAUSE:    ' + pauses.length    + ' campaigns\n';
  if (reduces.length)   preview += '↓ REDUCE:   ' + reduces.length   + ' campaigns\n';
  if (increases.length) preview += '↑ INCREASE: ' + increases.length + ' campaigns\n';

  var sample = updates.slice(0, 5);
  preview += '\nSample:\n';
  sample.forEach(function(u) {
    if (u.newState) {
      preview += '  ⏸ ' + u.name + '\n';
    } else {
      preview += '  ' + (u.action === 'REDUCE_BID' ? '↓' : '↑') + ' ' + u.name +
                 '  $' + u.currentBudget.toFixed(2) + ' → $' + u.newBudget.toFixed(2) + '\n';
    }
  });
  if (updates.length > 5) preview += '  ... and ' + (updates.length - 5) + ' more\n';
  preview += '\nPush these changes LIVE to Amazon?';

  var result = ui.alert('Push Bid Updates', preview, ui.ButtonSet.YES_NO);
  if (result !== ui.Button.YES) {
    ss.toast('Push cancelled.', 'PPC Sync', 5);
    return;
  }

  validateProps_(props);

  ss.toast('Authenticating with Amazon...', '🔄 Pushing Bids', 5);
  var token = getAccessToken_(props);

  ss.toast('Pushing ' + updates.length + ' updates...', '🔄 Pushing Bids', 30);
  var results = pushCampaignUpdates_(token, updates, props);

  if (results.success.length > 0) {
    writeUpdateResultsToSheet_(sheet, results.success);
  }

  var msg = '✅ ' + results.success.length + ' updated';
  if (results.error.length > 0) msg += ', ❌ ' + results.error.length + ' failed';
  ss.toast(msg, 'Push Complete', 10);

  Logger.log('Push complete: success=' + results.success.length + ', error=' + results.error.length);
}

function pushCampaignUpdates_(token, updates, props) {
  var clientId  = props.getProperty('AMAZON_CLIENT_ID');
  var profileId = props.getProperty('AMAZON_PROFILE_ID');
  var results   = { success: [], error: [] };
  var batchSize = 100;

  for (var i = 0; i < updates.length; i += batchSize) {
    var batch = updates.slice(i, i + batchSize);

    var payload = {
      campaigns: batch.map(function(u) {
        var change = { campaignId: u.campaignId };
        if (u.newState) change.state = u.newState;
        if (u.newBudget !== u.currentBudget) {
          change.budget = { budgetType: 'DAILY', budget: u.newBudget };
        }
        return change;
      })
    };

    var response = UrlFetchApp.fetch('https://advertising-api.amazon.com/sp/campaigns', {
      method:  'PUT',
      headers: {
        'Authorization':                   'Bearer ' + token,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope':    profileId,
        'Content-Type':                    'application/vnd.spcampaign.v3+json',
        'Accept':                          'application/vnd.spcampaign.v3+json'
      },
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('Batch PUT error ' + response.getResponseCode() + ': ' + response.getContentText());
      batch.forEach(function(u) {
        results.error.push({ u: u, msg: 'HTTP ' + response.getResponseCode() });
      });
      continue;
    }

    var data       = JSON.parse(response.getContentText());
    var successIds = {};
    (data.campaigns && data.campaigns.success || []).forEach(function(s) {
      successIds[String(s.campaignId)] = true;
    });
    var errorMap = {};
    (data.campaigns && data.campaigns.error || []).forEach(function(e) {
      errorMap[String(e.campaignId)] = e.errorMessage || e.code || 'Unknown';
    });

    batch.forEach(function(u) {
      if (errorMap[u.campaignId]) {
        results.error.push({ u: u, msg: errorMap[u.campaignId] });
      } else {
        results.success.push(u);  // success or not in error list
      }
    });

    Logger.log('Batch ' + (Math.floor(i / batchSize) + 1) + ': ' + batch.length + ' sent');
  }

  return results;
}

function writeUpdateResultsToSheet_(sheet, successUpdates) {
  successUpdates.forEach(function(u) {
    if (u.newState && u.newState !== u.currentState) {
      sheet.getRange(u.rowNum, 2).setValue(u.newState);   // B  State
    }
    if (u.newBudget !== u.currentBudget) {
      sheet.getRange(u.rowNum, 4).setValue(u.newBudget);  // D  Daily Budget
    }
  });
}

// ─── Push Keyword Bid Updates ─────────────────────────────────────────────────

function pushKeywordBidUpdates() {
  var props = PropertiesService.getScriptProperties();
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(KW_SHEET_NAME);
  var ui    = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('Sheet "' + KW_SHEET_NAME + '" not found. Run "Sync Keyword ACOS" first.');
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('No keyword data found. Run "Sync Keyword ACOS" first.');
    return;
  }

  // Read cols A-U (1-21) from data rows (row 2+)
  var data    = sheet.getRange(2, 1, lastRow - 1, KW_HEADERS.length).getValues();
  var updates = [];

  data.forEach(function(row, i) {
    var keyword   = String(row[0]  || '').trim();
    var keywordId = String(row[1]  || '').trim();
    var state     = String(row[4]  || '').trim().toUpperCase();
    var currentBid = parseFloat(row[5]) || 0;       // F  Bid ($)
    var action    = String(row[18] || '').trim().toUpperCase();  // S  Action
    var newBid    = parseFloat(row[20]) || 0;       // U  New Bid ($)

    if (!keywordId || !keyword) return;
    if (action === 'MAINTAIN' || action === '') return;

    if (action === 'PAUSE' && state === 'ENABLED') {
      updates.push({
        rowNum: 2 + i, keywordId: keywordId, keyword: keyword, action: action,
        currentState: state, currentBid: currentBid,
        newState: 'PAUSED', newBid: currentBid
      });
    } else if ((action === 'INCREASE' || action === 'REDUCE') && newBid > 0) {
      var safeBid = Math.max(KW_MIN_BID, Math.round(newBid * 100) / 100);
      updates.push({
        rowNum: 2 + i, keywordId: keywordId, keyword: keyword, action: action,
        currentState: state, currentBid: currentBid,
        newState: null, newBid: safeBid
      });
    }
  });

  if (updates.length === 0) {
    ui.alert('No actionable keyword recommendations found.\n\nRun "Sync Keyword ACOS" first, then wait for metrics to auto-apply (~15 min).');
    return;
  }

  // Build preview
  var pauses    = updates.filter(function(u) { return u.action === 'PAUSE'; });
  var reduces   = updates.filter(function(u) { return u.action === 'REDUCE'; });
  var increases = updates.filter(function(u) { return u.action === 'INCREASE'; });

  var preview = 'Keyword changes to push (' + updates.length + ' keywords):\n\n';
  if (pauses.length)    preview += '⏸ PAUSE:    ' + pauses.length    + ' keywords\n';
  if (reduces.length)   preview += '↓ REDUCE:   ' + reduces.length   + ' keywords\n';
  if (increases.length) preview += '↑ INCREASE: ' + increases.length + ' keywords\n';

  var sample = updates.slice(0, 5);
  preview += '\nSample:\n';
  sample.forEach(function(u) {
    if (u.action === 'PAUSE') {
      preview += '  ⏸ ' + u.keyword + '\n';
    } else {
      preview += '  ' + (u.action === 'REDUCE' ? '↓' : '↑') + ' ' + u.keyword +
                 '  $' + u.currentBid.toFixed(2) + ' → $' + u.newBid.toFixed(2) + '\n';
    }
  });
  if (updates.length > 5) preview += '  ... and ' + (updates.length - 5) + ' more\n';
  preview += '\nPush these keyword changes LIVE to Amazon?';

  var result = ui.alert('Push Keyword Bid Updates', preview, ui.ButtonSet.YES_NO);
  if (result !== ui.Button.YES) {
    ss.toast('Push cancelled.', 'PPC Sync', 5);
    return;
  }

  validateProps_(props);

  ss.toast('Authenticating with Amazon...', '🔄 Pushing Keyword Bids', 5);
  var token = getAccessToken_(props);

  ss.toast('Pushing ' + updates.length + ' keyword updates...', '🔄 Pushing Keyword Bids', 30);
  var results = pushKeywordUpdates_(token, updates, props);

  if (results.success.length > 0) {
    writeKeywordUpdateResults_(sheet, results.success);
  }

  var msg = '✅ ' + results.success.length + ' keywords updated';
  if (results.error.length > 0) msg += ', ❌ ' + results.error.length + ' failed';
  ss.toast(msg, 'Keyword Push Complete', 10);

  Logger.log('Keyword push: success=' + results.success.length + ', error=' + results.error.length);
}

function pushKeywordUpdates_(token, updates, props) {
  var clientId  = props.getProperty('AMAZON_CLIENT_ID');
  var profileId = props.getProperty('AMAZON_PROFILE_ID');
  var results   = { success: [], error: [] };
  var batchSize = 100;

  for (var i = 0; i < updates.length; i += batchSize) {
    var batch = updates.slice(i, i + batchSize);

    var payload = {
      keywords: batch.map(function(u) {
        var change = { keywordId: u.keywordId };
        if (u.newState) change.state = u.newState;
        if (u.newBid !== u.currentBid && !u.newState) {
          change.bid = u.newBid;
        }
        return change;
      })
    };

    var response = UrlFetchApp.fetch('https://advertising-api.amazon.com/sp/keywords', {
      method:  'PUT',
      headers: {
        'Authorization':                   'Bearer ' + token,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope':    profileId,
        'Content-Type':                    'application/vnd.spKeyword.v3+json',
        'Accept':                          'application/vnd.spKeyword.v3+json'
      },
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('Keyword batch PUT error ' + response.getResponseCode() + ': ' + response.getContentText());
      batch.forEach(function(u) {
        results.error.push({ u: u, msg: 'HTTP ' + response.getResponseCode() });
      });
      continue;
    }

    var data       = JSON.parse(response.getContentText());
    var successIds = {};
    (data.keywords && data.keywords.success || []).forEach(function(s) {
      successIds[String(s.keywordId)] = true;
    });
    var errorMap = {};
    (data.keywords && data.keywords.error || []).forEach(function(e) {
      errorMap[String(e.keywordId)] = e.errorMessage || e.code || 'Unknown';
    });

    batch.forEach(function(u) {
      if (errorMap[u.keywordId]) {
        results.error.push({ u: u, msg: errorMap[u.keywordId] });
      } else {
        results.success.push(u);
      }
    });

    Logger.log('Keyword batch ' + (Math.floor(i / batchSize) + 1) + ': ' + batch.length + ' sent');
  }

  return results;
}

function writeKeywordUpdateResults_(sheet, successUpdates) {
  successUpdates.forEach(function(u) {
    if (u.newState && u.newState !== u.currentState) {
      sheet.getRange(u.rowNum, 5).setValue(u.newState);   // E  State
    }
    if (u.newBid !== u.currentBid && !u.newState) {
      sheet.getRange(u.rowNum, 6).setValue(u.newBid);     // F  Bid ($)
    }
  });
}

// ─── Amazon API helpers ───────────────────────────────────────────────────────

function getAccessToken_(props) {
  var response = UrlFetchApp.fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    payload:
      'grant_type=refresh_token' +
      '&refresh_token=' + encodeURIComponent(props.getProperty('AMAZON_REFRESH_TOKEN')) +
      '&client_id='     + encodeURIComponent(props.getProperty('AMAZON_CLIENT_ID'))     +
      '&client_secret=' + encodeURIComponent(props.getProperty('AMAZON_CLIENT_SECRET')),
    muteHttpExceptions: true
  });

  var data = JSON.parse(response.getContentText());
  if (response.getResponseCode() !== 200 || data.error) {
    throw new Error('Auth failed: ' + (data.error_description || response.getContentText()));
  }
  return data.access_token;
}

function fetchAllCampaigns_(token, props) {
  var campaigns = [];
  var nextToken = null;
  var page      = 1;
  var clientId  = props.getProperty('AMAZON_CLIENT_ID');
  var profileId = props.getProperty('AMAZON_PROFILE_ID');

  do {
    var body = {
      maxResults:  100,
      stateFilter: { include: ['ENABLED', 'PAUSED', 'ARCHIVED'] }
    };
    if (nextToken) body.nextToken = nextToken;

    var response = UrlFetchApp.fetch('https://advertising-api.amazon.com/sp/campaigns/list', {
      method:  'POST',
      headers: {
        'Authorization':                   'Bearer ' + token,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope':    profileId,
        'Content-Type':                    'application/vnd.spcampaign.v3+json',
        'Accept':                          'application/vnd.spcampaign.v3+json'
      },
      payload:            JSON.stringify(body),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('Campaigns API error ' + response.getResponseCode() + ': ' + response.getContentText());
    }

    var data  = JSON.parse(response.getContentText());
    var batch = data.campaigns || [];
    campaigns = campaigns.concat(batch);
    nextToken = data.nextToken || null;

    Logger.log('Campaigns page ' + page + ': ' + batch.length + ' (total: ' + campaigns.length + ')');
    page++;

  } while (nextToken);

  return campaigns;
}

function fetchAllKeywords_(token, props) {
  var keywords  = [];
  var nextToken = null;
  var page      = 1;
  var clientId  = props.getProperty('AMAZON_CLIENT_ID');
  var profileId = props.getProperty('AMAZON_PROFILE_ID');

  do {
    var body = { maxResults: 100, stateFilter: { include: ['ENABLED', 'PAUSED'] } };
    if (nextToken) body.nextToken = nextToken;

    var response = UrlFetchApp.fetch('https://advertising-api.amazon.com/sp/keywords/list', {
      method:  'POST',
      headers: {
        'Authorization':                   'Bearer ' + token,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope':    profileId,
        'Content-Type':                    'application/vnd.spkeyword.v3+json',
        'Accept':                          'application/vnd.spkeyword.v3+json'
      },
      payload:            JSON.stringify(body),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error('Keywords API error ' + response.getResponseCode() + ': ' + response.getContentText());
    }

    var data  = JSON.parse(response.getContentText());
    var batch = data.keywords || [];
    keywords  = keywords.concat(batch);
    nextToken = data.nextToken || null;

    Logger.log('Keywords page ' + page + ': ' + batch.length + ' (total: ' + keywords.length + ')');
    page++;

  } while (nextToken);

  return keywords;
}

function requestCampaignReport_(token, props) {
  var clientId  = props.getProperty('AMAZON_CLIENT_ID');
  var profileId = props.getProperty('AMAZON_PROFILE_ID');
  var tz        = Session.getScriptTimeZone();

  var endDate   = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var startDate = Utilities.formatDate(
    new Date(Date.now() - REPORT_DAYS * 24 * 60 * 60 * 1000), tz, 'yyyy-MM-dd'
  );

  Logger.log('Campaign report date range: ' + startDate + ' → ' + endDate);

  var response = UrlFetchApp.fetch('https://advertising-api.amazon.com/reporting/reports', {
    method:  'POST',
    headers: {
      'Authorization':                   'Bearer ' + token,
      'Amazon-Advertising-API-ClientId': clientId,
      'Amazon-Advertising-API-Scope':    profileId,
      'Content-Type':                    'application/json',
      'Accept':                          'application/json'
    },
    payload: JSON.stringify({
      name:      'Campaign Metrics ' + startDate,
      startDate: startDate,
      endDate:   endDate,
      configuration: {
        adProduct:    'SPONSORED_PRODUCTS',
        groupBy:      ['campaign'],
        columns:      ['campaignId', 'campaignName', 'impressions', 'clicks', 'cost', 'purchases14d', 'sales14d'],
        reportTypeId: 'spCampaigns',
        timeUnit:     'SUMMARY',
        format:       'GZIP_JSON'
      }
    }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Campaign report request failed ' + response.getResponseCode() + ': ' + response.getContentText());
  }

  var data = JSON.parse(response.getContentText());
  if (!data.reportId) throw new Error('No reportId in response: ' + response.getContentText());
  return data.reportId;
}

function requestKeywordReport_(token, props) {
  var clientId  = props.getProperty('AMAZON_CLIENT_ID');
  var profileId = props.getProperty('AMAZON_PROFILE_ID');
  var tz        = Session.getScriptTimeZone();

  var endDate   = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var startDate = Utilities.formatDate(
    new Date(Date.now() - REPORT_DAYS * 24 * 60 * 60 * 1000), tz, 'yyyy-MM-dd'
  );

  Logger.log('Keyword report date range: ' + startDate + ' → ' + endDate);

  var response = UrlFetchApp.fetch('https://advertising-api.amazon.com/reporting/reports', {
    method:  'POST',
    headers: {
      'Authorization':                   'Bearer ' + token,
      'Amazon-Advertising-API-ClientId': clientId,
      'Amazon-Advertising-API-Scope':    profileId,
      'Content-Type':                    'application/json',
      'Accept':                          'application/json'
    },
    payload: JSON.stringify({
      name:      'Keyword Metrics ' + startDate,
      startDate: startDate,
      endDate:   endDate,
      configuration: {
        adProduct:    'SPONSORED_PRODUCTS',
        groupBy:      ['targeting'],
        columns:      ['campaignId', 'keywordId', 'keyword', 'matchType',
                       'impressions', 'clicks', 'cost', 'purchases14d', 'sales14d'],
        reportTypeId: 'spTargeting',
        timeUnit:     'SUMMARY',
        format:       'GZIP_JSON'
      }
    }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Keyword report request failed ' + response.getResponseCode() + ': ' + response.getContentText());
  }

  var data = JSON.parse(response.getContentText());
  if (!data.reportId) throw new Error('No reportId: ' + response.getContentText());
  return data.reportId;
}

function requestSearchTermReport_(token, props) {
  var clientId  = props.getProperty('AMAZON_CLIENT_ID');
  var profileId = props.getProperty('AMAZON_PROFILE_ID');
  var tz        = Session.getScriptTimeZone();

  var endDate   = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var startDate = Utilities.formatDate(
    new Date(Date.now() - ST_REPORT_DAYS * 24 * 60 * 60 * 1000), tz, 'yyyy-MM-dd'
  );

  Logger.log('Search term report date range: ' + startDate + ' → ' + endDate);

  var response = UrlFetchApp.fetch('https://advertising-api.amazon.com/reporting/reports', {
    method:  'POST',
    headers: {
      'Authorization':                   'Bearer ' + token,
      'Amazon-Advertising-API-ClientId': clientId,
      'Amazon-Advertising-API-Scope':    profileId,
      'Content-Type':                    'application/vnd.createasyncreportrequest.v3+json',
      'Accept':                          'application/json'
    },
    payload: JSON.stringify({
      name:      'Search Term Report ' + startDate,
      startDate: startDate,
      endDate:   endDate,
      configuration: {
        adProduct:    'SPONSORED_PRODUCTS',
        groupBy:      ['searchTerm'],
        columns:      ['campaignName', 'campaignId', 'adGroupName', 'adGroupId',
                       'keyword', 'keywordId', 'matchType', 'searchTerm',
                       'impressions', 'clicks', 'cost', 'purchases14d', 'sales14d'],
        reportTypeId: 'spSearchTerm',
        timeUnit:     'SUMMARY',
        format:       'GZIP_JSON'
      }
    }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error('Search term report request failed ' + response.getResponseCode() + ': ' + response.getContentText());
  }

  var data = JSON.parse(response.getContentText());
  if (!data.reportId) throw new Error('No reportId: ' + response.getContentText());
  return data.reportId;
}

function getReportStatus_(token, reportId, props) {
  var response = UrlFetchApp.fetch(
    'https://advertising-api.amazon.com/reporting/reports/' + reportId,
    {
      headers: {
        'Authorization':                   'Bearer ' + token,
        'Amazon-Advertising-API-ClientId': props.getProperty('AMAZON_CLIENT_ID'),
        'Amazon-Advertising-API-Scope':    props.getProperty('AMAZON_PROFILE_ID'),
        'Accept':                          'application/json'
      },
      muteHttpExceptions: true
    }
  );

  var data = JSON.parse(response.getContentText());
  return {
    state:  data.status,
    url:    data.url || '',
    reason: JSON.stringify(data.failureReason || '')
  };
}

function downloadAndParseReport_(url) {
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error('Report download failed: ' + response.getResponseCode());
  }

  // Force content type so Utilities.ungzip() accepts the blob
  var blob = response.getBlob().setContentType('application/x-gzip');
  var text;
  try {
    text = Utilities.ungzip(blob).getDataAsString('UTF-8').trim();
  } catch (e) {
    // Fallback: maybe it's not actually gzipped
    Logger.log('ungzip failed, trying plain text: ' + e.message);
    text = response.getContentText().trim();
  }

  if (text.charAt(0) === '[') {
    return JSON.parse(text);
  }

  return text
    .split('\n')
    .filter(function(l) { return l.trim(); })
    .map(function(l) { try { return JSON.parse(l); } catch (e) { return null; } })
    .filter(function(r) { return r !== null; });
}

// ─── Sheet helpers — Campaigns ────────────────────────────────────────────────

function getOrCreateSheet_(ss) {
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    Logger.log('Created sheet: ' + SHEET_NAME);
  }
  return sheet;
}

function writeCampaignsToSheet_(ss, campaigns, props) {
  var sheet      = getOrCreateSheet_(ss);
  var targetAcos = parseFloat(props.getProperty('TARGET_ACOS') || '30');
  var today      = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  sheet.getRange(HEADER_ROW, 1, 1, HEADERS.length).setValues([HEADERS]);

  var lastRow = sheet.getLastRow();
  if (lastRow >= DATA_START) {
    sheet.getRange(DATA_START, 1, lastRow - DATA_START + 1, 24).clearContent();
  }

  if (campaigns.length === 0) return;

  var rows = campaigns.map(function(c, i) {
    return buildRow_(c, DATA_START + i, targetAcos, today);
  });

  sheet.getRange(DATA_START, 1, rows.length, 24).setValues(rows);
}

function buildRow_(campaign, rowNum, targetAcos, today) {
  var r = rowNum;

  var budget = 0;
  if (campaign.budget && typeof campaign.budget === 'object') {
    budget = campaign.budget.budget || 0;
  } else if (typeof campaign.budget === 'number') {
    budget = campaign.budget;
  }

  return [
    campaign.name,                                         // A  Campaign Name
    campaign.state,                                        // B  State
    campaign.targetingType || 'MANUAL',                    // C  Type
    budget,                                                // D  Daily Budget
    0,                                                     // E  Spend    (Phase 2 fills)
    0,                                                     // F  Sales    (Phase 2 fills)
    0,                                                     // G  Impressions
    0,                                                     // H  Clicks
    0,                                                     // I  Orders
    '=IFERROR(H'+r+'/G'+r+'*100,0)',                      // J  CTR%
    '=IFERROR(E'+r+'/H'+r+',0)',                          // K  CPC
    '=IFERROR(I'+r+'/H'+r+'*100,0)',                      // L  CVR%
    '=IFERROR(E'+r+'/F'+r+'*100,0)',                      // M  ACOS%
    '=IFERROR(F'+r+'/E'+r+',0)',                          // N  ROAS
    '=IFERROR(F'+r+'/H'+r+',0)',                          // O  VPC
    targetAcos,                                            // P  Target ACOS
    MIN_VPC,                                               // Q  Min VPC
    '=AND(E'+r+'>0,M'+r+'>P'+r+',O'+r+'<Q'+r+',B'+r+'="ENABLED")',  // R  Bleeder
    '=IF(R'+r+'=FALSE,"NONE",' +                          // S  Severity
      'IF(AND(M'+r+'>P'+r+'*2,O'+r+'<Q'+r+'*0.5),"CRITICAL",' +
      'IF(AND(M'+r+'>P'+r+'*1.5,O'+r+'<Q'+r+'*0.7),"HIGH",' +
      'IF(M'+r+'>P'+r+'*1.2,"MEDIUM","LOW"))))',
    '=IFERROR((N'+r+'*100)' +                             // T  Score
      '+IF(O'+r+'>Q'+r+',50,0)' +
      '+IF(M'+r+'<P'+r+',30,0)' +
      '-IF(R'+r+',50,0),0)',
    '=IF(R'+r+'=TRUE,' +                                  // U  Action
      'IF(S'+r+'="CRITICAL","PAUSE","REDUCE_BID"),' +
      'IF(AND(M'+r+'<P'+r+'*0.8,O'+r+'>Q'+r+'*1.2),"INCREASE_BID",' +
      'IF(T'+r+'>150,"WINNER","OPTIMIZE")))',
    '=IF(U'+r+'="PAUSE",0,' +                             // V  Bid Δ
      'IF(U'+r+'="REDUCE_BID",-(D'+r+'*0.15),' +
      'IF(U'+r+'="INCREASE_BID",D'+r+'*0.15,0)))',
    campaign.campaignId,                                   // W  Campaign ID
    today                                                  // X  Last Updated
  ];
}

function readCampaignIndex_(sheet) {
  var data  = sheet.getDataRange().getValues();
  var index = {};

  for (var i = DATA_START - 1; i < data.length; i++) {
    var id = String(data[i][22] || '').trim();   // col W = index 22
    if (id) index[id] = i + 1;
  }
  return index;
}

function applyMetrics_(sheet, records, index) {
  var lastRow = sheet.getLastRow();
  if (lastRow < DATA_START) return;

  var numRows      = lastRow - DATA_START + 1;
  var metricsRange = sheet.getRange(DATA_START, 5, numRows, 5);  // E:I
  var values       = metricsRange.getValues();

  var matched = 0, unmatched = 0;

  records.forEach(function(m) {
    var rowNum = index[String(m.campaignId || '')];
    if (!rowNum) { unmatched++; return; }

    var arrayIdx = rowNum - DATA_START;
    if (arrayIdx < 0 || arrayIdx >= values.length) { unmatched++; return; }

    values[arrayIdx][0] = Math.round(parseFloat(m.cost       || 0) * 100) / 100;  // E Spend
    values[arrayIdx][1] = Math.round(parseFloat(m.sales14d   || 0) * 100) / 100;  // F Sales
    values[arrayIdx][2] = parseInt(m.impressions  || 0, 10);                       // G Impressions
    values[arrayIdx][3] = parseInt(m.clicks       || 0, 10);                       // H Clicks
    values[arrayIdx][4] = parseInt(m.purchases14d || 0, 10);                       // I Orders

    matched++;
  });

  metricsRange.setValues(values);
  Logger.log('Campaign metrics: matched=' + matched + ', unmatched=' + unmatched);
}

// ─── Sheet helpers — Keywords ─────────────────────────────────────────────────

function writeKeywordsToSheet_(ss, keywords, campaignNames) {
  var sheet = ss.getSheetByName(KW_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(KW_SHEET_NAME);

  // Headers in row 1
  sheet.getRange(1, 1, 1, KW_HEADERS.length).setValues([KW_HEADERS]);

  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, KW_HEADERS.length).clearContent();
  }

  if (keywords.length === 0) return;

  var rows = keywords.map(function(kw) {
    var campaignName = campaignNames[kw.campaignId] || String(kw.campaignId || '');
    var bid          = typeof kw.bid === 'number' ? kw.bid : 0;

    return [
      kw.keywordText || '',                                    // A  Keyword
      String(kw.keywordId || ''),                              // B  Keyword ID
      kw.matchType || '',                                      // C  Match Type
      campaignName,                                            // D  Campaign
      kw.state || '',                                          // E  State
      bid,                                                     // F  Bid ($)
      0,                                                       // G  Clicks       (Phase 2)
      0,                                                       // H  Impressions  (Phase 2)
      0,                                                       // I  Spend ($)    (Phase 2)
      0,                                                       // J  Orders       (Phase 2)
      0,                                                       // K  Sales ($)    (Phase 2)
      0,                                                       // L  CTR%         (Phase 2)
      0,                                                       // M  CPC ($)      (Phase 2)
      0,                                                       // N  ACOS%        (Phase 2)
      0,                                                       // O  CVR%         (Phase 2)
      'NO DATA',                                               // P  Tag          (Phase 2)
      0,                                                       // Q  Ideal Bid    (Phase 2)
      0,                                                       // R  Bid Δ ($)    (Phase 2)
      '',                                                      // S  Action       (Phase 2)
      '',                                                      // T  Reason       (Phase 2)
      0                                                        // U  New Bid ($)  (Phase 2)
    ];
  });

  sheet.getRange(2, 1, rows.length, KW_HEADERS.length).setValues(rows);
  Logger.log('Wrote ' + rows.length + ' keywords to ' + KW_SHEET_NAME);
}

function readKeywordIndex_(sheet) {
  var data  = sheet.getDataRange().getValues();
  var index = {};

  // Row 1 = headers; data from row 2 (array index 1)
  // Keyword ID is column B = array index 1
  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][1] || '').trim();
    if (id) index[id] = i + 1;  // 1-based row
  }
  return index;
}

function applyKeywordMetrics_(sheet, records, index) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var numRows      = lastRow - 1;             // row 2 → lastRow
  var metricsRange = sheet.getRange(2, 7, numRows, 15);  // G:U (metrics + recommendations)
  var values       = metricsRange.getValues();

  // Read current bids from column F (col 6)
  var bidRange = sheet.getRange(2, 6, numRows, 1);
  var bids     = bidRange.getValues();

  var matched = 0, unmatched = 0;

  records.forEach(function(m) {
    var rowNum = index[String(m.keywordId || '')];
    if (!rowNum) { unmatched++; return; }

    var arrayIdx = rowNum - 2;  // 0-based (row 2 = index 0)
    if (arrayIdx < 0 || arrayIdx >= values.length) { unmatched++; return; }

    var clicks      = parseInt(m.clicks       || 0, 10);
    var impressions = parseInt(m.impressions  || 0, 10);
    var spend       = Math.round(parseFloat(m.cost       || 0) * 100) / 100;
    var orders      = parseInt(m.purchases14d || 0, 10);
    var sales       = Math.round(parseFloat(m.sales14d   || 0) * 100) / 100;
    var currentBid  = parseFloat(bids[arrayIdx][0]) || 0;

    values[arrayIdx][0] = clicks;                                                            // G  Clicks
    values[arrayIdx][1] = impressions;                                                       // H  Impressions
    values[arrayIdx][2] = spend;                                                             // I  Spend
    values[arrayIdx][3] = orders;                                                            // J  Orders
    values[arrayIdx][4] = sales;                                                             // K  Sales
    values[arrayIdx][5] = impressions > 0 ? Math.round(clicks / impressions * 10000) / 100 : 0;  // L  CTR%
    values[arrayIdx][6] = clicks > 0 ? Math.round(spend / clicks * 100) / 100 : 0;               // M  CPC
    values[arrayIdx][7] = sales > 0 ? Math.round(spend / sales * 10000) / 100 : 0;               // N  ACOS%
    values[arrayIdx][8] = clicks > 0 ? Math.round(orders / clicks * 10000) / 100 : 0;            // O  CVR%

    // P  Tag
    var tag;
    if (clicks === 0) {
      tag = 'NO DATA';
    } else if (clicks >= KW_BLEEDER_CLICKS && orders === 0) {
      tag = 'BLEEDER';
    } else {
      var acos = sales > 0 ? (spend / sales * 100) : 999;
      if (acos < 15) tag = 'WINNER';
      else if (acos < 30) tag = 'GOOD';
      else if (acos < 45) tag = 'MARGINAL';
      else tag = 'BLEEDER';
    }
    values[arrayIdx][9] = tag;

    // ─── Bid recommendation columns Q-U (Rawlings Framework) ───────────
    var rec = computeKeywordRecommendation_(clicks, orders, sales, spend, currentBid, tag);
    values[arrayIdx][10] = rec.idealBid;   // Q  Ideal Bid
    values[arrayIdx][11] = rec.bidDelta;   // R  Bid Δ ($)
    values[arrayIdx][12] = rec.action;     // S  Action
    values[arrayIdx][13] = rec.reason;     // T  Reason
    values[arrayIdx][14] = rec.newBid;     // U  New Bid ($)

    matched++;
  });

  metricsRange.setValues(values);
  Logger.log('Keyword metrics: matched=' + matched + ', unmatched=' + unmatched);

  colorKeywordRows_(sheet, lastRow);
}

/**
 * Color-code keyword rows by tier.
 *   Green  (#d9ead3) = WINNER, GOOD
 *   Yellow (#fff2cc) = MARGINAL, NO DATA
 *   Red    (#f4cccc) = BLEEDER
 */
function colorKeywordRows_(sheet, lastRow) {
  if (lastRow < 2) return;

  var numRows = lastRow - 1;
  var tags    = sheet.getRange(2, 16, numRows, 1).getValues();  // P = col 16
  var numCols = KW_HEADERS.length;

  var green  = '#d9ead3';
  var yellow = '#fff2cc';
  var red    = '#f4cccc';
  var white  = '#ffffff';

  for (var i = 0; i < numRows; i++) {
    var tag   = String(tags[i][0] || '').toUpperCase();
    var color;

    if (tag === 'WINNER' || tag === 'GOOD') {
      color = green;
    } else if (tag === 'BLEEDER') {
      color = red;
    } else if (tag === 'MARGINAL' || tag === 'NO DATA') {
      color = yellow;
    } else {
      color = white;
    }

    sheet.getRange(2 + i, 1, 1, numCols).setBackground(color);
  }

  Logger.log('Keyword rows color-coded.');
}

// ─── Sheet helpers — Search Terms ────────────────────────────────────────────

function buildKeywordLookup_(ss) {
  var sheet = ss.getSheetByName(KW_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    Logger.log('buildKeywordLookup_: Keyword Performance tab empty or missing');
    return {};
  }

  var data  = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();  // A-C
  var kwSet = {};

  data.forEach(function(row) {
    var keyword   = String(row[0] || '').trim().toLowerCase();
    var matchType = String(row[2] || '').trim().toUpperCase();
    if (keyword && matchType === 'EXACT') {
      kwSet[keyword] = true;
    }
  });

  Logger.log('Keyword lookup built: ' + Object.keys(kwSet).length + ' exact-match keywords');
  return kwSet;
}

function writeSearchTermsToSheet_(ss, records, kwSet) {
  var sheet = ss.getSheetByName(ST_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ST_SHEET_NAME);
  } else {
    sheet.clear();
  }

  sheet.getRange(1, 1, 1, ST_HEADERS.length).setValues([ST_HEADERS]);

  if (records.length === 0) {
    Logger.log('No search term records to write.');
    return;
  }

  var rows = records.map(function(r) {
    return buildSearchTermRow_(r, kwSet);
  });

  // Sort: WHITESPACE first, then NEGATIVE, then by spend descending
  rows.sort(function(a, b) {
    var opp_a = String(a[17] || '');  // R = index 17
    var opp_b = String(b[17] || '');
    var rank  = { 'WHITESPACE': 0, 'NEGATIVE': 1 };
    var ra    = rank[opp_a] !== undefined ? rank[opp_a] : 2;
    var rb    = rank[opp_b] !== undefined ? rank[opp_b] : 2;
    if (ra !== rb) return ra - rb;
    return (parseFloat(b[7]) || 0) - (parseFloat(a[7]) || 0);  // H = spend desc
  });

  sheet.getRange(2, 1, rows.length, ST_HEADERS.length).setValues(rows);
  Logger.log('Wrote ' + rows.length + ' search terms to ' + ST_SHEET_NAME);

  // Add APPROVE / SKIP dropdown on column T for rows that have an opportunity
  var actionCol = 20;  // T = column 20
  var oppCol    = 17;  // R = index 17 (0-based)
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['APPROVE', 'SKIP'], true)
    .setAllowInvalid(false)
    .build();

  for (var i = 0; i < rows.length; i++) {
    if (rows[i][oppCol]) {  // has WHITESPACE or NEGATIVE
      sheet.getRange(2 + i, actionCol).setDataValidation(rule);
    }
  }

  // Bold the Action header and make it stand out
  sheet.getRange(1, actionCol).setFontWeight('bold').setBackground('#e8eaf6');

  colorSearchTermRows_(sheet, sheet.getLastRow());
}

function buildSearchTermRow_(record, kwSet) {
  var impressions = parseInt(record.impressions  || 0, 10);
  var clicks      = parseInt(record.clicks       || 0, 10);
  var spend       = Math.round(parseFloat(record.cost       || 0) * 100) / 100;
  var orders      = parseInt(record.purchases14d || 0, 10);
  var sales       = Math.round(parseFloat(record.sales14d   || 0) * 100) / 100;

  var ctr  = impressions > 0 ? Math.round(clicks / impressions * 10000) / 100 : 0;
  var cpc  = clicks > 0 ? Math.round(spend / clicks * 100) / 100 : 0;
  var acos = sales > 0 ? Math.round(spend / sales * 10000) / 100 : 0;
  var cvr  = clicks > 0 ? Math.round(orders / clicks * 10000) / 100 : 0;
  var roas = spend > 0 ? Math.round(sales / spend * 100) / 100 : 0;

  var tag = tagSearchTerm_(clicks, orders, sales, spend);

  var searchTerm = String(record.searchTerm || '').trim().toLowerCase();
  var targeted   = kwSet[searchTerm] ? 'YES' : 'NO';

  var opportunity = '';
  var reason      = '';

  if (orders > 0 && targeted === 'NO' && (tag === 'WINNER' || tag === 'GOOD' || tag === 'MARGINAL')) {
    opportunity = 'WHITESPACE';
    reason      = 'Add as exact match keyword (' + orders + ' orders, $' + sales.toFixed(2) + ' sales, ' + acos.toFixed(0) + '% ACOS)';
  } else if (clicks >= ST_NEG_CLICKS && orders === 0 && spend >= ST_BLEEDER_SPEND) {
    opportunity = 'NEGATIVE';
    reason      = 'Add as negative keyword (' + clicks + ' clicks, $' + spend.toFixed(2) + ' wasted)';
  }

  return [
    record.searchTerm || '',                               // A  Search Term
    record.campaignName || '',                             // B  Campaign
    record.adGroupName || '',                              // C  Ad Group
    record.keyword || '',                                  // D  Triggering Keyword
    record.matchType || '',                                // E  Match Type
    impressions,                                           // F  Impressions
    clicks,                                                // G  Clicks
    spend,                                                 // H  Spend ($)
    orders,                                                // I  Orders
    sales,                                                 // J  Sales ($)
    ctr,                                                   // K  CTR%
    cpc,                                                   // L  CPC ($)
    acos,                                                  // M  ACOS%
    cvr,                                                   // N  CVR%
    roas,                                                  // O  ROAS
    tag,                                                   // P  Tag
    targeted,                                              // Q  Targeted?
    opportunity,                                           // R  Opportunity
    reason,                                                // S  Reason
    opportunity ? '' : '',                                 // T  Action (user fills via dropdown)
    String(record.campaignId || ''),                       // U  Campaign ID
    String(record.adGroupId || '')                         // V  Ad Group ID
  ];
}

function tagSearchTerm_(clicks, orders, sales, spend) {
  if (clicks < 3) return 'NO DATA';
  if (clicks >= ST_BLEEDER_CLICKS && orders === 0) return 'BLEEDER';

  var acos = sales > 0 ? (spend / sales * 100) : 999;
  if (acos < ST_WINNER_ACOS && orders >= ST_WINNER_ORDERS) return 'WINNER';
  if (acos < 30) return 'GOOD';
  if (acos <= 50) return 'MARGINAL';
  return 'BLEEDER';
}

/**
 * Color-code search term rows.
 *   Green  (#d9ead3) = WINNER, GOOD
 *   Yellow (#fff2cc) = MARGINAL, NO DATA
 *   Red    (#f4cccc) = BLEEDER
 *   Blue   (#cfe2f3) = WHITESPACE or NEGATIVE opportunity (overrides tag color)
 */
function colorSearchTermRows_(sheet, lastRow) {
  if (lastRow < 2) return;

  var numRows = lastRow - 1;
  var data    = sheet.getRange(2, 16, numRows, 3).getValues();  // P-R (Tag, Targeted?, Opportunity)
  var numCols = ST_HEADERS.length;

  var green  = '#d9ead3';
  var yellow = '#fff2cc';
  var red    = '#f4cccc';
  var blue   = '#cfe2f3';
  var white  = '#ffffff';

  for (var i = 0; i < numRows; i++) {
    var tag         = String(data[i][0] || '').toUpperCase();
    var opportunity = String(data[i][2] || '').toUpperCase();
    var color;

    // Blue overrides for actionable opportunities
    if (opportunity === 'WHITESPACE' || opportunity === 'NEGATIVE') {
      color = blue;
    } else if (tag === 'WINNER' || tag === 'GOOD') {
      color = green;
    } else if (tag === 'BLEEDER') {
      color = red;
    } else if (tag === 'MARGINAL' || tag === 'NO DATA') {
      color = yellow;
    } else {
      color = white;
    }

    sheet.getRange(2 + i, 1, 1, numCols).setBackground(color);
  }

  Logger.log('Search term rows color-coded.');
}

// ─── Push Search Term Actions ────────────────────────────────────────────────

function pushSearchTermActions() {
  var props = PropertiesService.getScriptProperties();
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ST_SHEET_NAME);
  var ui    = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('Sheet "' + ST_SHEET_NAME + '" not found. Run "Sync Search Terms" first.');
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('No search term data found. Run "Sync Search Terms" first.');
    return;
  }

  // Read all data rows (cols A-V = 1-22)
  var data = sheet.getRange(2, 1, lastRow - 1, ST_HEADERS.length).getValues();

  var addKeywords  = [];  // WHITESPACE + APPROVE → add as exact-match keyword
  var addNegatives = [];  // NEGATIVE + APPROVE → add as negative keyword

  data.forEach(function(row, i) {
    var searchTerm  = String(row[0]  || '').trim();              // A
    var opportunity = String(row[17] || '').trim().toUpperCase(); // R
    var action      = String(row[19] || '').trim().toUpperCase(); // T
    var campaignId  = String(row[20] || '').trim();              // U
    var adGroupId   = String(row[21] || '').trim();              // V
    var cpc         = parseFloat(row[11]) || 0.50;               // L CPC as default bid

    if (action !== 'APPROVE' || !searchTerm || !campaignId || !adGroupId) return;

    if (opportunity === 'WHITESPACE') {
      addKeywords.push({
        rowNum: 2 + i, searchTerm: searchTerm,
        campaignId: campaignId, adGroupId: adGroupId,
        bid: Math.max(KW_MIN_BID, Math.round(cpc * 100) / 100)
      });
    } else if (opportunity === 'NEGATIVE') {
      addNegatives.push({
        rowNum: 2 + i, searchTerm: searchTerm,
        campaignId: campaignId, adGroupId: adGroupId
      });
    }
  });

  if (addKeywords.length === 0 && addNegatives.length === 0) {
    ui.alert('No approved actions found.\n\nSet column T (Action) to APPROVE on the rows you want to push, then try again.');
    return;
  }

  // Build preview
  var preview = 'Search Term actions to push:\n\n';
  if (addKeywords.length > 0) {
    preview += '✅ ADD AS EXACT KEYWORD: ' + addKeywords.length + ' terms\n';
    addKeywords.slice(0, 3).forEach(function(k) {
      preview += '   + "' + k.searchTerm + '" → $' + k.bid.toFixed(2) + ' bid\n';
    });
    if (addKeywords.length > 3) preview += '   ... and ' + (addKeywords.length - 3) + ' more\n';
  }
  if (addNegatives.length > 0) {
    preview += '\n🚫 ADD AS NEGATIVE KEYWORD: ' + addNegatives.length + ' terms\n';
    addNegatives.slice(0, 3).forEach(function(n) {
      preview += '   - "' + n.searchTerm + '"\n';
    });
    if (addNegatives.length > 3) preview += '   ... and ' + (addNegatives.length - 3) + ' more\n';
  }
  preview += '\nPush these changes LIVE to Amazon?';

  var result = ui.alert('Push Search Term Actions', preview, ui.ButtonSet.YES_NO);
  if (result !== ui.Button.YES) {
    ss.toast('Push cancelled.', 'PPC Sync', 5);
    return;
  }

  validateProps_(props);
  ss.toast('Authenticating...', '🔄 Pushing Search Term Actions', 5);
  var token = getAccessToken_(props);

  var totalSuccess = 0, totalError = 0;

  // Push new exact-match keywords
  if (addKeywords.length > 0) {
    ss.toast('Adding ' + addKeywords.length + ' exact-match keywords...', '🔄 Pushing', 30);
    var kwResults = createKeywords_(token, addKeywords, props);
    totalSuccess += kwResults.success.length;
    totalError   += kwResults.error.length;

    // Mark successful rows
    kwResults.success.forEach(function(k) {
      sheet.getRange(k.rowNum, 20).setValue('DONE');  // T  Action
      sheet.getRange(k.rowNum, 17).setValue('YES');    // Q  Targeted?
    });
    kwResults.error.forEach(function(k) {
      sheet.getRange(k.rowNum, 20).setValue('ERROR: ' + k.msg);
    });
  }

  // Push new negative keywords
  if (addNegatives.length > 0) {
    ss.toast('Adding ' + addNegatives.length + ' negative keywords...', '🔄 Pushing', 30);
    var negResults = createNegativeKeywords_(token, addNegatives, props);
    totalSuccess += negResults.success.length;
    totalError   += negResults.error.length;

    negResults.success.forEach(function(n) {
      sheet.getRange(n.rowNum, 20).setValue('DONE');  // T  Action
    });
    negResults.error.forEach(function(n) {
      sheet.getRange(n.rowNum, 20).setValue('ERROR: ' + n.msg);
    });
  }

  var msg = '✅ ' + totalSuccess + ' actions pushed';
  if (totalError > 0) msg += ', ❌ ' + totalError + ' failed';
  ss.toast(msg, 'Push Complete', 10);
  Logger.log('Search term push: success=' + totalSuccess + ', error=' + totalError);
}

function createKeywords_(token, keywords, props) {
  var clientId  = props.getProperty('AMAZON_CLIENT_ID');
  var profileId = props.getProperty('AMAZON_PROFILE_ID');
  var results   = { success: [], error: [] };
  var batchSize = 100;

  for (var i = 0; i < keywords.length; i += batchSize) {
    var batch = keywords.slice(i, i + batchSize);

    var payload = {
      keywords: batch.map(function(k) {
        return {
          campaignId: k.campaignId,
          adGroupId:  k.adGroupId,
          keywordText: k.searchTerm,
          matchType:  'EXACT',
          bid:        k.bid
        };
      })
    };

    var response = UrlFetchApp.fetch('https://advertising-api.amazon.com/sp/keywords', {
      method:  'POST',
      headers: {
        'Authorization':                   'Bearer ' + token,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope':    profileId,
        'Content-Type':                    'application/vnd.spKeyword.v3+json',
        'Accept':                          'application/vnd.spKeyword.v3+json'
      },
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200 && response.getResponseCode() !== 207) {
      Logger.log('Create keywords error ' + response.getResponseCode() + ': ' + response.getContentText());
      batch.forEach(function(k) {
        results.error.push({ rowNum: k.rowNum, searchTerm: k.searchTerm, msg: 'HTTP ' + response.getResponseCode() });
      });
      continue;
    }

    var data     = JSON.parse(response.getContentText());
    var errorMap = {};
    (data.keywords && data.keywords.error || []).forEach(function(e) {
      errorMap[e.keywordText || e.index] = e.errorMessage || e.code || 'Unknown';
    });

    batch.forEach(function(k) {
      if (errorMap[k.searchTerm]) {
        results.error.push({ rowNum: k.rowNum, searchTerm: k.searchTerm, msg: errorMap[k.searchTerm] });
      } else {
        results.success.push(k);
      }
    });

    Logger.log('Create keywords batch ' + (Math.floor(i / batchSize) + 1) + ': ' + batch.length + ' sent');
  }

  return results;
}

function createNegativeKeywords_(token, negatives, props) {
  var clientId  = props.getProperty('AMAZON_CLIENT_ID');
  var profileId = props.getProperty('AMAZON_PROFILE_ID');
  var results   = { success: [], error: [] };
  var batchSize = 100;

  for (var i = 0; i < negatives.length; i += batchSize) {
    var batch = negatives.slice(i, i + batchSize);

    var payload = {
      negativeKeywords: batch.map(function(n) {
        return {
          campaignId: n.campaignId,
          adGroupId:  n.adGroupId,
          keywordText: n.searchTerm,
          matchType:  'NEGATIVE_EXACT'
        };
      })
    };

    var response = UrlFetchApp.fetch('https://advertising-api.amazon.com/sp/negativeKeywords', {
      method:  'POST',
      headers: {
        'Authorization':                   'Bearer ' + token,
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope':    profileId,
        'Content-Type':                    'application/vnd.spNegativeKeyword.v3+json',
        'Accept':                          'application/vnd.spNegativeKeyword.v3+json'
      },
      payload:            JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200 && response.getResponseCode() !== 207) {
      Logger.log('Create negative keywords error ' + response.getResponseCode() + ': ' + response.getContentText());
      batch.forEach(function(n) {
        results.error.push({ rowNum: n.rowNum, searchTerm: n.searchTerm, msg: 'HTTP ' + response.getResponseCode() });
      });
      continue;
    }

    var data     = JSON.parse(response.getContentText());
    var errorMap = {};
    (data.negativeKeywords && data.negativeKeywords.error || []).forEach(function(e) {
      errorMap[e.keywordText || e.index] = e.errorMessage || e.code || 'Unknown';
    });

    batch.forEach(function(n) {
      if (errorMap[n.searchTerm]) {
        results.error.push({ rowNum: n.rowNum, searchTerm: n.searchTerm, msg: errorMap[n.searchTerm] });
      } else {
        results.success.push(n);
      }
    });

    Logger.log('Create negative keywords batch ' + (Math.floor(i / batchSize) + 1) + ': ' + batch.length + ' sent');
  }

  return results;
}

/**
 * Compute keyword bid recommendation using Rawlings formula.
 * Returns { idealBid, bidDelta, action, reason, newBid }
 */
function computeKeywordRecommendation_(clicks, orders, sales, spend, currentBid, tag) {
  var result = { idealBid: 0, bidDelta: 0, action: 'MAINTAIN', reason: '', newBid: currentBid };

  // Rule 1: BLEEDER — 30+ clicks, zero orders → PAUSE
  if (clicks >= KW_BLEEDER_CLICKS && orders === 0) {
    result.action  = 'PAUSE';
    result.reason  = 'BLEEDER: ' + clicks + ' clicks, $0 sales';
    result.newBid  = 0;
    return result;
  }

  // Rule 2: Insufficient data — fewer than 5 clicks → keep current bid
  if (clicks < 5) {
    result.action  = 'MAINTAIN';
    result.reason  = 'Not enough data (' + clicks + ' clicks)';
    result.newBid  = currentBid;
    return result;
  }

  // Rule 3: WINNER — low ACOS, strong orders → scale up +10%
  var acos = sales > 0 ? (spend / sales * 100) : 999;
  if (acos < KW_WINNER_ACOS && orders >= KW_WINNER_ORDERS) {
    var scaledBid = Math.round(currentBid * (1 + KW_SCALE_UP_PCT) * 100) / 100;
    scaledBid = Math.max(KW_MIN_BID, scaledBid);
    result.idealBid = scaledBid;
    result.bidDelta = Math.round((scaledBid - currentBid) * 100) / 100;
    result.action   = 'INCREASE';
    result.reason   = 'WINNER: ' + acos.toFixed(1) + '% ACOS, ' + orders + ' orders → +10%';
    result.newBid   = scaledBid;
    return result;
  }

  // Rule 4: Ideal Bid calculation — VPC × Target ACOS, capped ±20%
  var vpc      = clicks > 0 ? sales / clicks : 0;
  var idealBid = vpc * KW_TARGET_ACOS;
  result.idealBid = Math.round(idealBid * 100) / 100;

  if (currentBid <= 0) {
    // No current bid to constrain against
    result.newBid  = Math.max(KW_MIN_BID, result.idealBid);
    result.bidDelta = Math.round((result.newBid - currentBid) * 100) / 100;
    result.action  = result.bidDelta > 0 ? 'INCREASE' : 'MAINTAIN';
    result.reason  = 'Ideal bid: $' + result.idealBid.toFixed(2) + ' (VPC $' + vpc.toFixed(2) + ')';
    return result;
  }

  // Apply ±20% cap
  var maxBid = currentBid * (1 + KW_MAX_CHANGE_PCT);
  var minBid = currentBid * (1 - KW_MAX_CHANGE_PCT);
  var capped = Math.min(maxBid, Math.max(minBid, idealBid));
  capped     = Math.max(KW_MIN_BID, Math.round(capped * 100) / 100);

  var delta = Math.round((capped - currentBid) * 100) / 100;

  // Ignore tiny changes (< $0.01)
  if (Math.abs(delta) < 0.01) {
    result.action  = 'MAINTAIN';
    result.reason  = 'Bid optimal ($' + currentBid.toFixed(2) + ')';
    result.newBid  = currentBid;
    return result;
  }

  var wasCapped = (idealBid > maxBid || idealBid < minBid) ? ' (capped ±20%)' : '';

  if (delta > 0) {
    result.action = 'INCREASE';
    result.reason = 'Raise $' + currentBid.toFixed(2) + ' → $' + capped.toFixed(2) + wasCapped;
  } else {
    result.action = 'REDUCE';
    result.reason = 'Lower $' + currentBid.toFixed(2) + ' → $' + capped.toFixed(2) + wasCapped;
  }

  result.bidDelta = delta;
  result.newBid   = capped;
  return result;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function deleteTriggerByName_(funcName) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === funcName) {
      ScriptApp.deleteTrigger(t);
    }
  });
}

// ─── Sheet Cleanup ────────────────────────────────────────────────────────────

function cleanupOldSheets() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var ui   = SpreadsheetApp.getUi();
  var keep = [SHEET_NAME, KW_SHEET_NAME, ST_SHEET_NAME];

  var all     = ss.getSheets();
  var toDelete = all.filter(function(s) { return keep.indexOf(s.getName()) === -1; });

  if (toDelete.length === 0) {
    ui.alert('Nothing to clean up — only the active sheets exist.');
    return;
  }

  var names = toDelete.map(function(s) { return '  • ' + s.getName(); }).join('\n');
  var result = ui.alert(
    '🗑 Delete Old Sheets?',
    'These sheets will be permanently deleted:\n\n' + names +
    '\n\nSheets to keep:\n  • ' + keep.join('\n  • ') +
    '\n\nThis cannot be undone.',
    ui.ButtonSet.YES_NO
  );

  if (result !== ui.Button.YES) {
    ss.toast('Cleanup cancelled.', 'PPC Sync', 5);
    return;
  }

  // Ensure at least one keep-sheet exists before deleting (Sheets requires ≥1 sheet)
  keep.forEach(function(name) {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });

  // Move 'PPC Campaigns' to position 1 so it's never the last sheet during deletion
  var anchor = ss.getSheetByName(SHEET_NAME);
  if (anchor) ss.setActiveSheet(anchor);

  // Delete one at a time, re-fetching the sheet list each iteration
  // to avoid stale references after prior deletions
  var deleted = [], failed = [];
  var namesToDelete = toDelete.map(function(s) { return s.getName(); });

  namesToDelete.forEach(function(name) {
    try {
      var sheet = ss.getSheetByName(name);
      if (sheet) {
        ss.deleteSheet(sheet);
        deleted.push(name);
      }
    } catch (e) {
      failed.push(name + ' (' + e.message + ')');
    }
  });

  var msg = '✅ Deleted ' + deleted.length + ' sheet(s).';
  if (failed.length) msg += '\n❌ Could not delete: ' + failed.join(', ');
  ss.toast(msg, 'Cleanup Done', 10);
  Logger.log('Cleanup: deleted=' + deleted.join(', '));
}

function validateProps_(props) {
  var required = ['AMAZON_CLIENT_ID', 'AMAZON_CLIENT_SECRET', 'AMAZON_REFRESH_TOKEN', 'AMAZON_PROFILE_ID'];
  var missing  = required.filter(function(k) { return !props.getProperty(k); });
  if (missing.length) {
    throw new Error('Missing Script Properties: ' + missing.join(', ') +
      '\n\nGo to: Extensions > Apps Script > ⚙️ Project Settings > Script properties');
  }
}

// ─── Instructions dialog ─────────────────────────────────────────────────────

function showInstructions() {
  var html = HtmlService.createHtmlOutput(
    '<style>' +
    'body{font-family:Google Sans,Roboto,sans-serif;font-size:13px;color:#333;margin:0;padding:16px 20px}' +
    'h2{color:#1a73e8;margin:0 0 12px}' +
    'h3{color:#333;margin:18px 0 6px;font-size:14px;border-bottom:1px solid #e0e0e0;padding-bottom:4px}' +
    '.step{background:#f8f9fa;border-left:3px solid #1a73e8;padding:8px 12px;margin:6px 0;border-radius:0 4px 4px 0}' +
    '.step b{color:#1a73e8}' +
    '.warn{background:#fef7e0;border-left:3px solid #f9ab00;padding:8px 12px;margin:6px 0;border-radius:0 4px 4px 0}' +
    '.tip{background:#e8f5e9;border-left:3px solid #34a853;padding:8px 12px;margin:6px 0;border-radius:0 4px 4px 0}' +
    '.menu{font-weight:bold;color:#1a73e8;font-size:13px;margin:12px 0 4px;padding:6px 0 2px}' +
    '.tag{display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:bold;margin:1px 2px}' +
    '.winner{background:#d9ead3;color:#274e13}' +
    '.good{background:#d9ead3;color:#274e13}' +
    '.marginal{background:#fff2cc;color:#7f6000}' +
    '.bleeder{background:#f4cccc;color:#990000}' +
    '.nodata{background:#fff2cc;color:#7f6000}' +
    'table{border-collapse:collapse;width:100%;margin:8px 0}' +
    'th{background:#1a73e8;color:#fff;padding:6px 8px;text-align:left;font-size:12px}' +
    'td{padding:5px 8px;border-bottom:1px solid #e0e0e0;font-size:12px}' +
    'tr:nth-child(even){background:#f8f9fa}' +
    'ol{margin:4px 0 8px 0;padding-left:20px}' +
    'ol li{margin:3px 0;line-height:1.5}' +
    'hr{border:none;border-top:1px solid #e0e0e0;margin:16px 0}' +
    '</style>' +

    '<h2>🔄 PPC Sync — Step-by-Step Guide</h2>' +

    // ── SECTION 1: Sync Campaigns ────────────────────────────
    '<h3>📊 Sync Campaigns + Request Metrics</h3>' +
    '<div class="menu">Menu: 🔄 PPC Sync → Sync Campaigns + Request Metrics</div>' +
    '<ol>' +
    '<li>Click the menu item. A toast notification appears: "Authenticating with Amazon..."</li>' +
    '<li>The script pulls <b>all campaigns</b> from your Amazon Ads account and writes them to the <b>PPC Campaigns</b> tab (columns A-D: name, state, type, budget).</li>' +
    '<li>It then requests a <b>30-day metrics report</b> from Amazon. This takes 5-15 minutes to generate on Amazon\'s side.</li>' +
    '<li>A timer is set to automatically check the report in 15 minutes. You can also click <b>Check & Apply Metrics Now</b> to check manually.</li>' +
    '<li>Once applied, columns E-I fill in (Spend, Sales, Impressions, Clicks, Orders) and formulas in J-V calculate everything else.</li>' +
    '</ol>' +
    '<div class="tip"><b>What to look at:</b> Column <b>U</b> (Action) tells you what to do: PAUSE, REDUCE_BID, INCREASE_BID, or WINNER. Column <b>V</b> (Bid Δ) shows the dollar change.</div>' +

    // ── SECTION 2: Sync Keywords ─────────────────────────────
    '<h3>🔑 Sync Keyword ACOS</h3>' +
    '<div class="menu">Menu: 🔄 PPC Sync → Sync Keyword ACOS</div>' +
    '<ol>' +
    '<li>Click the menu item. The script fetches all <b>active and paused keywords</b> plus campaign names from Amazon.</li>' +
    '<li>It writes them to the <b>Keyword Performance</b> tab (columns A-F: keyword, ID, match type, campaign, state, current bid).</li>' +
    '<li>It requests a <b>keyword metrics report</b>. Same 5-15 min wait as campaigns.</li>' +
    '<li>Timer auto-checks in 15 min, or click <b>Check Keyword Metrics Now</b> to check immediately.</li>' +
    '<li>Once applied, columns G-K fill in (Clicks, Impressions, Spend, Orders, Sales) and the system computes:<br>' +
    '&nbsp;&nbsp;- <b>Column P</b> (Tag): WINNER / GOOD / MARGINAL / BLEEDER / NO DATA<br>' +
    '&nbsp;&nbsp;- <b>Column Q</b> (Ideal Bid): what the bid should be based on VPC and target ACOS<br>' +
    '&nbsp;&nbsp;- <b>Column S</b> (Action): INCREASE / REDUCE / PAUSE / MAINTAIN<br>' +
    '&nbsp;&nbsp;- <b>Column U</b> (New Bid): the exact bid to set</li>' +
    '<li>Rows are <b>color-coded</b>: green = profitable, yellow = watch, red = losing money.</li>' +
    '</ol>' +
    '<div class="tip"><b>What to look at:</b> Sort by column <b>P</b> (Tag) to group WINNER/BLEEDER together. Look at <b>red rows</b> first — those are wasting money. Green rows are your best keywords.</div>' +

    // ── SECTION 3: Sync Search Terms ─────────────────────────
    '<h3>🔍 Sync Search Terms</h3>' +
    '<div class="menu">Menu: 🔄 PPC Sync → Sync Search Terms</div>' +
    '<ol>' +
    '<li>Click the menu item. The script requests a <b>search term report</b> — every customer search query that triggered your ads in the last 30 days.</li>' +
    '<li>Wait 5-15 min for Amazon to generate it, or click <b>Check Search Term Report</b> manually.</li>' +
    '<li>Once applied, the <b>Search Terms</b> tab is created with columns A-S:</li>' +
    '</ol>' +
    '<table>' +
    '<tr><th>Columns</th><th>What</th></tr>' +
    '<tr><td>A-E</td><td>Search Term, Campaign, Ad Group, Triggering Keyword, Match Type</td></tr>' +
    '<tr><td>F-J</td><td>Impressions, Clicks, Spend, Orders, Sales</td></tr>' +
    '<tr><td>K-O</td><td>CTR%, CPC, ACOS%, CVR%, ROAS</td></tr>' +
    '<tr><td><b>P</b></td><td><b>Tag</b> — WINNER / GOOD / MARGINAL / BLEEDER / NO DATA</td></tr>' +
    '<tr><td><b>Q</b></td><td><b>Targeted?</b> — YES if you already have an exact-match keyword for this term</td></tr>' +
    '<tr><td><b>R-S</b></td><td><b>Opportunity + Reason</b> — the most important columns (see below)</td></tr>' +
    '</table>' +
    '<ol start="4">' +
    '<li>Look at the <b>blue rows at the top</b> — these are sorted first because they need action:</li>' +
    '</ol>' +
    '<div class="step"><span class="tag" style="background:#cfe2f3;color:#0b5394">WHITESPACE</span> = This search term is making sales but you have no exact-match keyword for it.<br>' +
    '<b>Action:</b> Go to Amazon Ads console → find the campaign/ad group → add this as an exact-match keyword.</div>' +
    '<div class="step"><span class="tag" style="background:#cfe2f3;color:#0b5394">NEGATIVE</span> = This search term has 15+ clicks, $0 sales, and $5+ wasted spend.<br>' +
    '<b>Action:</b> Go to Amazon Ads console → find the campaign → add this as a negative keyword to stop wasting money.</div>' +
    '<div class="tip"><b>What to look at:</b> Column <b>R</b> (Opportunity) is the key. WHITESPACE = free money you\'re missing. NEGATIVE = money you\'re wasting. Do these first.</div>' +

    '<hr>' +

    // ── SECTION 4: Push Campaign Bids ────────────────────────
    '<h3>🚀 Push Bid Updates to Amazon (Campaigns)</h3>' +
    '<div class="menu">Menu: 🔄 PPC Sync → Push Bid Updates to Amazon</div>' +
    '<ol>' +
    '<li>First, make sure you\'ve already run <b>Sync Campaigns + Request Metrics</b> and the metrics have been applied (columns E-I should have numbers, not zeros).</li>' +
    '<li>Look at the <b>PPC Campaigns</b> tab, columns <b>U</b> (Action) and <b>V</b> (Bid Δ):<br>' +
    '&nbsp;&nbsp;- <b>PAUSE</b> = campaign will be paused (stopped)<br>' +
    '&nbsp;&nbsp;- <b>REDUCE_BID</b> = daily budget lowered by the amount in column V<br>' +
    '&nbsp;&nbsp;- <b>INCREASE_BID</b> = daily budget raised by the amount in column V</li>' +
    '<li>Click the menu item. A <b>confirmation dialog</b> appears showing exactly what will change:<br>' +
    '&nbsp;&nbsp;- How many campaigns will be paused, reduced, or increased<br>' +
    '&nbsp;&nbsp;- A sample of the actual changes (e.g., "Campaign X: $10.00 → $8.50")</li>' +
    '<li>Click <b>YES</b> to push the changes live to Amazon. Click <b>NO</b> to cancel (nothing happens).</li>' +
    '<li>The sheet updates to reflect the new values (column B for state changes, column D for budget changes).</li>' +
    '</ol>' +
    '<div class="warn"><b>⚠️ Safety:</b> Budget changes are capped at ±15% per push. Nothing happens without your confirmation. You can always re-run the sync to see fresh data.</div>' +

    // ── SECTION 5: Push Keyword Bids ─────────────────────────
    '<h3>🚀 Push Keyword Bid Updates to Amazon</h3>' +
    '<div class="menu">Menu: 🔄 PPC Sync → Push Keyword Bid Updates to Amazon</div>' +
    '<ol>' +
    '<li>First, make sure you\'ve already run <b>Sync Keyword ACOS</b> and the metrics have been applied (columns G-K should have numbers).</li>' +
    '<li>Look at the <b>Keyword Performance</b> tab:<br>' +
    '&nbsp;&nbsp;- Column <b>S</b> (Action): INCREASE / REDUCE / PAUSE / MAINTAIN<br>' +
    '&nbsp;&nbsp;- Column <b>U</b> (New Bid): the exact bid that will be set<br>' +
    '&nbsp;&nbsp;- Column <b>T</b> (Reason): explains why the system recommends this change</li>' +
    '<li>Click the menu item. A <b>confirmation dialog</b> appears showing:<br>' +
    '&nbsp;&nbsp;- How many keywords will be paused, increased, or reduced<br>' +
    '&nbsp;&nbsp;- A sample (e.g., "keyword X: $0.50 → $0.42")</li>' +
    '<li>Click <b>YES</b> to push live. Click <b>NO</b> to cancel.</li>' +
    '<li>The sheet updates column E (State) and column F (Bid) to reflect the new values.</li>' +
    '</ol>' +
    '<div class="warn"><b>⚠️ Safety:</b> Bid changes are capped at ±20% per cycle. Minimum bid is $0.02. PAUSE only applies to keywords with 30+ clicks and $0 sales.</div>' +

    '<hr>' +

    // ── SECTION 6: Color Code Guide ──────────────────────────
    '<h3>🎨 Color Code Guide (All Tabs)</h3>' +
    '<div class="tip"><b>Quick rule:</b> Green = good, Yellow = wait, Red = fix it, Blue = opportunity.</div>' +
    '<table>' +
    '<tr><th>Color</th><th>Tag</th><th>What It Means</th><th>What to Do</th></tr>' +
    '<tr><td><span class="tag winner">GREEN</span></td><td>WINNER / GOOD</td><td>Low ACOS, making sales</td><td>Increase bids to get more traffic</td></tr>' +
    '<tr><td><span class="tag marginal">YELLOW</span></td><td>MARGINAL / NO DATA</td><td>Break-even or not enough data</td><td>Wait — let it collect more clicks</td></tr>' +
    '<tr><td><span class="tag bleeder">RED</span></td><td>BLEEDER</td><td>High ACOS or $0 sales</td><td>Reduce bid or pause</td></tr>' +
    '<tr><td><span class="tag" style="background:#cfe2f3;color:#0b5394">BLUE</span></td><td>WHITESPACE / NEGATIVE</td><td>Opportunity found</td><td>Add keyword or add negative</td></tr>' +
    '</table>' +

    // ── SECTION 7: Clear / Cleanup ───────────────────────────
    '<h3>🧹 Clear Pending Report / Clean Up Old Sheets</h3>' +
    '<div class="menu">Menu: 🔄 PPC Sync → Clear Pending Report</div>' +
    '<ol>' +
    '<li>Use this if a report gets stuck or you want to start fresh.</li>' +
    '<li>Clears all pending report IDs and cancels any auto-check timers.</li>' +
    '<li>Safe to run anytime — it does not delete any data from your sheets.</li>' +
    '</ol>' +
    '<div class="menu">Menu: 🔄 PPC Sync → 🗑 Clean Up Old Sheets</div>' +
    '<ol>' +
    '<li>Deletes any tabs that are <b>not</b> PPC Campaigns, Keyword Performance, or Search Terms.</li>' +
    '<li>Useful if you have leftover test sheets or old copies.</li>' +
    '<li>Shows a confirmation dialog listing exactly which sheets will be deleted.</li>' +
    '</ol>' +

    '<hr>' +

    // ── SECTION 8: Settings ──────────────────────────────────
    '<h3>⚙️ Settings</h3>' +
    '<table>' +
    '<tr><th>Setting</th><th>Default</th><th>Where to Change</th></tr>' +
    '<tr><td>Target ACOS</td><td>30%</td><td>Script Properties (TARGET_ACOS)</td></tr>' +
    '<tr><td>Max Bid Change</td><td>±20%</td><td>Code.gs (KW_MAX_CHANGE_PCT)</td></tr>' +
    '<tr><td>Bleeder Click Threshold</td><td>30 clicks</td><td>Code.gs (KW_BLEEDER_CLICKS)</td></tr>' +
    '<tr><td>Winner ACOS Threshold</td><td>15%</td><td>Code.gs (KW_WINNER_ACOS)</td></tr>' +
    '<tr><td>Min Keyword Bid</td><td>$0.02</td><td>Code.gs (KW_MIN_BID)</td></tr>' +
    '</table>' +
    '<div class="step"><b>To change Target ACOS:</b> Go to Extensions → Apps Script → ⚙️ Project Settings → Script properties → edit <b>TARGET_ACOS</b> value.</div>'
  )
  .setWidth(660)
  .setHeight(820);

  SpreadsheetApp.getUi().showModalDialog(html, '📖 PPC Sync — Step-by-Step Guide');
}

// ─── Manual report application ──────────────────────────────────────────────

function applyAllReports() {
  checkAndApplyReport_();
  checkAndApplyKeywordReport_();
  checkAndApplySearchTermReport_();
}
