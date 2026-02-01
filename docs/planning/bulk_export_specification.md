# 📊 BULK CSV EXPORT SPECIFICATION

## Amazon Ads Bulksheet Integration for Titan PPC Platform

**Document Version:** 1.0  
**Last Updated:** 2026-02-01  
**Status:** READY FOR IMPLEMENTATION

---

## 📋 EXECUTIVE SUMMARY

This document extends the Titan PPC implementation to include:

1. **Enhanced Data Fetching** - Campaigns, Ad Groups, Keywords, Negative Keywords, Product Targets, Audiences
2. **Bulk CSV Export** - Amazon-compatible bulksheet format (.xlsx/.csv)
3. **Strategy #4: Audience Targeting** - Bid adjustments based on audience engagement
4. **Seamless Workflow** - One-click export → Upload to Amazon Ads Console → Apply changes

---

## 🏗️ ARCHITECTURE OVERVIEW

### Data Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ENHANCED DATA SOURCES                     │
└─────────────────────────────────────────────────────────────┘
      ↓                  ↓                  ↓                  ↓
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│ Campaigns │     │ Ad Groups │     │  Keywords │     │ Audiences │
│    API    │     │    API    │     │    API    │     │    API    │
│  /list    │     │  /list    │     │  /list    │     │  targets  │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
      ↓                  ↓                  ↓                  ↓
┌─────────────────────────────────────────────────────────────┐
│              UNIFIED GOOGLE SHEETS DATABASE                  │
│                                                              │
│  • PPC Campaigns Sheet (Enhanced)                           │
│  • Ad Groups Sheet (NEW)                                    │
│  • Keywords Sheet (NEW)                                     │
│  • Negative Keywords Sheet (NEW)                            │
│  • Audiences Sheet (NEW)                                    │
│  • Bulk Export Sheet (NEW - Output)                         │
└─────────────────────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────────────────────┐
│          BULK EXPORT GENERATOR (generate-bulk-csv.js)        │
│                                                              │
│  Filters: Approved recommendations only                     │
│  Format: Amazon Bulksheet (.xlsx or .csv)                   │
│  Structure: Record Type hierarchy                           │
└─────────────────────────────────────────────────────────────┘
      ↓
┌─────────────────────────────────────────────────────────────┐
│               USER WORKFLOW (Manual Upload)                  │
│                                                              │
│  1. Download: amazon-bulk-upload.xlsx                       │
│  2. Navigate to: Amazon Ads → Bulk Operations               │
│  3. Upload file                                             │
│  4. Review changes                                          │
│  5. Apply                                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 STRATEGY #4: AUDIENCE TARGETING OPTIMIZATION

### Concept

Adjust bids based on **audience engagement behavior** to maximize ROAS while maintaining TACoS targets.

### Audience Types in Amazon Ads

| Audience Type | ID Pattern | Description | Example |
|---------------|------------|-------------|---------|
| **Views Remarketing** | `413580...` | Customers who viewed your product | Last 30 days viewers |
| **Purchase Remarketing** | `430778...` | Customers who purchased your brand | 90-day purchasers |
| **Interest-Based** | `412978...` | Based on shopping category history | Health & Wellness shoppers |

### Input Data (From Image)

From the screenshot you provided, I can see Amazon's audience targeting interface showing:

```
Audiences Available:
☑ "Clicked or Added brand's product to cart - 413580582382876358"
☑ "Purchased brand's product - 430778787414928818"
☑ "High interest based on shopping history - 412978094962770620"
```

### Optimization Logic

#### **Scenario 1: High Converters (Purchasers)**

```
IF Audience = "Purchased brand's product" (Past Purchasers):
    Conversion Rate: Typically 2-3x higher than cold traffic
    Target ROAS: 8:1 (vs. 4:1 cold traffic)
    
    RECOMMENDATION: INCREASE bids by +30%
    
    REASON: These customers already trust the brand.
            Lower acquisition cost justifies premium bid.
```

#### **Scenario 2: Warm Traffic (Views/Cart Adds)**

```
IF Audience = "Clicked or Added to cart":
    Conversion Rate: 1.5-2x higher
    Target ROAS: 6:1
    
    RECOMMENDATION: INCREASE bids by +15%
    
    REASON: High intent signal but not yet converted.
```

#### **Scenario 3: Interest-Based (Cold Traffic)**

