# 🏗️ A/B TEST STRUCTURE: Campaign Hierarchy Analysis

**Version:** 1.0  
**Last Updated:** 2026-02-01  
**Status:** 📊 ARCHITECTURE DECISION

---

## 📊 AMAZON ADS CAMPAIGN HIERARCHY

```
Portfolio (Budget Container)
    ↓
Campaign (Targeting Strategy Level)
    ↓
Ad Group (Keyword/Product Grouping)
    ↓
Targets (Keywords, Products, Audiences)
        ↓
    Individual Keywords/ASINs/Audiences
```

### Detailed Breakdown

| Level | Purpose | Key Settings | Examples |
|-------|---------|--------------|----------|
| **Portfolio** | Budget management across multiple campaigns | Daily budget cap, budget rules | "Q1 2026 Testing", "Brand Defense" |
| **Campaign** | Strategic objective and targeting type | Daily budget, targeting type (MANUAL/AUTO), bid strategy, start/end dates | "Berberine - Exact Match", "Competitor Conquest" |
| **Ad Group** | Product grouping with shared default bid | Default bid, product list (ASINs) | "DHB 500mg", "Glucovantage Bundle" |
| **Targets** | Specific targeting entities | Individual bids, match types, states | Keyword: "berberine", Audience: "Purchased Brand" |

---

## 🧪 THREE A/B TEST STRUCTURE OPTIONS

### **Option 1: Different Portfolios** 🔴 NOT RECOMMENDED

**Structure:**

```
Portfolio A: "Test - Keywords Only"
    Campaign: "Berberine - Exact [KW-ONLY]"
    Campaign: "DHB - Phrase [KW-ONLY]"
    Campaign: "Competitor - Broad [KW-ONLY]"

Portfolio B: "Test - Keywords + Audiences"
    Campaign: "Berberine - Exact [KW+AUD]"
    Campaign: "DHB - Phrase [KW+AUD]"
    Campaign: "Competitor - Broad [KW+AUD]"
```

**Pros:**

- ✅ Clean budget separation (can cap Portfolio A at $500, Portfolio B at $500)
- ✅ Easy to filter in reporting (group by portfolio)

**Cons:**

- ❌ **Duplicate campaign management** (2x campaigns to maintain)
- ❌ **Different ASINs/products** could skew results if not perfectly matched
- ❌ **Hard to ensure identical settings** (bids, placements, schedules)
- ❌ Portfolio-level budget caps can cause uneven pacing

**Verdict:** ⚠️ Too complex, high risk of confounding variables

---

### **Option 2: Different Campaigns (Same Portfolio)** ✅ **RECOMMENDED**

**Structure:**

```
Portfolio: "PPC Optimization Test - Feb 2026"
    ↓
Campaign A1: "Berberine - Exact [KW-ONLY]"
    Ad Group: "DHB 500mg"
        Keyword: "berberine supplement" (EXACT)
        Keyword: "dhb supplement" (EXACT)
        
Campaign A2: "DHB - Phrase [KW-ONLY]"
    Ad Group: "DHB Bundle"
        Keyword: "berberine dihydroberberine" (PHRASE)

Campaign B1: "Berberine - Exact [KW+AUD]"
    Ad Group: "DHB 500mg"
        Keyword: "berberine supplement" (EXACT)
        Keyword: "dhb supplement" (EXACT)
        Targeting Clause: Audience - "Purchased Brand Product"
        
Campaign B2: "DHB - Phrase [KW+AUD]"
    Ad Group: "DHB Bundle"
        Keyword: "berberine dihydroberberine" (PHRASE)
        Targeting Clause: Audience - "Viewed Product (30d)"
```

**Pros:**

- ✅ **Clean isolation**: Keywords and audiences in separate campaigns
- ✅ **Same portfolio**: Shared budget pool, fair competition
- ✅ **Easy duplication**: Clone Set A campaigns → Add audiences → Create Set B
- ✅ **Independent metrics**: Each campaign has own ACOS, CVR, ROI
- ✅ **API-friendly**: Easy to tag and filter in bulk operations

**Cons:**

- ⚠️ Requires campaign duplication (but this is necessary for valid A/B test)
- ⚠️ Need to manually keep settings in sync (but our scripts can automate this)

**Verdict:** ✅ **BEST CHOICE** - Gold standard for A/B testing

