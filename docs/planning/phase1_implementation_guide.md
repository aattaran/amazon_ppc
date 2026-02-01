# 🚀 PHASE 1A IMPLEMENTATION GUIDE

## Step-by-Step Instructions (NO CODE EXECUTION)

**Version:** 1.0  
**Last Updated:** 2026-02-01  
**Status:** 📖 DOCUMENTATION ONLY

---

## 📋 PHASE 1A SCOPE

**What we're building:**

- Script to fetch campaigns, ad groups, and keywords from Amazon Ads API
- Sync data to Google Sheets with test group tagging
- Visual approval interface with color coding

**What we're NOT doing yet:**

- ❌ Audience targeting clauses (Phase 1B)
- ❌ Bulk file generation (Phase 2)
- ❌ Metrics/reporting (Phase 2)

---

## 🔧 STEP 1: PRE-IMPLEMENTATION SETUP

### 1.1 Verify Environment Variables

**Action:** Open `.env` file and verify these variables exist:

```bash
# Amazon Ads API Credentials
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxx
AMAZON_CLIENT_SECRET=xxxxx
AMAZON_REFRESH_TOKEN=Atzr|xxxxx
AMAZON_PROFILE_ID=xxxxx

# Google Sheets
GOOGLE_SHEETS_ID=xxxxx
```

**Verification:**

- [ ] All variables are present
- [ ] No placeholder values (xxxxx should be real credentials)
- [ ] File is in project root: `C:\Users\AATTARAN\workspace\amazon-ppc-platform\.env`

---

### 1.2 Install Dependencies

**Action:** Run this command in terminal:

```bash
npm install xlsx
```

**Expected output:**

```
+ xlsx@0.18.5
added 1 package
```

**Verification:**

- [ ] `node_modules/xlsx/` folder exists
- [ ] `package.json` has `xlsx` in dependencies

---

### 1.3 Backup Current Google Sheets

**Action:**

1. Open your Google Sheets
2. File → Make a copy
3. Rename to: `PPC Campaigns - BACKUP - 2026-02-01`
4. Keep original sheet open for editing

**Verification:**

- [ ] Backup sheet exists
- [ ] Original sheet is still accessible

---

### 1.4 Download Amazon's Official Bulk Template

**Action:**

1. Login to Amazon Ads Console
2. Navigate to **Bulk Operations**
3. Click **"Download a blank template for bulk operations"**
4. Select **"Sponsored Products"**
5. Save to: `C:\Users\AATTARAN\workspace\amazon-ppc-platform\templates\amazon-sp-bulk-template.xlsx`

**Verification:**

- [ ] File downloaded successfully
- [ ] File opens in Excel without errors
- [ ] Note down exact column names and order for later

**Why:** We need this to match Amazon's exact format when generating bulk files in Phase 2

---

### 1.5 Create New Google Sheets Tabs

**Action:** In your Google Sheets, create these new tabs:

#### Tab 2: "Ad Groups"

**Location:** Insert after "PPC Campaigns" tab

#### Tab 3: "Keywords"

**Location:** Insert after "Ad Groups" tab

#### Tab 4: "Targeting Clauses"

**Location:** Insert after "Keywords" tab (for Phase 1B)

#### Tab 5: "Negative Keywords"

**Location:** Insert after "Targeting Clauses" tab (for Phase 1B)

**Verification:**