```
IF Audience = "High interest based on shopping history":
    Conversion Rate: Baseline (1x)
    Target ROAS: 4:1
    
    RECOMMENDATION: Baseline bid (no adjustment)
    
    REASON: Exploratory traffic; evaluate performance first.
```

### IPO Model for Strategy #4

| Stage | Details |
|-------|---------|
| **INPUTS** | • Audience ID<br>• Audience Type (purchase/view/interest)<br>• Campaign CVR<br>• Audience CVR<br>• Current Bid |
| **PROCESS** | 1. Identify audience type from ID pattern<br>2. Calculate CVR lift: `Audience CVR / Campaign Avg CVR`<br>3. Determine bid multiplier based on lift tier<br>4. Apply guardrails (max +50%, min -20%) |
| **OUTPUT** | • **Recommended Bid Adjustment**<br>• **Target ROAS Update**<br>• **Priority Tier** |

**Example:**

```
Input:
- Campaign: "DHB Core Exact - Conservative"
- Baseline CVR: 5%
- Audience: "Purchased brand's product"
- Audience CVR: 12% (from Reporting API)
- Current Bid: $2.00

Process:
- CVR Lift = 12% / 5% = 2.4x
- Tier: HIGH (>2x lift)
- Multiplier: +30%

Output:
- Recommended Bid Adjustment: +30% ($2.60)
- Target ROAS: Update to 8:1
- Priority: SCALE
```

---

## 📊 ENHANCED DATA MODEL

### New API Endpoints Required

| Endpoint | Media Type | Purpose |
|----------|------------|---------|
| `POST /sp/adGroups/list` | `application/vnd.spadgroup.v3+json` | Fetch all ad groups |
| `POST /sp/keywords/list` | `application/vnd.spkeyword.v3+json` | Fetch all keywords |
| `POST /sp/negativeKeywords/list` | `application/vnd.spnegativekeyword.v3+json` | Fetch negative keywords |
| `POST /sp/targets/list` | `application/vnd.sptarget.v3+json` | Fetch product targets |
| `POST /sp/targets/list` (audiences) | `application/vnd.sptarget.v3+json` | Fetch audience targets |

### New Google Sheets Tabs

#### **1. Ad Groups Sheet**

| Column | Field | Source | Notes |
|--------|-------|--------|-------|
| A | Ad Group Name | API | Direct |
| B | Ad Group ID | API | Unique identifier |
| C | Campaign ID | API | Parent campaign |
| D | Campaign Name | API | For reference |
| E | State | API | ENABLED/PAUSED/ARCHIVED |
| F | Default Bid | API | Keyword-level default |
| G | Impressions | Reporting | Placeholder (0) |
| H | Clicks | Reporting | Placeholder (0) |
| I | Spend | Reporting | Placeholder (0) |
| J | Sales | Reporting | Placeholder (0) |
| K | ACOS | Formula | =I/J |
| L | Last Updated | Logic | Timestamp |

#### **2. Keywords Sheet**

| Column | Field | Source | Notes |
|--------|-------|--------|-------|
| A | Keyword Text | API | e.g., "berberine supplement" |
| B | Keyword ID | API | Unique |
| C | Match Type | API | EXACT/PHRASE/BROAD |
| D | Ad Group ID | API | Parent |
| E | Campaign ID | API | Grandparent |
| F | State | API | ENABLED/PAUSED/ARCHIVED |
| G | Bid | API | Current bid |
| H | Impressions | Reporting | Placeholder |
| I | Clicks | Reporting | Placeholder |
| J | Spend | Reporting | Placeholder |
| K | Sales | Reporting | Placeholder |
| L | Orders | Reporting | Placeholder |
| M | ACOS | Formula | =J/K |
| N | CVR | Formula | =L/I |
| O | CPC | Formula | =J/I |
| P | **New Bid** | Formula | VPC calculation |
| Q | **Action** | Formula | INCREASE/REDUCE/PAUSE |
| R | **Approved** | Manual | YES/NO (user sets) |
| S | Last Updated | Logic | Timestamp |

#### **3. Negative Keywords Sheet**

| Column | Field | Source |
|--------|-------|--------|
| A | Negative Keyword Text | API |
| B | Negative Keyword ID | API |
| C | Match Type | API |
| D | Campaign ID | API |
| E | Ad Group ID | API |
| F | State | API |
| G | Last Updated | Logic |

#### **4. Audiences Sheet**