---

### **Option 3: Different Ad Groups (Same Campaign)** 🟡 POSSIBLE BUT RISKY

**Structure:**

```
Campaign: "Berberine - Test Campaign"
    ↓
Ad Group A: "DHB 500mg - KW Only"
    Keyword: "berberine supplement" (EXACT)
    Keyword: "dhb supplement" (EXACT)
    (NO AUDIENCES)

Ad Group B: "DHB 500mg - KW + Audiences"
    Keyword: "berberine supplement" (EXACT)
    Keyword: "dhb supplement" (EXACT)
    Targeting Clause: Audience - "Purchased Brand Product"
```

**Pros:**

- ✅ Single campaign to manage
- ✅ Shared campaign-level settings (budget, schedule, bid strategy)

**Cons:**

- ❌ **Campaign budget is shared** - Can't allocate $500 to each test group
- ❌ **Campaign-level bid adjustments apply to both** (e.g., Top of Search bid boost affects both ad groups)
- ❌ **Harder to measure campaign-level ACOS** - Need to aggregate at ad group level
- ❌ **Amazon's algorithm treats them as related** (learning from one may influence the other)
- ❌ **Keywords might overlap** - If both ad groups bid on same keyword, Amazon picks higher bid

**Verdict:** ⚠️ **NOT IDEAL** - Too many confounding variables

---

## 🏆 FINAL RECOMMENDATION: Option 2 (Separate Campaigns)

### Why This Is Best

1. **Statistical Validity**
   - Each campaign is an independent unit
   - No shared budgets or bid strategies
   - Clean comparison of ACOS, CVR, ROI

2. **Amazon Best Practices**
   - Campaigns are the natural level for strategic testing
   - Ad groups are meant for product/keyword grouping, not A/B testing
   - Audiences can be applied at campaign level in SP

3. **Operational Simplicity**
   - Easy to clone campaigns (Set A → Set B)
   - Easy to filter in API (`campaignName.includes('[KW-ONLY]')`)
   - Easy to report (group by campaign tag)

4. **Budget Control**
   - Portfolio-level budget ensures fair allocation
   - Can set individual campaign budgets if needed
   - No competition for impressions within same campaign

---

## 📋 RECOMMENDED CAMPAIGN STRUCTURE

### Portfolio Setup

**Portfolio Name:** `PPC Optimization Test - Feb 2026`  
**Portfolio Budget:** `$1000/day` (or leave uncapped)  
**Budget Policy:** Distribute evenly across campaigns

### Campaign Naming Convention

**Format:** `{Product} - {Match Type} [{Test Group}]`

**Examples:**

- `Berberine - Exact [KW-ONLY]` ← Set A
- `Berberine - Exact [KW+AUD]` ← Set B
- `DHB Bundle - Phrase [KW-ONLY]` ← Set A
- `DHB Bundle - Phrase [KW+AUD]` ← Set B

### Campaign Pairing Strategy

**For each product/strategy, create TWO campaigns:**

| Set A (Control) | Set B (Treatment) |
|----------------|------------------|
| Same targeting type | Same targeting type |
| Same keywords | Same keywords |
| Same bids (initially) | Same bids (initially) |
| Same ASINs | Same ASINs |
| Same placement multipliers | Same placement multipliers |
| **NO AUDIENCES** | **WITH AUDIENCES** |

### Ad Group Structure (Within Each Campaign)

**Keep it simple:**

- **1 ad group per campaign** (for clean testing)
- **Ad Group Name:** Match campaign name (e.g., "Berberine - Exact")
- **Default Bid:** Start with same bid for both Set A and Set B

**Example:**

```
Campaign: "Berberine - Exact [KW-ONLY]"
    Ad Group: "Berberine - Exact"
        Keywords:
            - "berberine supplement" (EXACT, $2.50)
            - "dhb supplement" (EXACT, $2.00)
        Products/ASINs:
            - B0DTDZFMY7 (ELEMNT Super Berberine)

Campaign: "Berberine - Exact [KW+AUD]"
    Ad Group: "Berberine - Exact"
        Keywords:
            - "berberine supplement" (EXACT, $2.50)
            - "dhb supplement" (EXACT, $2.00)
        Targeting Clauses (Audiences):
            - "Purchased Brand Product" (Bid: $3.00, +20%)
            - "Viewed Product 30d" (Bid: $2.75, +10%)
        Products/ASINs:
            - B0DTDZFMY7 (ELEMNT Super Berberine)
```