- [ ] All 5 tabs exist
- [ ] Tabs are in correct order
- [ ] All tabs are empty (we'll add headers next)

---

## 📊 STEP 2: GOOGLE SHEETS CONFIGURATION

### 2.1 Update "PPC Campaigns" Tab Headers

**Action:** Add two new columns to existing headers (Row 10):

| Column | Header Name | Description |
|--------|-------------|-------------|
| Z | Test Group | A, B, or CONTROL |
| AA | Optimization Type | KW-ONLY or KW+AUD |

**Existing columns A-Y remain unchanged**

**Verification:**

- [ ] Column Z header = "Test Group"
- [ ] Column AA header = "Optimization Type"
- [ ] Headers are in Row 10 (frozen header row)

---

### 2.2 Create "Ad Groups" Tab Headers

**Action:** In Row 10 of "Ad Groups" tab, add these headers:

| Column | Header | Format |
|--------|--------|--------|
| A | Ad Group Name | Text |
| B | Ad Group ID | Number |
| C | Campaign ID | Number |
| D | Campaign Name | Text |
| E | State | Text |
| F | Default Bid | Currency |
| G | Clicks | Number |
| H | Spend | Currency |
| I | Sales | Currency |
| J | Orders | Number |
| K | ACOS | Percentage |
| L | CVR | Percentage |

**Row 1-9:** Leave for dashboard (will add later)

**Verification:**

- [ ] All headers in Row 10
- [ ] Headers are bold and centered
- [ ] Column widths adjusted for readability

---

### 2.3 Create "Keywords" Tab Headers

**Action:** In Row 10 of "Keywords" tab, add these headers:

| Column | Header | Format |
|--------|--------|--------|
| A | Keyword Text | Text |
| B | Keyword ID | Number |
| C | Match Type | Text |
| D | Ad Group ID | Number |
| E | Campaign ID | Number |
| F | Campaign Name | Text |
| G | Test Group | Text |
| H | State | Text |
| I | Current Bid | Currency |
| J | Clicks | Number |
| K | Spend | Currency |
| L | Sales | Currency |
| M | Orders | Number |
| N | ACOS | Percentage |
| O | CVR | Percentage |
| P | **VPC** | Currency |
| Q | **Recommended Bid** | Currency |
| R | **Action** | Text |
| S | **Priority** | Text |
| T | **Approval** | Dropdown |
| U | Last Updated | Timestamp |

**Verification:**

- [ ] All headers in Row 10
- [ ] Headers match exact spelling above
- [ ] Rows 1-9 reserved for dashboard

---

### 2.4 Add Conditional Formatting (Priority Column)

**Action:** Apply conditional formatting to Priority column (Column S in Keywords tab):

#### Rule 1: CRITICAL (Red)

- **Range:** `S11:S1000`
- **Format rule:** Text is exactly `CRITICAL`
- **Formatting:**
  - Background: `#F4CCCC` (light red)
  - Text color: `#990000` (dark red)
  - Bold

#### Rule 2: HIGH (Orange)

- **Range:** `S11:S1000`
- **Format rule:** Text is exactly `HIGH`
- **Formatting:**
  - Background: `#FCE5CD` (light orange)
  - Text color: `#E69138` (dark orange)

#### Rule 3: MEDIUM (Yellow)

- **Range:** `S11:S1000`
- **Format rule:** Text is exactly `MEDIUM`
- **Formatting:**
  - Background: `#FFF2CC` (light yellow)
  - Text color: `#BF9000` (dark yellow)

#### Rule 4: LOW (Green)

- **Range:** `S11:S1000`
- **Format rule:** Text is exactly `LOW`
- **Formatting:**
  - Background: `#D9EAD3` (light green)
  - Text color: `#38761D` (dark green)

**Verification:**

- [ ] 4 rules created
- [ ] Rules apply to correct range
- [ ] Test by typing "CRITICAL" in a cell (should turn red)

---

### 2.5 Add Data Validation (Approval Dropdown)

**Action:** Add dropdown to Approval column (Column T in Keywords tab):

1. Select range: `T11:T1000`
2. Data → Data Validation
3. Criteria: **List of items**
4. Values: `APPROVE, REJECT, HOLD`
5. Show dropdown in cell: ✅
6. On invalid data: **Reject input**
7. Appearance: **Chip** (if available)

**Verification:**

- [ ] Click cell T11 → dropdown appears
- [ ] Options are: APPROVE, REJECT, HOLD
- [ ] Typing other text shows error

---

### 2.6 Add Approval Row Highlighting

**Action:** Apply conditional formatting to entire row based on approval:

#### Rule 1: Approved Rows (Green)

- **Range:** `A11:U1000`
- **Format rule:** Custom formula is `=$T11="APPROVE"`
- **Formatting:**
  - Background: `#E8F5E9` (light green)

#### Rule 2: Rejected Rows (Red)

- **Range:** `A11:U1000`
- **Format rule:** Custom formula is `=$T11="REJECT"`
- **Formatting:**
  - Background: `#FFEBEE` (light red)

#### Rule 3: Hold Rows (Yellow)

- **Range:** `A11:U1000`
- **Format rule:** Custom formula is `=$T11="HOLD"`
- **Formatting:**
  - Background: `#FFF9C4` (light yellow)

**Note:** The `$T11` uses absolute column reference but relative row reference

**Verification:**

- [ ] Select "APPROVE" in T11 → entire row turns light green
- [ ] Select "REJECT" in T11 → entire row turns light red
- [ ] Select "HOLD" in T11 → entire row turns light yellow

---

### 2.7 Freeze Header Rows

**Action:** For each tab (PPC Campaigns, Ad Groups, Keywords):

1. Click on Row 11 (first data row)
2. View → Freeze → Up to row 10

**Verification:**

- [ ] Scroll down → headers stay visible
- [ ] Rows 1-10 are frozen
- [ ] Can scroll data rows independently

---

### 2.8 Create Dashboard (Rows 1-9)

**Action:** In "Keywords" tab, add dashboard content:

#### Row 1-3: Title and Stats

**Merge cells A1:U1 and add:**

```
📊 PPC KEYWORDS DASHBOARD
```

**Format:** Font size 18, bold, centered

**Row 3 - Set A Stats (Cells A3:H3):**

```
📊 SET A (Keywords Only)
Total Keywords: [Will auto-calculate]
Approved: [Will auto-calculate]
Avg ACOS: [Will auto-calculate]
```

**Row 3 - Set B Stats (Cells I3:P3):**

```
📊 SET B (Keywords + Audiences)
Total Keywords: [Will auto-calculate]
Approved: [Will auto-calculate]
Avg ACOS: [Will auto-calculate]
```

#### Row 5-7: Instructions

**Merge cells A5:U7 and add:**

```
HOW TO USE:
1. Review keywords with CRITICAL priority (red) first
2. Click "Approval" dropdown and select APPROVE, REJECT, or HOLD
3. Row highlights green (approved), red (rejected), or yellow (hold)
4. When ready, use PPC Optimizer menu → Generate Bulk File
5. Upload Excel file to Amazon Ads Console
```

**Format:** Font size 10, light gray background

**Verification:**

- [ ] Dashboard displays correctly
- [ ] Instructions are clear
- [ ] Row 10 still contains headers
- [ ] Row 11 is first data row

---

## 💻 STEP 3: CREATE FETCH SCRIPT

### 3.1 Script File Structure

**Action:** Create new file: `fetch-ppc-data.js` in project root

**File location:** `C:\Users\AATTARAN\workspace\amazon-ppc-platform\fetch-ppc-data.js`

**DO NOT RUN YET - Just create the file**

---

### 3.2 Script Architecture

**The script will have these major sections:**

```javascript
// 1. IMPORTS
const fetch = require('node-fetch');
const { google } = require('googleapis');
require('dotenv').config();

// 2. CONFIGURATION
const config = {
  amazon: { /* API credentials */ },
  sheets: { /* Google Sheets config */ }
};

// 3. AMAZON ADS API CLIENT
class AmazonAdsClient {
  async authenticate() { /* Get access token */ }
  async fetchCampaigns() { /* With pagination */ }
  async fetchAdGroups() { /* With pagination */ }
  async fetchKeywords() { /* With pagination */ }
}

// 4. GOOGLE SHEETS CLIENT
class GoogleSheetsClient {
  async syncCampaigns(data) { /* Write to sheet */ }
  async syncAdGroups(data) { /* Write to sheet */ }
  async syncKeywords(data) { /* Write to sheet */ }
}

// 5. TEST GROUP DETECTION
function detectTestGroup(campaignName) {
  if (campaignName.includes('[KW-ONLY]')) return 'A';
  if (campaignName.includes('[KW+AUD]')) return 'B';
  return 'CONTROL';
}

// 6. MAIN EXECUTION
async function main() {
  // 1. Authenticate
  // 2. Fetch campaigns
  // 3. Fetch ad groups
  // 4. Fetch keywords
  // 5. Sync to Google Sheets
  // 6. Log summary
}

main().catch(console.error);
```

---

### 3.3 Key Implementation Details

#### Authentication Flow

```javascript
// Step 1: Exchange refresh token for access token
POST https://api.amazon.com/auth/o2/token
Body: {
  grant_type: 'refresh_token',
  refresh_token: process.env.AMAZON_REFRESH_TOKEN,
  client_id: process.env.AMAZON_CLIENT_ID,
  client_secret: process.env.AMAZON_CLIENT_SECRET
}

// Step 2: Store access token
// Expires in 3600 seconds (1 hour)
```

#### Pagination Logic

```javascript
// Amazon uses NextToken for pagination
let nextToken = null;
const allCampaigns = [];

do {
  const response = await fetch(url, {
    method: 'POST',
    headers: { /* Include access token */ },
    body: JSON.stringify({
      nextToken: nextToken,  // null on first request
      maxResults: 100        // Max per page
    })
  });
  
  const data = await response.json();
  allCampaigns.push(...data.campaigns);
  nextToken = data.nextToken;  // null when done
  
} while (nextToken !== null);
```

#### Google Sheets Sync Pattern

```javascript
// Row 11 Protection Pattern
// NEVER overwrite rows 1-10 (headers + dashboard)

const values = keywords.map(kw => [
  kw.keywordText,        // Column A
  kw.keywordId,          // Column B
  kw.matchType,          // Column C
  kw.adGroupId,          // Column D
  kw.campaignId,         // Column E
  getCampaignName(kw),   // Column F (lookup)
  getTestGroup(kw),      // Column G (detected)
  kw.state,              // Column H
  kw.bid,                // Column I
  '', '', '', '', '', '', // J-O (metrics - Phase 2)
  '', // P (VPC - Phase 2)
  '', // Q (Recommended Bid - Phase 2)
  '', // R (Action - Phase 2)
  '', // S (Priority - Phase 2)
  '', // T (Approval - user fills)
  new Date().toISOString() // U (Last Updated)
]);

await sheets.spreadsheets.values.update({
  spreadsheetId: process.env.GOOGLE_SHEETS_ID,
  range: 'Keywords!A11',  // Start at Row 11
  valueInputOption: 'RAW',
  resource: { values }
});
```

---

### 3.4 Error Handling Strategy

**The script should handle:**

1. **Authentication failures**
   - Log error
   - Exit with code 1
   - Message: "Failed to authenticate with Amazon Ads API"

2. **API rate limits**
   - Wait 1 second between paginated requests
   - Retry on 429 status (rate limit)
   - Max 3 retries

3. **Network errors**
   - Retry with exponential backoff
   - Log all failed attempts
   - Continue with partial data if needed

4. **Google Sheets errors**
   - Verify sheet exists before writing
   - Create sheet if missing
   - Log write confirmations

---

### 3.5 Logging Strategy

**Console output should show:**

```
🚀 Starting PPC data fetch...

✅ Authenticated with Amazon Ads API
   Profile ID: 123456789

📊 Fetching campaigns...
   Page 1: 100 campaigns
   Page 2: 50 campaigns
   Total: 150 campaigns fetched

📊 Fetching ad groups...
   Page 1: 100 ad groups
   Page 2: 100 ad groups
   Page 3: 25 ad groups
   Total: 225 ad groups fetched

📊 Fetching keywords...
   Page 1: 100 keywords
   Page 2: 100 keywords
   ...
   Page 8: 45 keywords
   Total: 745 keywords fetched

📝 Syncing to Google Sheets...
   ✅ Campaigns synced (150 rows)
   ✅ Ad Groups synced (225 rows)
   ✅ Keywords synced (745 rows)

🎉 Complete! Data synced successfully.

📊 Summary:
   Set A campaigns: 75
   Set B campaigns: 75
   Total keywords: 745
   Execution time: 2m 34s
```

---

## ✅ STEP 4: VERIFICATION CHECKLIST

### 4.1 Pre-Run Verification

**Before running the script, verify:**

- [ ] `.env` file has all credentials
- [ ] `node_modules/` folder exists
- [ ] `fetch-ppc-data.js` file created
- [ ] Google Sheets tabs created
- [ ] Headers in Row 10 for all tabs
- [ ] Conditional formatting applied
- [ ] Data validation (dropdowns) added

---

### 4.2 First Test Run (When Ready)

**Command to run:**

```bash
node fetch-ppc-data.js
```

**Expected behavior:**

1. Authenticates with Amazon Ads
2. Fetches campaigns with pagination
3. Fetches ad groups with pagination
4. Fetches keywords with pagination
5. Writes to Google Sheets starting Row 11
6. Shows summary statistics

**Verification after run:**

- [ ] No error messages in terminal
- [ ] Google Sheets "PPC Campaigns" tab populated
- [ ] Google Sheets "Ad Groups" tab populated
- [ ] Google Sheets "Keywords" tab populated
- [ ] Test Group column (G) shows A, B, or CONTROL
- [ ] Row 1-10 not overwritten (headers intact)
- [ ] Data starts in Row 11

---

### 4.3 Visual Verification

**Open Google Sheets and check:**

1. **Color coding works:**
   - [ ] Type "CRITICAL" in Priority column → turns red
   - [ ] Type "HIGH" → turns orange
   - [ ] Type "MEDIUM" → turns yellow
   - [ ] Type "LOW" → turns green

2. **Approval dropdown works:**
   - [ ] Click Approval cell → dropdown appears
   - [ ] Select "APPROVE" → row turns green
   - [ ] Select "REJECT" → row turns red
   - [ ] Select "HOLD" → row turns yellow

3. **Test group detection:**
   - [ ] Campaigns with `[KW-ONLY]` → Column Z = "A"
   - [ ] Campaigns with `[KW+AUD]` → Column Z = "B"
   - [ ] Other campaigns → Column Z = "CONTROL"

4. **Data integrity:**
   - [ ] Keyword IDs match between Keywords and Ad Groups tabs
   - [ ] Campaign IDs match between Ad Groups and Campaigns tabs
   - [ ] No duplicate rows
   - [ ] No missing critical data (IDs, names, states)

---

## 📊 STEP 5: POST-IMPLEMENTATION TASKS

### 5.1 Document API Call Count

**Track for billing purposes:**

```
Campaigns: 150 total / 100 per page = 2 API calls
Ad Groups: 225 total / 100 per page = 3 API calls
Keywords: 745 total / 100 per page = 8 API calls

Total API calls: 13
Amazon API limit: 100 calls/day (check your plan)
```

**Recommendation:** Run script max 7 times per day to stay under limit

---

### 5.2 Schedule Recommendations

**Suggested schedule:**

- **Daily:** Run once in the morning (8am)
- **Weekly:** Deep review on Mondays
- **Monthly:** Full audit and A/B test analysis

**Automation (future):**

- Use Windows Task Scheduler to run script daily
- Or use `node-cron` for scheduling within Node.js

---

### 5.3 Backup Strategy

**Before each run:**

```bash
# Create backup of Google Sheets data
# (Manual: File → Make a copy)
```

**After major changes:**

```bash
# Export Keywords tab to CSV
# (Manual: File → Download → CSV)
```

---

## 🎯 SUCCESS CRITERIA

**Phase 1A is complete when:**

- ✅ Script runs without errors
- ✅ All 3 tabs populate with data
- ✅ Test groups detected correctly (A/B/CONTROL)
- ✅ Color coding displays properly
- ✅ Approval dropdowns functional
- ✅ Data starts in Row 11 (headers protected)
- ✅ User can review and approve campaigns visually

**Time to complete:** 3-4 hours (including testing)

---

## 📋 NEXT STEPS

**After Phase 1A is verified:**

1. **Phase 1B:** Add audience targeting clause fetching (optional)
2. **Phase 2:** Implement bulk file generation
3. **Phase 3:** Add metrics from Reporting API
4. **Phase 4:** Implement Google Apps Script menu

**For now:** Focus on getting Phase 1A working perfectly

---

**Status:** ✅ DOCUMENTATION COMPLETE  
**Ready for:** Script creation and testing  
**Estimated time:** 1-2 hours for script development, 1-2 hours for testing