| Column | Field | Source | Notes |
|--------|-------|--------|-------|
| A | Audience Name | API | e.g., "Purchased brand's product" |
| B | Audience ID | API | e.g., "430778787414928818" |
| C | Campaign ID | API | Parent |
| D | Bid Adjustment | API | Percentage (+30%, -20%, etc.) |
| E | State | API | ENABLED/PAUSED |
| F | Impressions | Reporting | Placeholder |
| G | Clicks | Reporting | Placeholder |
| H | Conversions | Reporting | Placeholder |
| I | CVR | Formula | =H/G |
| J | **CVR Lift** | Formula | =I / Campaign Avg CVR |
| K | **Recommended Adjustment** | Formula | Based on lift tier |
| L | **Approved** | Manual | YES/NO |
| M | Last Updated | Logic | Timestamp |

---

## 📄 AMAZON BULKSHEET FORMAT

### Structure Overview

Amazon bulksheets use a **hierarchical structure** with a `Record Type` column:

```
Record Type       | Campaign Name        | Ad Group Name      | Keyword        | ...
------------------|----------------------|-------------------|----------------|-----
Campaign          | DHB Core Exact       |                   |                |
Ad Group          | DHB Core Exact       | DHB - Group 1     |                |
Keyword           | DHB Core Exact       | DHB - Group 1     | berberine      |
Keyword           | DHB Core Exact       | DHB - Group 1     | dhb supplement |
Negative Keyword  | DHB Core Exact       | DHB - Group 1     | cheap          |
```

### Complete Column Mapping

#### **Required Columns (Minimum)**

| Column Name | Description | Example |
|-------------|-------------|---------|
| `Record Type` | MUST be: Campaign, Ad Group, Keyword, Negative Keyword, Product Targeting | "Keyword" |
| `Campaign Name` | Name of campaign | "DHB Core Exact - Conservative" |
| `Campaign ID` | Amazon's campaign ID | "123456789" |
| `Ad Group Name` | Name of ad group (for non-campaign rows) | "DHB - Group 1" |
| `Ad Group ID` | Amazon's ad group ID | "987654321" |
| `Keyword` | Keyword text (for Keyword rows) | "berberine supplement" |
| `Match Type` | EXACT, PHRASE, BROAD | "EXACT" |
| `Max Bid` | Bid amount | "2.50" |
| `Status` | ENABLED, PAUSED, ARCHIVED | "ENABLED" |

#### **Extended Columns (for Campaigns)**

| Column Name | Description | Example |
|-------------|-------------|---------|
| `Campaign Daily Budget` | Daily budget | "50.00" |
| `Start Date` | YYYY-MM-DD | "2026-02-01" |
| `End Date` | YYYY-MM-DD or blank | "" |
| `Targeting Type` | MANUAL, AUTO | "MANUAL" |
| `Bidding Strategy` | LEGACY_FOR_SALES, etc. | "LEGACY_FOR_SALES" |

#### **Extended Columns (for Audiences)**

| Column Name | Description | Example |
|-------------|-------------|---------|
| `Audience ID` | Amazon audience ID | "430778787414928818" |
| `Bid Adjustment` | Percentage | "+30%" |

---

## 💻 COMPLETE CODE IMPLEMENTATION

### Phase 1: Enhanced Data Fetching

#### **New Script: `fetch-all-ppc-data.js`**

This script fetches ALL PPC entities and syncs them to multiple Google Sheets tabs.

