# 📊 BULK EXPORT: FINAL IMPLEMENTATION PLAN

## A/B Testing Strategy for Sponsored Products Optimization

**Version:** 2.0 (FINAL)  
**Last Updated:** 2026-02-01  
**Status:** ✅ READY FOR IMPLEMENTATION

---

## 🎯 EXECUTIVE SUMMARY

### Scope Confirmed

✅ **Campaign Type:** Sponsored Products (SP)  
✅ **Current Setup:** Audience targets already configured (confirmed via screenshot)  
✅ **Strategy:** A/B test pure keyword optimization vs. keyword+audience optimization  
🔮 **Future:** Video ads (Sponsored Display / Sponsored Brands Video) - documented for Phase 3

---

## 🧪 A/B TESTING STRATEGY

### The Hypothesis

> **"Do audience bid adjustments in Sponsored Products campaigns improve ROAS compared to pure keyword optimization?"**

### Test Design

#### **Campaign Set A: Pure Keyword Optimization (Control)**

- **Optimization:** VPC-based keyword bid adjustments only
- **Data Source:** `/sp/keywords/list`
- **Strategies Applied:** VPC, Bleeder Detection, Sales Stealing
- **Audience Settings:** None or default (no manual adjustments)
- **Tagging:** Campaign names contain `[KW-ONLY]` tag

#### **Campaign Set B: Keyword + Audience Optimization (Treatment)**

- **Optimization:** VPC keywords PLUS audience bid adjustments
- **Data Sources:**
  - `/sp/keywords/list` (keywords)
  - `/sp/targetingClauses/list` (audience targets)
- **Strategies Applied:** All 4 strategies (VPC + Bleeders + Sales Stealing + Audience)
- **Audience Settings:** Bid adjustments based on CVR lift
- **Tagging:** Campaign names contain `[KW+AUD]` tag

### Success Metrics (30-Day Window)

| Metric | Set A Target | Set B Target | Comparison |
|--------|-------------|-------------|------------|
| **ACOS** | ≤ 25% | ≤ 20% | B should be 5pp better |
| **CVR** | Baseline | +15% | B should convert better |
| **ROI** | 4:1 | 5:1 | B should generate more revenue per $ |
| **TACoS** | ≤ 8% | ≤ 6% | B should be more efficient |

### Evaluation Criteria

**After 30 days:**

