# PPC Pipeline Code Audit - Line-by-Line Documentation

**Date**: January 31, 2026  
**Purpose**: Document each line of code in the PPC pipeline to identify why Google Sheets contains stale/mixed data  
**Status**: ✅ ROOT CAUSE IDENTIFIED

---

## 🚨 ROOT CAUSE: Stale Data Issue

### **Problem**

The Google Sheet contains **mixed old and new data** because:

1. **`fetch-ppc-quick.js`** uses `appendRows()` which **ADDS TO existing data** instead of replacing it
2. Every time the script runs, it adds 100 more campaigns on top of the old ones
3. Result: Duplicate campaigns, old data mixed with new data

### **Evidence in Code**

**File**: `fetch-ppc-quick.js` - Line 122

```javascript
await this.sheets.appendRows('PPC Campaigns', rows);
```

**`appendRows()` Definition** (`unified-sheets.js` - Lines 75-85):

```javascript
async appendRows(sheetName, rows) {
    await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: rows }
    });
}
```

This uses Google Sheets **`.append()`** which **adds rows to the end** without clearing existing data.

---

## ✅ Working Correctly: Keywords Sync

The Keywords sheet syncs correctly because `sheets-push.js` **clears before writing**:

**File**: `sheets-push.js` - Lines 54-66

```javascript
// Clear existing data (keep headers)
await this.sheets.spreadsheets.values.clear({
    spreadsheetId: this.spreadsheetId,
    range: 'Keywords!A2:T'  // ← CLEARS OLD DATA FIRST
});

// Insert new data
await this.sheets.spreadsheets.values.update({
    spreadsheetId: this.spreadsheetId,
    range: 'Keywords!A2',
    valueInputOption: 'USER_ENTERED',
    resource: { values: rows }
});
```

---

## 📋 Script-by-Script Audit

### **Script 1: `fetch-ppc-quick.js`**

**Purpose**: Fetch PPC campaigns from Amazon Ads API and sync to Google Sheets

#### Line-by-Line Documentation

**Lines 1-15: Configuration**

```javascript
require('dotenv').config();  // Load environment variables from .env
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');  // Import sheets wrapper

const AMAZON_ADS_CONFIG = {
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,  // OAuth refresh token
    clientId: process.env.AMAZON_CLIENT_ID,         // App client ID
    clientSecret: process.env.AMAZON_CLIENT_SECRET,  // App secret
    profileId: process.env.AMAZON_PROFILE_ID        // Ad account profile
};
```

**Lines 17-21: Class Constructor**

```javascript
class PPCCampaignFetcher {
    constructor() {
        this.sheets = new UnifiedSheetsService();  // Initialize Google Sheets service
        this.accessToken = null;                   // Will store API access token
    }
```

**Lines 23-46: Get Access Token**

```javascript
async getAccessToken() {
    // Step 1: Call Amazon OAuth token endpoint
    const response = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',              // Using refresh token flow
            refresh_token: AMAZON_ADS_CONFIG.refreshToken,  // From .env
            client_id: AMAZON_ADS_CONFIG.clientId,
            client_secret: AMAZON_ADS_CONFIG.clientSecret
        })
    });

    const data = await response.json();
    
    // Step 2: Check for errors
    if (data.error) {
        throw new Error(`Auth failed: ${data.error_description || data.error}`);
    }

    // Step 3: Store access token for API calls
    this.accessToken = data.access_token;
    console.log('✅ Got access token\n');
    return this.accessToken;
}
```

**Lines 48-74: Fetch Campaigns from Amazon**