```javascript
/**
 * fetch-all-ppc-data.js
 * Enhanced PPC data sync with Campaigns, Ad Groups, Keywords, Negative Keywords, Audiences
 */

require('dotenv').config();
const fetch = require('node-fetch');
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

const CONFIG = {
    refreshToken: process.env.AMAZON_REFRESH_TOKEN,
    clientId: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    profileId: process.env.AMAZON_PROFILE_ID,
    sheetsId: process.env.GOOGLE_SHEETS_ID,
    maxPages: 100
};

class EnhancedPPCFetcher {
    constructor() {
        this.accessToken = null;
        this.sheets = new UnifiedSheetsService();
    }

    async authenticate() {
        console.log('🔐 Authenticating with Amazon...\n');
        
        const response = await fetch('https://api.amazon.com/auth/o2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: CONFIG.refreshToken,
                client_id: CONFIG.clientId,
                client_secret: CONFIG.clientSecret
            })
        });
        
        const data = await response.json();
        this.accessToken = data.access_token;
        console.log(`✅ Access token obtained\n`);
    }

    /**
     * Generic paginated fetch for any V3 endpoint
     */
    async fetchPaginated(endpoint, mediaType, resourceName) {
        console.log(`📦 Fetching ${resourceName}...\n`);
        
        let allItems = [];
        let nextToken = null;
        let page = 1;
        
        do {
            console.log(`   🔄 Page ${page}...`);
            
            const payload = { maxResults: 100 };
            if (nextToken) payload.nextToken = nextToken;
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Amazon-Advertising-API-ClientId': CONFIG.clientId,
                    'Amazon-Advertising-API-Scope': CONFIG.profileId,
                    'Content-Type': mediaType,
                    'Accept': mediaType
                },
                body: JSON.stringify(payload)
            });
            
            console.log(`   📡 Status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`API Error: ${await response.text()}`);
            }
            
            const result = await response.json();
            
            // V3 responses vary by endpoint:
            // campaigns → result.campaigns
            // adGroups → result.adGroups
            // keywords → result.keywords
            const items = result[resourceName] || [];
            allItems = allItems.concat(items);
            
            console.log(`   📦 Found ${items.length} (Total: ${allItems.length})`);
            
            nextToken = result.nextToken || null;
            page++;
            
            if (page > CONFIG.maxPages) {
                throw new Error(`Safety limit exceeded`);
            }
            
        } while (nextToken);
        
        console.log(`✅ ${resourceName} fetch complete: ${allItems.length} total\n`);
        return allItems;
    }

    async fetchCampaigns() {
        return this.fetchPaginated(
            'https://advertising-api.amazon.com/sp/campaigns/list',
            'application/vnd.spcampaign.v3+json',
            'campaigns'
        );
    }

    async fetchAdGroups() {
        return this.fetchPaginated(
            'https://advertising-api.amazon.com/sp/adGroups/list',
            'application/vnd.spadgroup.v3+json',
            'adGroups'
        );
    }

    async fetchKeywords() {
        return this.fetchPaginated(
            'https://advertising-api.amazon.com/sp/keywords/list',
            'application/vnd.spkeyword.v3+json',
            'keywords'
        );
    }

    async fetchNegativeKeywords() {
        return this.fetchPaginated(
            'https://advertising-api.amazon.com/sp/negativeKeywords/list',
            'application/vnd.spnegativekeyword.v3+json',
            'negativeKeywords'
        );
    }

    async fetchTargets() {
        // This endpoint returns BOTH product targets AND audience targets
        return this.fetchPaginated(
            'https://advertising-api.amazon.com/sp/targets/list',
            'application/vnd.sptarget.v3+json',
            'targets'
        );
    }

    /**
     * Process campaigns to rows
     */
    processCampaigns(campaigns) {
        console.log('🔧 Processing campaigns...\n');
        
        return campaigns.map(c => [
            c.name || '',
            c.campaignId || '',
            c.state || '',
            c.targetingType || '',
            c.budget?.budget || c.budget || 0,
            0, 0, 0, 0, 0,  // Placeholders for metrics
            new Date().toISOString()
        ]);
    }

    /**
     * Process ad groups to rows
     */
    processAdGroups(adGroups, campaigns) {
        console.log('🔧 Processing ad groups...\n');
        
        // Create campaign lookup
        const campaignMap = new Map(
            campaigns.map(c => [c.campaignId, c.name])
        );
        
        return adGroups.map(ag => [
            ag.name || '',
            ag.adGroupId || '',
            ag.campaignId || '',
            campaignMap.get(ag.campaignId) || '',
            ag.state || '',
            ag.defaultBid || 0,
            0, 0, 0, 0,  // Metrics placeholders
            new Date().toISOString()
        ]);
    }

    /**
     * Process keywords to rows
     */
    processKeywords(keywords) {
        console.log('🔧 Processing keywords...\n');
        
        return keywords.map(kw => [
            kw.keywordText || '',
            kw.keywordId || '',
            kw.matchType || '',
            kw.adGroupId || '',
            kw.campaignId || '',
            kw.state || '',
            kw.bid || 0,
            0, 0, 0, 0, 0,  // Metrics placeholders
            '',  // New Bid (formula)
            '',  // Action (formula)
            'NO',  // Approved (user input)
            new Date().toISOString()
        ]);
    }

    /**
     * Process negative keywords to rows
     */
    processNegativeKeywords(negativeKeywords) {
        console.log('🔧 Processing negative keywords...\n');
        
        return negativeKeywords.map(nk => [
            nk.keywordText || '',
            nk.keywordId || '',
            nk.matchType || '',
            nk.campaignId || '',
            nk.adGroupId || '',
            nk.state || '',
            new Date().toISOString()
        ]);
    }

    /**
     * Process targets (filter for audiences only)
     */
    processAudiences(targets) {
        console.log('🔧 Processing audience targets...\n');
        
        // Filter for audience targets only (expression type = 'auto' or 'audience')
        const audiences = targets.filter(t => 
            t.expressionType === 'audience' || 
            t.expression?.[0]?.type === 'audience'
        );
        
        return audiences.map(aud => {
            // Extract audience ID from expression
            const audienceId = aud.expression?.[0]?.value || '';
            const audienceName = this.getAudienceName(audienceId);
            
            return [
                audienceName,
                audienceId,
                aud.campaignId || '',
                aud.bid?.adjustmentPercent || 0,
                aud.state || '',
                0, 0, 0,  // Metrics placeholders
                '',  // CVR Lift (formula)
                '',  // Recommended Adjustment (formula)
                'NO',  // Approved
                new Date().toISOString()
            ];
        });
    }

    /**
     * Helper: Map audience ID to human-readable name
     */
    getAudienceName(audienceId) {
        // Pattern matching based on screenshot
        if (audienceId.startsWith('4135')) {
            return 'Clicked or Added to Cart';
        } else if (audienceId.startsWith('4307')) {
            return 'Purchased Brand Product';
        } else if (audienceId.startsWith('4129')) {
            return 'High Interest (Shopping History)';
        } else {
            return `Audience ${audienceId.substring(0, 8)}...`;
        }
    }

    /**
     * Sync all data to Google Sheets
     */
    async syncAllToSheets(data) {
        console.log('📊 Syncing to Google Sheets...\n');
        
        const { campaigns, adGroups, keywords, negativeKeywords, audiences } = data;
        
        // Sync Campaigns
        if (campaigns.length > 0) {
            console.log(`   Syncing ${campaigns.length} campaigns...`);
            await this.sheets.clearRange('PPC Campaigns', 'A11:Z1000');
            await this.sheets.writeRows('PPC Campaigns', campaigns, 'A11');
        }
        
        // Sync Ad Groups
        if (adGroups.length > 0) {
            console.log(`   Syncing ${adGroups.length} ad groups...`);
            await this.sheets.clearRange('Ad Groups', 'A11:Z1000');
            await this.sheets.writeRows('Ad Groups', adGroups, 'A11');
        }
        
        // Sync Keywords
        if (keywords.length > 0) {
            console.log(`   Syncing ${keywords.length} keywords...`);
            await this.sheets.clearRange('Keywords', 'A11:Z1000');
            await this.sheets.writeRows('Keywords', keywords, 'A11');
        }
        
        // Sync Negative Keywords
        if (negativeKeywords.length > 0) {
            console.log(`   Syncing ${negativeKeywords.length} negative keywords...`);
            await this.sheets.clearRange('Negative Keywords', 'A11:Z1000');
            await this.sheets.writeRows('Negative Keywords', negativeKeywords, 'A11');
        }
        
        // Sync Audiences
        if (audiences.length > 0) {
            console.log(`   Syncing ${audiences.length} audiences...`);
            await this.sheets.clearRange('Audiences', 'A11:Z1000');
            await this.sheets.writeRows('Audiences', audiences, 'A11');
        }
        
        console.log('✅ All data synced!\n');
    }

    async run() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  ENHANCED PPC DATA SYNC');
        console.log('  Campaigns + Ad Groups + Keywords + Audiences');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        try {
            // Step 1: Authenticate
            await this.authenticate();
            
            // Step 2: Fetch all data
            const [campaigns, adGroups, keywords, negativeKeywords, targets] = await Promise.all([
                this.fetchCampaigns(),
                this.fetchAdGroups(),
                this.fetchKeywords(),
                this.fetchNegativeKeywords(),
                this.fetchTargets()
            ]);
            
            // Step 3: Process data
            const processedData = {
                campaigns: this.processCampaigns(campaigns),
                adGroups: this.processAdGroups(adGroups, campaigns),
                keywords: this.processKeywords(keywords),
                negativeKeywords: this.processNegativeKeywords(negativeKeywords),
                audiences: this.processAudiences(targets)
            };
            
            // Step 4: Sync to sheets
            await this.syncAllToSheets(processedData);
            
            console.log('═══════════════════════════════════════════════════════════');
            console.log('✅ PIPELINE COMPLETE!');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`   Campaigns: ${campaigns.length}`);
            console.log(`   Ad Groups: ${adGroups.length}`);
            console.log(`   Keywords: ${keywords.length}`);
            console.log(`   Negative Keywords: ${negativeKeywords.length}`);
            console.log(`   Audiences: ${processedData.audiences.length}`);
            console.log('═══════════════════════════════════════════════════════════\n');
            
        } catch (error) {
            console.error('❌ PIPELINE FAILED:', error.message);
            process.exit(1);
        }
    }
}