---

## 🎯 TRACKING & MEASUREMENT

### Campaign-Level Metrics

**Set A (Keywords Only):**

```
Total Campaigns: 10
Total Ad Spend: $500
Total Sales: $2,000
ACOS: 25%
Orders: 50
CVR: 5%
```

**Set B (Keywords + Audiences):**

```
Total Campaigns: 10
Total Ad Spend: $500
Total Sales: $2,500
ACOS: 20%
Orders: 65
CVR: 6.5%
```

### Google Sheets Tracking

**Column Z (Test Group):** `A` or `B` or `CONTROL`  
**Column AA (Optimization Type):** `KW-ONLY` or `KW+AUD`

**Filtering in Sheets:**

```
Set A Campaigns: =FILTER(A:Y, Z:Z="A")
Set B Campaigns: =FILTER(A:Y, Z:Z="B")
```

**Aggregate Metrics:**

```
Set A Total Spend: =SUMIF(Z:Z, "A", E:E)
Set B Total Spend: =SUMIF(Z:Z, "B", E:E)
```

---

## 💰 BUDGET ALLOCATION EXAMPLE

### Test Parameters

- **Duration:** 30 days
- **Total Budget:** $1,000/day
- **Set A Budget:** $500/day (10 campaigns = $50/campaign/day)
- **Set B Budget:** $500/day (10 campaigns = $50/campaign/day)

### Campaign Budget Settings

**Option 1: Individual Campaign Budgets (Strict)**

- Each Set A campaign: $50/day cap
- Each Set B campaign: $50/day cap
- **Pro:** Ensures equal spend
- **Con:** May cap out early if campaign is performing well

**Option 2: Shared Portfolio Budget (Flexible)**

- Portfolio cap: $1,000/day
- No individual campaign caps
- **Pro:** Budget flows to best performers
- **Con:** Risk of Set B dominating budget if it performs much better

**Recommendation:** **Option 1** for clean A/B test, **Option 2** after determining winner

---

## 🔧 IMPLEMENTATION IN SCRIPTS

### Campaign Tagging Logic

```javascript
// Detect test group from campaign name
function getTestGroup(campaignName) {
    if (campaignName.includes('[KW-ONLY]')) return 'A';
    if (campaignName.includes('[KW+AUD]')) return 'B';
    return 'CONTROL';
}

// Detect optimization type
function getOptimizationType(campaignName) {
    if (campaignName.includes('[KW-ONLY]')) return 'KW-ONLY';
    if (campaignName.includes('[KW+AUD]')) return 'KW+AUD';
    return 'NONE';
}
```

### Bulk Export Filtering

```javascript
// Option 2: Two files (Set A vs Set B)
function generateTwoFiles(approvedKeywords) {
    const setA = approvedKeywords.filter(kw => kw.testGroup === 'A');
    const setB = approvedKeywords.filter(kw => kw.testGroup === 'B');
    
    exportToExcel(setA, 'amazon-bulk-set-a-2026-02-01.xlsx');
    exportToExcel(setB, 'amazon-bulk-set-b-2026-02-01.xlsx');
}
```

---

## ✅ DECISION SUMMARY

**RECOMMENDED STRUCTURE:** **Option 2 - Separate Campaigns (Same Portfolio)**

| Aspect | Decision |
|--------|----------|
| **Portfolio Level** | 1 shared portfolio for both test groups |
| **Campaign Level** | Separate campaigns for Set A and Set B (duplicate campaigns) |
| **Ad Group Level** | 1 ad group per campaign (keep simple) |
| **Tagging Method** | Campaign name suffix: `[KW-ONLY]` or `[KW+AUD]` |
| **Budget Allocation** | Equal spend: $50/day per campaign (20 campaigns total) |
| **Tracking** | Google Sheets columns Z (Test Group) and AA (Optimization Type) |

**This structure provides:**

- ✅ Clean statistical comparison
- ✅ Independent campaign metrics
- ✅ Easy to scale winner
- ✅ API-friendly for bulk operations

---

**Status:** ✅ ARCHITECTURE APPROVED  
**Next Step:** Update bulk export plan to reflect campaign-level structure