```javascript
async fetchCampaigns() {
    // Step 1: Call Amazon Ads API to list campaigns
    const response = await fetch(
        `https://advertising-api.amazon.com/sp/campaigns/list`,  // v3 API endpoint
        {
            method: 'POST',
            headers: {
                'Amazon-Advertising-API-ClientId': AMAZON_ADS_CONFIG.clientId,
                'Amazon-Advertising-API-Scope': AMAZON_ADS_CONFIG.profileId,  // Target profile
                'Authorization': `Bearer ${this.accessToken}`,  // Use access token from step 1
                'Content-Type': 'application/vnd.spcampaign.v3+json',
                'Accept': 'application/vnd.spcampaign.v3+json'
            },
            body: JSON.stringify({
                maxResults: 100  // Request max 100 campaigns
            })
        }
    );

    const result = await response.json();

    // Step 2: Check for errors
    if (result.code) {
        throw new Error(`API Error: ${result.details || result.code}`);
    }

    // Step 3: Return campaigns array (v3 API wraps in {campaigns: [...]})
    return result.campaigns || result;
}
```

**Lines 76-97: Analyze Campaign Data**

```javascript
analyzeCampaign(campaign) {
    // ⚠️ LIMITATION: This ONLY uses campaign structure data
    // Does NOT fetch performance metrics (spend, sales, ACOS)
    
    return {
        campaignName: campaign.name,                                    // From API
        state: campaign.state,                                         // ENABLED/PAUSED/ARCHIVED
        targetingType: campaign.targetingType,                         // AUTO/MANUAL
        budget: campaign.budget?.budget || campaign.dailyBudget || 0,  // Daily budget
        
        // ⚠️ ALL ZEROS - Requires separate reporting API call
        spend: 0,        // Needs: Reporting API
        sales: 0,        // Needs: Reporting API
        impressions: 0,  // Needs: Reporting API
        clicks: 0,       // Needs: Reporting API
        orders: 0,       // Needs: Reporting API
        ctr: 0,          // Calculated: clicks/impressions
        cpc: 0,          // Calculated: spend/clicks
        acos: 0,         // Calculated: spend/sales * 100
        roas: 0,         // Calculated: sales/spend
        cvr: 0,          // Calculated: orders/clicks
        
        isBleeder: false,          // Can't determine without performance data
        bleederSeverity: 'NONE',   // Can't determine without performance data
        recommendation: campaign.state === 'enabled' 
            ? 'Fetch performance data to analyze' 
            : 'Paused - review before enabling'
    };
}
```

**Lines 99-124: Sync to Google Sheets**

```javascript
async syncToSheets(campaigns) {
    console.log(`\n📊 Syncing ${campaigns.length} campaigns to PPC Campaigns sheet...\n`);

    // Step 1: Convert campaign objects to array rows
    const rows = campaigns.map(c => [
        c.campaignName,      // Column A
        c.state,             // Column B
        c.targetingType,     // Column C
        c.budget,            // Column D
        c.spend,             // Column E (always 0)
        c.sales,             // Column F (always 0)
        c.impressions,       // Column G (always 0)
        c.clicks,            // Column H (always 0)
        c.orders,            // Column I (always 0)
        c.ctr,               // Column J (always 0)
        c.cpc,               // Column K (always 0)
        c.acos,              // Column L (always 0)
        c.roas,              // Column M (always 0)
        c.cvr,               // Column N (always 0)
        c.isBleeder ? 'YES' : 'NO',  // Column O (always 'NO')
        c.bleederSeverity,   // Column P (always 'NONE')
        c.recommendation     // Column Q
    ]);

    // 🚨 ROOT CAUSE: appendRows() ADDS instead of REPLACES
    await this.sheets.appendRows('PPC Campaigns', rows);
    console.log('✅ Synced to sheet\n');
}
```

**Lines 126-172: Main Execution**

```javascript
async run() {
    // Print header
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  📊 PPC CAMPAIGN FETCHER                   ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Show config
    console.log('🔑 Using credentials from .env:\n');
    console.log(`   Client ID: ${AMAZON_ADS_CONFIG.clientId.substring(0, 20)}...`);
    console.log(`   Profile ID: ${AMAZON_ADS_CONFIG.profileId}\n`);

    try {
        // Step 1: Authenticate with Amazon
        console.log('🔐 Getting access token...\n');
        await this.getAccessToken();

        // Step 2: Fetch campaigns
        console.log('📥 Fetching campaigns...\n');
        const campaigns = await this.fetchCampaigns();
        console.log(`✅ Found ${campaigns.length} campaigns\n`);

        // Step 3: Analyze each campaign (no performance data)
        const analyzed = campaigns.map(c => this.analyzeCampaign(c));

        // Step 4: Count by status
        const enabled = analyzed.filter(c => c.state === 'enabled');
        const paused = analyzed.filter(c => c.state === 'paused');

        // Step 5: Print summary
        console.log('═══════════════════════════════════════════');
        console.log('📊 CAMPAIGN SUMMARY');
        console.log('═══════════════════════════════════════════\n');
        console.log(`Total Campaigns: ${campaigns.length}`);
        console.log(`  • Enabled: ${enabled.length}`);
        console.log(`  • Paused: ${paused.length}\n`);

        // Step 6: List all campaigns
        console.log('Campaign Names:');
        analyzed.forEach((c, i) => {
            console.log(`  ${i + 1}. ${c.campaignName} (${c.state})`);
        });

        // Step 7: Sync to Google Sheets (🚨 APPENDS, doesn't replace)
        console.log('\n💾 Syncing to Google Sheets...\n');
        await this.syncToSheets(analyzed);

        console.log('✅ Done!');
        console.log emaphore('📝 Note: Performance metrics require additional reporting API calls');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}
```

---

### **Script 2: `sync-now.js`**

**Purpose**: Manually trigger bidirectional sync between Titan database and Google Sheets

#### Line-by-Line Documentation

**Lines 1-13: Imports and Configuration**

```javascript
require('dotenv').config();  // Load environment variables
const SyncCoordinator = require('./src/titan/sync/sync-coordinator');  // Sync orchestrator
const KeywordDatabase = require('./src/titan/database/keywords-db');   // Titan SQLite DB

async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const pushOnly = args.includes('--push-only');  // Push Titan → Sheets
    const pullOnly = args.includes('--pull-only');  // Pull Sheets → Titan
```

**Lines 20-37: Validation**

```javascript
// Print header
console.log('\n═══════════════════════════════════════════');
console.log('  🚀 TITAN × GOOGLE SHEETS SYNC');
console.log('═══════════════════════════════════════════\n');

// Step 1: Check required environment variables
if (!process.env.GOOGLE_SHEETS_ID) {
    console.error('❌ GOOGLE_SHEETS_ID not set in .env file');
    process.exit(1);
}

if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_EMAIL not set in .env file');
    process.exit(1);
}