// Execute
new EnhancedPPCFetcher().run();
```

---

### Phase 2: Bulk Export Generator

#### **New Script: `generate-bulk-csv.js`**

This script reads approved recommendations from Google Sheets and generates an Amazon-compatible bulksheet.

```javascript
/**
 * generate-bulk-csv.js
 * Generate Amazon Ads bulk upload file from approved recommendations
 */

require('dotenv').config();
const XLSX = require('xlsx');
const UnifiedSheetsService = require('./src/titan/sync/unified-sheets');

class BulkExportGenerator {
    constructor() {
        this.sheets = new UnifiedSheetsService();
    }

    async fetchApprovedKeywords() {
        console.log('📖 Fetching approved keyword recommendations...\n');
        
        const data = await this.sheets.readSheet('Keywords');
        
        // Filter for approved rows only (column R = "YES")
        // Assuming row 11+ is data (skip headers in rows 1-10)
        const approved = data.slice(10).filter(row => row[17] === 'YES');
        
        console.log(`   Found ${approved.length} approved keywords\n`);
        return approved;
    }

    async fetchApprovedAudiences() {
        console.log('📖 Fetching approved audience recommendations...\n');
        
        const data = await this.sheets.readSheet('Audiences');
        const approved = data.slice(10).filter(row => row[11] === 'YES');
        
        console.log(`   Found ${approved.length} approved audiences\n`);
        return approved;
    }