1. If Set B wins → Scale audience optimization to all campaigns
2. If Set A wins → Focus on keyword optimization only
3. If tie → Segment by product (some products benefit from audiences, others don't)

---

## 🏗️ ENHANCED DATA MODEL

### New API Endpoints (Corrected)

| Entity | Endpoint | Media Type | Priority |
|--------|----------|------------|----------|
| Campaigns | `POST /sp/campaigns/list` | `application/vnd.spcampaign.v3+json` | ✅ P0 |
| Ad Groups | `POST /sp/adGroups/list` | `application/vnd.spadgroup.v3+json` | ✅ P0 |
| Keywords | `POST /sp/keywords/list` | `application/vnd.spkeyword.v3+json` | ✅ P0 |
| Negative Keywords | `POST /sp/negativeKeywords/list` | `application/vnd.spnegativekeyword.v3+json` | ⚠️ P1 |
| **Targeting Clauses** | `POST /sp/targetingClauses/list` | `application/vnd.sptargetingclause.v3+json` | ✅ P0 |

### Google Sheets Tabs (Enhanced)

#### **Tab 1: PPC Campaigns** (Enhanced)

- Existing columns A-Y (from implementation_plan_v2.md)
- **NEW Column Z:** `Test Group` (A or B or CONTROL)
- **NEW Column AA:** `Optimization Type` (KW-ONLY or KW+AUD)

#### **Tab 2: Ad Groups**

| Column | Field | Source |
|--------|-------|--------|
| A | Ad Group Name | API |
| B | Ad Group ID | API |
| C | Campaign ID | API |
| D | Campaign Name | Lookup |
| E | State | API |
| F | Default Bid | API |
| G-L | Metrics | Reporting API (Phase 2) |

#### **Tab 3: Keywords** (Enhanced for A/B)

| Column | Field | Source | Notes |
|--------|-------|--------|-------|
| A | Keyword Text | API | e.g., "berberine supplement" |
| B | Keyword ID | API | Unique identifier |
| C | Match Type | API | EXACT/PHRASE/BROAD |
| D | Ad Group ID | API | Parent |
| E | Campaign ID | API | Grandparent |
| F | Campaign Name | Lookup | For reference |
| G | **Test Group** | Lookup | A/B/CONTROL (from campaigns) |
| H | State | API | ENABLED/PAUSED |
| I | Current Bid | API | Original bid |
| J-O | Metrics | Reporting | Clicks, Spend, Sales, etc. |
| P | **VPC** | Formula | =Sales/Clicks |
| Q | **ACOS** | Formula | =Spend/Sales |
| R | **New Bid (VPC)** | Formula | VPC calculation |
| S | **Action** | Formula | INCREASE/REDUCE/PAUSE |
| T | **Approved** | Manual | YES/NO |
| U | Last Updated | Logic | Timestamp |

#### **Tab 4: Targeting Clauses (Audiences)** (NEW)

| Column | Field | Source | Notes |
|--------|-------|--------|-------|
| A | Targeting Clause ID | API | Unique |
| B | Expression Type | API | Filter for "audience" |
| C | Expression Value | API | e.g., "views(remarketing_window=30d)" |
| D | **Audience Name** | Logic | Parsed from expression |
| E | Campaign ID | API | Parent |
| F | Campaign Name | Lookup | For reference |
| G | **Test Group** | Lookup | Should be "B" (treatment only) |
| H | Ad Group ID | API | Parent |
| I | State | API | ENABLED/PAUSED |
| J | Current Bid | API | Current bid |
| K-O | Metrics | Reporting | Clicks, Conversions, etc. |
| P | **CVR** | Formula | =Conversions/Clicks |
| Q | **CVR Lift** | Formula | =CVR / Campaign Avg CVR |
| R | **Recommended Bid** | Formula | Based on CVR lift tier |
| S | **Action** | Formula | INCREASE/REDUCE/HOLD |
| T | **Approved** | Manual | YES/NO |
| U | Last Updated | Logic | Timestamp |

#### **Tab 5: Negative Keywords**

- Standard tracking (name, match type, campaign, state)

---

## 💻 IMPLEMENTATION PHASES

### Phase 1A: Enhanced Data Fetching (Keywords Only)

**Script:** `fetch-ppc-data.js` (renamed from `fetch-all-ppc-data.js`)

**What it does:**

1. Authenticate with Amazon Ads API
2. Fetch campaigns, ad groups, keywords
3. Identify test groups (A/B) based on campaign name tags
4. Sync to Google Sheets tabs 1-3

**Execution time:** ~5-10 minutes

---

### Phase 1B: Audience Data Fetching (Optional Enhancement)

**Script:** `fetch-targeting-clauses.js` (separate script)

**What it does:**

1. Fetch targeting clauses via `/sp/targetingClauses/list`
2. Filter for `expressionType === "audience"`
3. Parse audience expressions into human-readable names
4. Sync to "Targeting Clauses" sheet (Tab 4)

**Execution time:** ~2-3 minutes

**Why separate?**

- Not all users have audience targets
- Easier to debug
- Can run independently

---

### Phase 2: Bulk Export Generator

**Script:** `generate-bulk-csv.js`

**User Workflow:**

1. Run data fetch scripts
2. Review Google Sheets
3. Mark **Approved = YES** for changes
4. Run bulk generator
5. Choose output type:
   - **Option 1:** Single file (all approved changes)
   - **Option 2:** Two files (Set A vs Set B, for side-by-side comparison)
   - **Option 3:** Filtered file (only Set A OR only Set B)

**Output Files:**

- `amazon-bulk-keywords-only-2026-02-01.xlsx` (Set A changes)
- `amazon-bulk-keywords-audiences-2026-02-01.xlsx` (Set B changes)

---

### Phase 3: Reporting & Analytics

**Script:** `compare-test-results.js` (NEW)

**What it does:**

1. Read Reporting API metrics for Set A vs Set B
2. Calculate statistical significance
3. Generate comparison report
4. Recommend winning strategy

**Output:** `ab_test_results.md` (artifact)

---

## 📄 AMAZON BULK SHEET FORMAT (Corrected)

### Column Structure

| Column Name | Description | Example | Required? |
|-------------|-------------|---------|-----------|
| `Record ID` | Campaign, Ad Group, or Keyword ID | `123456789` | ✅ |
| `Record Type` | Campaign / Ad Group / Keyword / Product Targeting | `Keyword` | ✅ |
| `Campaign ID` | Parent campaign | `111222333` | ✅ |
| `Ad Group ID` | Parent ad group (for keywords) | `987654321` | For keywords |
| `Keyword` | Keyword text | `berberine supplement` | For keywords |
| `Keyword ID` | Unique keyword identifier | `555666777` | For keywords |
| `Match Type` | EXACT / PHRASE / BROAD | `EXACT` | For keywords |
| `Max Bid` | New bid amount | `2.60` | ✅ |
| `Status` | ENABLED / PAUSED / ARCHIVED | `ENABLED` | ✅ |

### Targeting Clauses (Audiences) in Bulk Sheet

For audience bid adjustments, the format is:

| Record Type | Campaign ID | Ad Group ID | Targeting Clause ID | Max Bid | Status |
|-------------|-------------|-------------|---------------------|---------|--------|
| `Product Targeting` | `111222333` | `987654321` | `444555666` | `3.00` | `ENABLED` |

**Important Note:**

- Audiences appear as "Product Targeting" record type
- You MUST include the `Targeting Clause ID` (fetched from API)
- You can only UPDATE existing targeting clauses, not create new ones

---

## 🎬 FUTURE PHASES (Video Ads)

### Phase 3: Sponsored Display (SD) Integration

**User Note:** "I will give you video ads later"

**What this likely means:**

- Sponsored Display campaigns (image + video ads)
- OR Sponsored Brands Video campaigns

**Implementation Prep:**

1. Document SD API endpoints now
2. Design separate Google Sheets tabs for SD
3. Separate bulk sheet generator (different format)

### SD API Endpoints (For Future Reference)

| Entity | Endpoint | Media Type |
|--------|----------|------------|
| SD Campaigns | `POST /sd/campaigns` | `application/vnd.sdcampaign.v4+json` |
| SD Ad Groups | `POST /sd/adGroups` | `application/vnd.sdadgroup.v4+json` |
| SD Product Ads | `POST /sd/productAds` | `application/vnd.sdproductad.v4+json` |
| SD Targets | `POST /sd/targets` | `application/vnd.sdtarget.v4+json` |
| **SD Creative Assets** | `POST /sd/creatives` | For video ads |

**Complexity:** HIGH (requires video asset management, different bidding model, CPM vs CPC)

**Recommendation:** Implement only after SP optimization is proven successful

---

## 📋 IMPLEMENTATION CHECKLIST

### Pre-Implementation

- [ ] Install dependencies: `npm install xlsx`
- [ ] Backup current Google Sheets
- [ ] Create new tabs:
  - [ ] Ad Groups
  - [ ] Keywords
  - [ ] Targeting Clauses (Audiences)
  - [ ] Negative Keywords
- [ ] Add column Z (Test Group) to PPC Campaigns sheet
- [ ] Add column AA (Optimization Type) to PPC Campaigns sheet

### Phase 1A: Keyword Data Sync

- [ ] Create `fetch-ppc-data.js`
- [ ] Test authentication
- [ ] Test campaign fetch
- [ ] Test ad group fetch
- [ ] Test keyword fetch
- [ ] Verify test group tagging logic
- [ ] Verify all sheets populate correctly

### Phase 1B: Audience Data Sync

- [ ] Create `fetch-targeting-clauses.js`
- [ ] Test targeting clause fetch
- [ ] Verify expression type filtering (audience only)
- [ ] Test audience name parsing
- [ ] Verify sync to Targeting Clauses sheet

### Phase 2: Bulk Export

- [ ] Create `generate-bulk-csv.js`
- [ ] Implement Set A export (keywords only)
- [ ] Implement Set B export (keywords + audiences)
- [ ] Test Excel file generation
- [ ] Verify Amazon bulk sheet format
- [ ] Test upload to Amazon Ads Console (dry run)

### Phase 3: A/B Testing

- [ ] Run Set A campaigns for 30 days
- [ ] Run Set B campaigns for 30 days
- [ ] Fetch performance metrics
- [ ] Generate comparison report
- [ ] Document winning strategy

---

## 🔧 CODE STRUCTURE (High-Level)

### File Organization

```
amazon-ppc-platform/
├── fetch-ppc-data.js              # Main data sync (campaigns, ad groups, keywords)
├── fetch-targeting-clauses.js     # Audience targets sync
├── generate-bulk-csv.js           # Bulk export generator
├── compare-test-results.js        # A/B test analysis (future)
├── src/
│   └── titan/
│       └── sync/
│           └── unified-sheets.js  # Existing sheets service
└── .env                           # Credentials
```

### Execution Order

**Daily Routine:**

```bash
# Morning: Fetch latest data
node fetch-ppc-data.js           # ~5-10 min
node fetch-targeting-clauses.js  # ~2-3 min (optional)

# Afternoon: Review & export
# (User reviews Google Sheets, marks Approved = YES)
node generate-bulk-csv.js        # Instant

# Upload files to Amazon Ads Console
```

---

## ✅ SUCCESS CRITERIA

### Immediate (Post-Implementation)

- [ ] All API endpoints return data successfully
- [ ] Google Sheets populate without errors
- [ ] Test group tagging works (A/B/CONTROL)
- [ ] Bulk CSV files open in Excel without errors
- [ ] Amazon accepts file uploads (no format errors)

### 7-Day Performance

- [ ] Set A and Set B campaigns running in parallel
- [ ] No data sync failures
- [ ] User can easily identify which campaigns are in which set
- [ ] Metrics flowing into reporting for both sets

### 30-Day Performance

- [ ] Clear winner identified between Set A and Set B
- [ ] ACOS improved by 10%+ for winning set
- [ ] CVR improved by 15%+ for winning set
- [ ] Winning strategy scaled to all campaigns

---

## 🚨 CRITICAL NOTES

### 1. Test Group Discipline

**IMPORTANT:** To ensure clean A/B test results:

- Set A campaigns should have NO audience bid adjustments
- Set B campaigns should have BOTH keyword + audience optimizations
- Do NOT mix strategies mid-test
- Use campaign name tags to enforce separation

### 2. Sample Size Requirements

- Minimum 10 campaigns per test group
- Minimum $500 ad spend per test group
- Minimum 30 days for statistical significance

### 3. Audience Targeting Limitations

**What you CAN do:**
✅ Adjust bids for existing audience targeting clauses  
✅ Enable/pause existing audience targets  
✅ Export to bulk sheet for manual upload  

**What you CANNOT do:**
❌ Create new audience segments via API (use Amazon UI)  
❌ Define custom audience rules programmatically  
❌ Bulk create targeting clauses (update only)  

---

## 📊 EXPECTED OUTCOMES

### Conservative Estimate

- Set A (Keywords Only): 5-10% ACOS improvement
- Set B (Keywords + Audiences): 15-20% ACOS improvement
- Winner: Set B (moderate confidence)

### Optimistic Estimate

- Set A: 10-15% improvement
- Set B: 25-30% improvement
- Winner: Set B (high confidence)

### Learning Value

Even if Set A wins, the test provides:

- Data-driven decision on audience value
- Baseline for future SP optimizations
- Campaign-level insights on what works

---

## 🔮 ROADMAP

### ✅ Phase 1: Sponsored Products Optimization (Current)

- Keywords + Audience bid adjustments
- A/B testing framework
- Bulk CSV export

### ⏳ Phase 2: Reporting Integration (Next)

- Fetch metrics from Reporting API
- Auto-populate spend, sales, clicks, orders
- A/B test result comparison

### 🔮 Phase 3: Video Ads (Future)

- Sponsored Display campaigns
- Video creative management
- Separate bulk operations workflow

### 🔮 Phase 4: Full Automation (Future)

- API-driven bid updates (no manual CSV)
- Scheduled optimization runs
- Slack/email notifications

---

**Status:** ✅ FINAL PLAN APPROVED - READY FOR CODING  
**Next Step:** Begin implementation of `fetch-ppc-data.js`