// Step 2: Show configuration
console.log('✅ Sheet ID:', process.env.GOOGLE_SHEETS_ID);
console.log('✅ Service Account:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log('🔗 Sheet URL: https://docs.google.com/spreadsheets/d/' + process.env.GOOGLE_SHEETS_ID + '/edit\n');
```

**Lines 39-68: Execute Sync**

```javascript
try {
    // Step 1: Initialize Titan database (SQLite)
    const titanDB = new KeywordDatabase();
    
    // Step 2: Create sync coordinator
    const coordinator = new SyncCoordinator(titanDB);

    // Step 3: Run appropriate sync based on flags
    if (pushOnly) {
        console.log('📤 Running PUSH only (Titan → Sheets)...\n');
        await coordinator.pushToSheets(); // Only push keywords from DB to Sheets
    } else if (pullOnly) {
        console.log('📥 Running PULL only (Sheets → Titan)...\n');
        await coordinator.pullFromSheets(); // Only pull user edits to DB
    } else {
        console.log('🔄 Running FULL bidirectional sync...\n');
        await coordinator.fullSync(); // Both push and pull
    }

    // Step 4: Success message
    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ SYNC COMPLETE!');
    console.log('═══════════════════════════════════════════\n');
    console.log('📊 Check your Google Sheet:');
    console.log('   https://docs.google.com/spreadsheets/d/' + process.env.GOOGLE_SHEETS_ID + '/edit\n');

    process.exit(0);

} catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error(error);
    process.exit(1);
}
```

**✅ This script works correctly** - it syncs to the Keywords sheet which properly clears data first.

---

### **Script 3: `unified-sheets.js`** (Service Layer)

**Purpose**: Wrapper for all Google Sheets API operations

#### Key Methods

**Lines 23-51: `ensureSheet()`** - Creates sheet if doesn't exist

```javascript
async ensureSheet(sheetName) {
    try {
        // Step 1: Get all existing sheets
        const response = await this.sheets.spreadsheets.get({
            spreadsheetId: this.spreadsheetId
        });

        // Step 2: Check if sheet exists
        const exists = response.data.sheets.find(s => s.properties.title === sheetName);

        // Step 3: Create if missing
        if (!exists) {
            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId: this.spreadsheetId,
                resource: {
                    requests: [{
                        addSheet: {
                            properties: { title: sheetName }
                        }
                    }]
                }
            });
            console.log(`✅ Created new sheet: ${sheetName}`);
        }
    } catch (error) {
        console.error(`Error ensuring sheet ${sheetName}:`, error.message);
        throw error;
    }
}
```

**Lines 53-61: `clearSheet()`** - Clear all data

```javascript
async clearSheet(sheetName) {
    await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1:ZZ`  // Clears entire sheet
    });
}
```

**Lines 63-73: `writeRows()`** - Overwrite data

```javascript
async writeRows(sheetName, rows, startCell = 'A1') {
    await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!${startCell}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: rows }
    });
}
```

**Lines 75-85: `appendRows()`** - 🚨 THE PROBLEM METHOD

```javascript
async appendRows(sheetName, rows) {
    // ⚠️ APPENDS to end of sheet WITHOUT clearing old data
    await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: rows }  // Adds rows to the bottom
    });
}
```

**Lines 87-96: `readSheet()`** - Read all data

```javascript
async readSheet(sheetName) {
    const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:ZZ`  // Read entire sheet
    });
    return response.data.values || [];
}
```

---

### **Script 4: `sheets-push.js`** (Keywords Sync Service)

**Purpose**: Push keywords from Titan database to Google Sheets

#### Key Method: `pushKeywords()` - ✅ **Works Correctly**

**Lines 26-74: How Keywords Sync Works**

```javascript
async pushKeywords(keywords) {
    console.log(`📤 Pushing ${keywords.length} keywords to Google Sheets...`);

    try {
        // Step 1: Convert keyword objects to sheet rows
        const rows = keywords.map(kw => [
            '',                              // Column A: Icon (formula)
            kw.opportunityScore || 0,        // Column B: Score
            kw.keyword,                      // Column C: Keyword text
            kw.searchVolume || '',           // Column D: Volume
            kw.competition || '',            // Column E: Competition
            kw.estimatedCPC || '',           // Column F: Est CPC
            kw.yourRank || '',               // Column G: Your rank
            kw.competitorRanks ? kw.competitorRanks.join(',') : '',  // Column H
            kw.tier || 'Tier 5',             // Column I: Tier
            kw.matchType || 'PHRASE',        // Column J: Match type
            '',                              // Column K: Suggested bid (formula)
            kw.yourBid || '',                // Column L: Your bid (user editable)
            kw.tosMultiplier || 200,         // Column M: TOS multiplier
            kw.ppMultiplier || 100,          // Column N: PP multiplier
            kw.status || 'Ready',            // Column O: Status
            kw.campaignName || '',           // Column P: Campaign
            kw.notes || '',                  // Column Q: Notes
            kw.source || 'titan',            // Column R: Source
            kw.addedDate || new Date().toISOString().split('T')[0],  // Column S
            new Date().toISOString()         // Column T: Last updated
        ]);

        // ✅ Step 2: CLEAR EXISTING DATA FIRST (keeps headers in row 1)
        await this.sheets.spreadsheets.values.clear({
            spreadsheetId: this.spreadsheetId,
            range: 'Keywords!A2:T'  // Clear from row 2 onwards
        });

        // ✅ Step 3: INSERT NEW DATA (replaces old data)
        await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Keywords!A2',
            valueInputOption: 'USER_ENTERED',
            resource: { values: rows }
        });

        console.log(`✅ Successfully pushed ${keywords.length} keywords to Google Sheets`);
        return { success: true, count: keywords.length };

    } catch (error) {
        console.error('❌ Error pushing keywords:', error.message);
        throw error;
    }
}
```

**Why This Works**:

1. ✅ **Clears data first** (line 55): `clear({ range: 'Keywords!A2:T' })`
2. ✅ **Then writes new data** (line 61): `update({ range: 'Keywords!A2' })`
3. ✅ **Result**: No duplicates, always fresh data

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Amazon Ads API                       │
│                  (Profile: 1130011681132849)           │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ fetch-ppc-quick.js
                         │ getAccessToken()
                         │ fetchCampaigns()
                         ↓
┌─────────────────────────────────────────────────────────┐
│              100 Campaigns (structure only)             │
│  - Names, states, budgets                              │
│  - NO performance data (spend, sales, ACOS)            │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ analyzeCampaign()
                         │ (sets all metrics to 0)
                         ↓
┌─────────────────────────────────────────────────────────┐
│                Analyzed Campaign Array                  │
│  [                                                      │
│    {campaignName: "...", spend: 0, sales: 0, ...},    │
│    {campaignName: "...", spend: 0, sales: 0, ...},    │
│    ...                                                  │
│  ]                                                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ 🚨 PROBLEM HERE
                         │ syncToSheets()
                         │ appendRows('PPC Campaigns', rows)
                         ↓
┌─────────────────────────────────────────────────────────┐
│            Google Sheets - PPC Campaigns Tab            │
│                                                         │
│  OLD DATA (previous runs)                              │
│  ───────────────────────────────────────────────       │
│  Campaign 1 (old)                                      │
│  Campaign 2 (old)                                      │
│  ...                                                    │
│  Campaign 100 (old)                                    │
│  ↓↓↓ APPENDED ↓↓↓                                     │
│  Campaign 1 (new) ← DUPLICATE                          │
│  Campaign 2 (new) ← DUPLICATE                          │
│  ...                                                    │
│  Campaign 100 (new) ← DUPLICATE                        │
│  ↓↓↓ APPENDED AGAIN ↓↓↓                               │
│  Campaign 1 (newer) ← MORE DUPLICATES                  │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘

VERSUS

┌─────────────────────────────────────────────────────────┐
│              Titan SQLite Database                      │
│  - 1,431 keywords                                      │
│  - Opportunity scores                                  │
│  - Market data from DataForSEO                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ sync-now.js
                         │ coordinator.fullSync()
                         ↓
                         │
                         │ sheets-push.js
                         │ pushKeywords()
                         ↓
┌─────────────────────────────────────────────────────────┐
│            Google Sheets - Keywords Tab                 │
│                                                         │
│  ✅ CLEARS OLD DATA FIRST ✅                           │
│  clear({ range: 'Keywords!A2:T' })                     │
│  ─────────────────────────────────────────             │
│  (empty)                                               │
│  ─────────────────────────────────────────             │
│  ✅ THEN WRITES NEW DATA ✅                            │
│  update({ range: 'Keywords!A2' })                      │
│  ─────────────────────────────────────────             │
│  Keyword 1 (fresh)                                     │
│  Keyword 2 (fresh)                                     │
│  ...                                                    │
│  Keyword 1431 (fresh)                                  │
│  ─────────────────────────────────────────             │
│  ✅ NO DUPLICATES ✅                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 THE FIX

Change `fetch-ppc-quick.js` line 122 from:

```javascript
await this.sheets.appendRows('PPC Campaigns', rows);  // ❌ APPENDS
```

To use the same pattern as `sheets-push.js`:

```javascript
// Clear existing data first
await this.sheets.clearSheet('PPC Campaigns');

// Write headers
await this.sheets.writeRows('PPC Campaigns', [
    ['Campaign Name', 'State', 'Targeting', 'Budget','Spend', 'Sales', 
     'Impressions', 'Clicks', 'Orders', 'CTR', 'CPC', 'ACOS', 'ROAS', 
     'CVR', 'Is Bleeder', 'Severity', 'Recommendation']
]);

// Write campaign data
await this.sheets.writeRows('PPC Campaigns', rows, 'A2');  // ✅ REPLACES
```

---

## Summary

**What Works**:
✅ Keywords sync (clears then writes)  
✅ Authentication with Amazon API  
✅ Fetching campaign structures  

**What Doesn't Work**:
❌ PPC Campaigns sheet (appends instead of replaces)  
❌ No performance metrics (spend, sales, ACOS - needs reporting API)  

**Root Cause**: `appendRows()` was designed to add new discoveries, but is being used for full refreshes.