    /**
     * Generate bulksheet data structure
     */
    generateBulksheet(keywords, audiences) {
        console.log('🔧 Generating bulksheet...\n');
        
        const rows = [];
        
        // Header row
        rows.push([
            'Record Type',
            'Campaign Name',
            'Campaign ID',
            'Ad Group Name',
            'Ad Group ID',
            'Keyword',
            'Keyword ID',
            'Match Type',
            'Max Bid',
            'Status',
            'Audience ID',
            'Bid Adjustment'
        ]);
        
        // Add keyword rows
        keywords.forEach(kw => {
            rows.push([
                'Keyword',                  // Record Type
                '',                         // Campaign Name (leave blank for updates)
                kw[4],                      // Campaign ID
                '',                         // Ad Group Name
                kw[3],                      // Ad Group ID
                kw[0],                      // Keyword
                kw[1],                      // Keyword ID
                kw[2],                      // Match Type
                kw[15],                     // New Bid (column P)
                kw[5],                      // Status
                '',                         // Audience ID (N/A for keywords)
                ''                          // Bid Adjustment (N/A)
            ]);
        });
        
        // Add audience rows
        audiences.forEach(aud => {
            rows.push([
                'Product Targeting',        // Record Type (audiences use this)
                '',                         // Campaign Name
                aud[2],                     // Campaign ID
                '',                         // Ad Group Name
                '',                         // Ad Group ID (audiences at campaign level)
                '',                         // Keyword (N/A)
                '',                         // Keyword ID (N/A)
                '',                         // Match Type (N/A)
                '',                         // Max Bid (N/A)
                aud[4],                     // Status
                aud[1],                     // Audience ID
                aud[10]                     // Recommended Adjustment (column K)
            ]);
        });
        
        return rows;
    }

    /**
     * Export to Excel file
     */
    exportToExcel(data, filename) {
        console.log(`💾 Exporting to ${filename}...\n`);
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        XLSX.utils.book_append_sheet(wb, ws, 'Bulk Operations');
        XLSX.writeFile(wb, filename);
        
        console.log(`✅ File created: ${filename}\n`);
    }

