# Amazon Ads API Capabilities - Quick Reference

## ✅ What You CAN Do (Native Amazon API)

### 1. Search Term Reports

**Endpoint**: `POST /reporting/reports` with `segment: "query"`

**Get actual customer search terms that triggered your ads**:

- Search query (exact phrase customer typed)
- Impressions, clicks, spend, sales per search term
- Match type that triggered the ad
- Keyword that matched the search

**Use for**:

- Finding converting search terms to promote to exact match
- Identifying bleeders (high spend, no conversions)
- Mining negative keywords
- Understanding customer language

### 2. Performance Reports

- Campaign performance
- Ad group performance  
- Keyword performance
- Product targeting performance
- Placement performance

### 3. Campaign Forecasting (DSP)

**Endpoint**: `POST /adsApi/v1/retrieve/campaignForecasts/dsp`

**Predict before you spend**:

- Estimated reach
- Expected impressions
- Forecasted spend
- Targeting effectiveness

**Requires**: DSP access and advertiser-level permissions

### 4. Automated Management

- Create/update/delete campaigns, ad groups, keywords
- Adjust bids programmatically
- Modify budgets
- Add negative keywords
- Change targeting

---

## ❌ What You CANNOT Do (Amazon API)

### 1. Competitor Keywords

**Amazon API does NOT provide**:

- Competitor organic rankings
- Keywords competitors are bidding on
- Competitor PPC spend estimates
- Competitor product keywords

**Why**: Privacy and competitive reasons

### 2. Competitor Workaround

**Your search term report CAN show**:

- When customers search "Competitor Brand" and click YOUR ad
- When customers search competitor ASINs and see your sponsored products
- Competitor-related queries from YOUR campaigns only

**Example**:

```
Search Term Report might show:
- "thorne berberine" → If customers searched this and clicked YOUR ad
- "nature made supplements" → If you're targeting competitor brands
```

---

## 🔧 How to Get Competitor Keywords

### Option 1: Helium 10 (Recommended)

**API**: Yes  
**Cost**: $99-399/mo

```javascript
// Get keywords competitor ASIN ranks for
const keywords = await helium10.keywords.getKeywords({
  asin: 'B07ABC1234', // competitor ASIN
  marketplace: 'US'
});
```

**Provides**:

- Organic keyword rankings
- Search volume
- PPC competition level
- Suggested bids

### Option 2: Jungle Scout

**API**: Limited  
**Cost**: $29-84/mo

**Features**:

- Keyword Scout tool
- Reverse ASIN lookup
- Search volume data

### Option 3: Amazon Brand Analytics (FREE!)

**Available if**: You're brand registered

**Reports include**:

- Top search terms (by department)
- Top clicked ASINs
- Conversion share

**Limitation**:

- Your brand only
- No competitor-specific data
- Updated weekly

### Option 4: Manual Research

1. Search competitor ASIN on Amazon
2. Look at "Frequently Bought Together"
3. Check "Customers Also Bought"
4. Note auto-complete suggestions
5. Check their bullet points and title for keywords

---

## 🎯 Recommended Approach

### Phase 1: Use Amazon API (Week 1-2)

1. **Search Term Reports** → Harvest your own data
   - See what's already converting
   - Find bleeders in YOUR campaigns
   - Mine negatives

2. **Performance Reports** → Optimize existing
   - Bid adjustments
   - Budget reallocation
   - Pause underperformers

### Phase 2: Add External Tools (Week 3+)

1. **Helium 10** → Competitor intelligence
   - Find competitor keywords
   - Identify keyword gaps
   - Get search volume data

2. **Your API** → Execute at scale
   - Add discovered keywords
   - Launch new campaigns
   - Automate bid management

---

## Code Example: Combined Approach

```javascript
// Step 1: Get your search term winners (Amazon API)
const searchTerms = await getSearchTermReport(30);
const winners = searchTerms.filter(t => t.conversions >= 2 && t.acos < 50);

// Step 2: Get competitor keywords (Helium 10)
const competitorKeywords = await helium10.keywords.getKeywords({
  asin: 'B07ABC1234'
});

// Step 3: Find gaps (keywords they rank for, you don't have)
const yourKeywords = await listKeywords();
const gaps = competitorKeywords.filter(ck => 
  !yourKeywords.some(yk => yk.keyword === ck.keyword)
);

// Step 4: Add gaps to your campaigns (Amazon API)
for (const gap of gaps.slice(0, 10)) { // Top 10 gaps
  await createKeyword({
    adGroupId: yourAdGroupId,
    keyword: gap.keyword,
    matchType: 'PHRASE',
    bid: gap.suggestedBid || 0.75
  });
}
```

---

## API Forecast Capabilities

### DSP Campaign Forecast

**What it predicts**:

- Reach (unique users)
- Impressions
- Spend pacing
- Audience overlap

**Input required**:

```json
{
  "campaignForecastDescriptions": [{
    "budget": 5000,
    "startDate": "2026-02-01",
    "endDate": "2026-02-28",
    "targeting": {
      "audiences": ["audience-id-1"],
      "locations": ["US"],
      "devices": ["DESKTOP", "MOBILE"]
    }
  }]
}
```

**NOT available for Sponsored Products** (different from DSP)

### Alternative: Build Your Own Predictor

```javascript
// Use historical data to predict future performance
function predictSales(campaign, proposedBudget) {
  const historicalData = getCampaignHistory(campaign.id, 90);
  
  const avgROAS = historicalData.sales / historicalData.spend;
  const predictedSales = proposedBudget * avgROAS;
  
  return {
    predictedSales,
    predictedAcos: (proposedBudget / predictedSales) * 100,
    confidence: calculateConfidence(historicalData)
  };
}
```

---

## Summary

| Feature | Amazon API | External Tool |
|---------|-----------|---------------|
| Your search terms | ✅ Yes | ❌ No |
| Your keyword performance | ✅ Yes | ❌ No |
| Competitor keywords | ❌ No | ✅ Yes |
| Search volume | ❌ No | ✅ Yes |
| Campaign management | ✅ Yes | ❌ No |
| DSP forecasting | ✅ Yes | ❌ No |
| Bid automation | ✅ Yes | ⚠️ Limited |

**Best Strategy**: Amazon API for execution + Helium 10 for intelligence