    async run() {
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  BULK EXPORT GENERATOR');
        console.log('  Amazon Ads Bulksheet Creation');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        try {
            // Step 1: Fetch approved recommendations
            const keywords = await this.fetchApprovedKeywords();
            const audiences = await this.fetchApprovedAudiences();
            
            if (keywords.length === 0 && audiences.length === 0) {
                console.log('⚠️  No approved recommendations found.');
                console.log('   Please mark recommendations as "YES" in the Approved column.\n');
                return;
            }
            
            // Step 2: Generate bulksheet
            const bulksheet = this.generateBulksheet(keywords, audiences);
            
            // Step 3: Export to file
            const filename = `amazon-bulk-upload-${new Date().toISOString().split('T')[0]}.xlsx`;
            this.exportToExcel(bulksheet, filename);
            
            console.log('═══════════════════════════════════════════════════════════');
            console.log('✅ EXPORT COMPLETE!');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`   Keywords: ${keywords.length}`);
            console.log(`   Audiences: ${audiences.length}`);
            console.log(`   Total changes: ${keywords.length + audiences.length}`);
            console.log(`   File: ${filename}`);
            console.log('═══════════════════════════════════════════════════════════\n');
            console.log('📋 NEXT STEPS:');
            console.log('   1. Open Amazon Ads Console');
            console.log('   2. Navigate to: Bulk Operations');
            console.log('   3. Upload: ' + filename);
            console.log('   4. Review changes');
            console.log('   5. Click "Apply"');
            console.log('═══════════════════════════════════════════════════════════\n');
            
        } catch (error) {
            console.error('❌ EXPORT FAILED:', error.message);
            process.exit(1);
        }
    }
}

// Execute
new BulkExportGenerator().run();
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Pre-Implementation

- [ ] Review complete specification
- [ ] Install `xlsx` package: `npm install xlsx`
- [ ] Backup current Google Sheets
- [ ] Create new tabs: Ad Groups, Keywords, Negative Keywords, Audiences

### Phase 1: Enhanced Data Fetching

- [ ] Copy `fetch-all-ppc-data.js` to project root
- [ ] Test authentication
- [ ] Test campaign fetch (existing)
- [ ] Test ad groups fetch (NEW)
- [ ] Test keywords fetch (NEW)
- [ ] Test negative keywords fetch (NEW)
- [ ] Test targets/audiences fetch (NEW)
- [ ] Verify all sheets populate correctly

### Phase 2: Bulk Export

- [ ] Copy `generate-bulk-csv.js` to project root
- [ ] Test with sample approved keywords
- [ ] Verify Excel file format
- [ ] Test upload to Amazon Ads Console (dry run)
- [ ] Verify changes preview correctly
- [ ] Apply changes (small test first)

### Phase 3: Validation

- [ ] Compare campaign counts (API vs. Amazon UI)
- [ ] Verify keyword bids match recommendations
- [ ] Check audience targeting applied correctly
- [ ] Monitor ACOS for 7 days post-changes
- [ ] Document any deviations

---

## ✅ SUCCESS METRICS

### Immediate (Post-Export)

- [ ] Excel file opens without errors
- [ ] Amazon accepts file upload (no format errors)
- [ ] Changes preview shows expected modifications
- [ ] All approved recommendations appear in preview

### 7-Day Performance

- [ ] Bleeders reduced by 30%
- [ ] Winner campaigns scaled successfully
- [ ] Audience adjustments improve CVR by 10%+
- [ ] Overall ACOS maintained or improved

---

## 🎯 USER WORKFLOW

### Daily Routine

**Morning (9 AM):**

1. Run: `node fetch-all-ppc-data.js` (5-10 minutes)
2. Review Google Sheets: Keywords tab
3. Check "Approved" column for recommendations you agree with
4. Review Audiences tab for bid adjustment suggestions

**Afternoon (2 PM):**

1. Run: `node generate-bulk-csv.js` (instant)
2. Download: `amazon-bulk-upload-YYYY-MM-DD.xlsx`
3. Upload to Amazon Ads → Bulk Operations
4. Review preview
5. Click "Apply"

**Result:** Changes live within 15 minutes!

---

**Document Status:** ✅ READY FOR IMPLEMENTATION  
**Next Step:** Copy code sections to project files and test with live data
