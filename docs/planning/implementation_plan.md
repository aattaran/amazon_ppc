# Chris Rawlings PPC Framework Integration Plan

**Date**: February 1, 2026  
**Framework Source**: Amazon PPC Campaign Optimization - 2026 Walkthrough (Chris Rawlings)

---

## Executive Summary

Chris Rawlings' framework is **significantly more advanced** than our current setup. It focuses on **incremental, placement-based optimization** rather than just bleeder detection. To implement it, we need to:

1. **Fetch performance metrics** (we currently only have campaign structure)
2. **Add placement-level analysis** (Top of Search vs Product Pages vs Rest of Search)
3. **Implement the Ideal Bid Formula**: `(Sales / Clicks) × Target ACoS`
4. **Add statistical significance checks** before recommending keyword negations
5. **Create campaign-type-specific optimization logic**

---

## Current State vs. Framework Requirements

### What We Have ✅

```javascript
// fetch-ppc-quick.js currently fetches:
{
    campaignName: "berberine auto",
    state: "ENABLED",
    targetingType: "AUTO",
    budget: 10.00,
    
    // ❌ Below are hardcoded to 0 (placeholders)
    spend: 0,
    sales: 0,
    impressions: 0,
    clicks: 0,
    orders: 0
}
```

### What We Need ❌

**Critical Missing Data:**

1. **Placement Performance** - Where ads show matters most
   - Top of Search ACoS  
   - Product Pages ACoS
   - Rest of Search ACoS
   - Current bid adjusters per placement

2. **Keyword-Level Metrics** - For ideal bid calculation
   - Sales per click per keyword
   - Individual keyword ACoS
   - Current vs ideal bid

3. **Search Term Reports** - For negative mining
   - Irrelevant search terms
   - Click/spend with no sales

4. **Product Variation Data** - For auto campaigns
   - CTR per ASIN variation
   - Which variations to disable

---

## Key Framework Concepts

### 1. The Placement Rule (Most Important)

**Concept**: Ads appear in 3 places with different performance:

- Top of Search (highest intent)
- Rest of Search (medium intent)
- Product Pages (browsing)

**Implementation**: Increase bid adjusters for winning placements by 10-25%

**Example**:

```
Campaign: berberine auto
Top of Search ACoS: 121% (winner)
Product Pages ACoS: 160% (loser)

Action: Increase Top of Search adjuster from 50% → 65%
        Decrease Product Pages adjuster from 0% → -10%
```

### 2. Ideal Bid Formula

**Formula**: `Ideal Bid = (Sales / Clicks) × Target ACoS`

**Example**:

```
Keyword: "berberine supplement"
Sales: $85.00
Clicks: 45
Target ACoS: 25%

Sales per click = $85 / 45 = $1.89
Ideal Bid = $1.89 × 0.25 = $0.47

Current bid: $1.50
Recommended: Reduce to $1.12 (-25% incremental)
```

### 3. Statistical Significance Rule

**Rule**: Wait for `3 × conversion rate` clicks before negating

**Example**:

```
Account conversion rate: 10% (1 sale per 10 clicks)
Minimum clicks before negation: 10 × 3 = 30 clicks

Keyword: "silicone berberine"
Clicks: 12
Sales: 0

Decision: DO NOT negate yet (need 30 clicks for significance)
```

### 4. Incremental Changes

**Rule**: Adjust bids by 10-25% max at a time

**Why**: Prevents algorithm destabilization

**Example**:

```
Current bid: $2.00
Ideal bid: $0.50

DON'T: Drop to $0.50 immediately (-75%)
DO: Drop to $1.50 first (-25%), monitor, repeat
```

---

## Campaign-Type-Specific Strategies

### Auto Campaigns

**Priority Actions**:

1. Optimize placement bid adjusters (highest impact)
2. Disable low-CTR product variations
3. Mine search terms for negative phrase matches

### Keyword Campaigns (Exact/Broad)

**Priority Actions**:

1. Calculate ideal bid per keyword
2. Graduate high-volume winners to single-keyword campaigns
3. Apply statistical significance before negating

### Ranking Campaigns (Single Keyword)

**Priority Actions**:

1. **Focus on organic rank, not ACoS**
2. Aggressive Top of Search adjusters (up to 900%)
3. Accept high ACoS if rank is improving

### Product/Category Targeting

**Priority Actions**:

1. Isolate winning competitor ASINs
2. Negate specific poorly-performing products
3. Refine category targeting

---

## Implementation Roadmap

### Phase 1: Fetch Missing Data (Week 1)

**Priority 1: Placement Reports**

Create `fetch-ppc-placements.js`:

```javascript
async fetchPlacementReport(campaignId, days = 30) {
    const response = await axios.post(
        'https://advertising-api.amazon.com/v2/sp/campaigns/report',
        {
            reportDate: this.getDateRange(days),
            campaignIdFilter: [campaignId],
            metrics: [
                'campaignId',
                'campaignPlacement',  // Top of Search, Product Pages, etc.
                'impressions',
                'clicks',
                'cost',
                'attributedSales14d'
            ],
            segment: 'placement'
        },
        { headers: this.getAuthHeaders() }
    );
    
    return this.parsePlacementData(response.data);
}
```

**Priority 2: Keyword Reports**

```javascript
async fetchKeywordReport(campaignId) {
    const response = await axios.post(
        'https://advertising-api.amazon.com/v3/reporting/keywords/report',
        {
            metrics: ['clicks', 'cost', 'sales', 'impressions'],
            groupBy: ['keyword']
        }
    );
    
    return response.data;
}
```

**Priority 3: Search Term Reports**

```javascript
async fetchSearchTermReport(campaignId) {
    const response = await axios.post(
        'https://advertising-api.amazon.com/v2/sp/searchTerms/report',
        {
            metrics: ['query', 'clicks', 'cost', 'sales']
        }
    );
    
    return response.data;
}
```

---

### Phase 2: Build Optimization Engine (Week 2)

Create `optimization-engine.js`:

```javascript
class ChrisRawlingsOptimizer {
    
    /**
     * Calculate ideal bid using Chris Rawlings formula
     */
    calculateIdealBid(keyword, targetACoS = 0.25) {
        if (keyword.clicks === 0) return null;
        
        const salesPerClick = keyword.sales / keyword.clicks;
        const idealBid = salesPerClick * targetACoS;
        
        // Apply incremental change rule (max 25%)
        const currentBid = keyword.bid;
        const maxChange = currentBid * 0.25;
        
        if (Math.abs(idealBid - currentBid) > maxChange) {
            return currentBid + (idealBid > currentBid ? maxChange : -maxChange);
        }
        
        return idealBid;
    }
    
    /**
     * Optimize placements (highest impact)
     */
    optimizePlacements(campaign) {
        const placements = [
            { name: 'topOfSearch', data: campaign.placements.topOfSearch },
            { name: 'restOfSearch', data: campaign.placements.restOfSearch },
            { name: 'productPages', data: campaign.placements.productPages }
        ];
        
        // Sort by ACoS (best to worst)
        placements.sort((a, b) => a.data.acos - b.data.acos);
        
        const winner = placements[0];
        const loser = placements[2];
        
        return {
            action: 'ADJUST_PLACEMENTS',
            details: {
                increase: {
                    placement: winner.name,
                    from: winner.data.bidAdjuster,
                    to: Math.min(winner.data.bidAdjuster + 15, 900),
                    reason: `Lowest ACoS (${winner.data.acos}%)`
                },
                decrease: {
                    placement: loser.name,
                    from: loser.data.bidAdjuster,
                    to: Math.max(loser.data.bidAdjuster - 10, 0),
                    reason: `Highest ACoS (${loser.data.acos}%)`
                }
            }
        };
    }
    
    /**
     * Statistical significance check for negations
     */
    shouldNegateKeyword(keyword, conversionRate = 0.10) {
        const minimumClicks = (1 / conversionRate) * 3;
        
        if (keyword.clicks < minimumClicks) {
            return {
                shouldNegate: false,
                reason: `Need ${minimumClicks} clicks for statistical significance (has ${keyword.clicks})`
            };
        }
        
        if (keyword.sales === 0 && keyword.clicks >= minimumClicks) {
            return {
                shouldNegate: true,
                reason: `${keyword.clicks} clicks, $0 sales - statistically significant loser`
            };
        }
        
        return { shouldNegate: false };
    }
    
    /**
     * Campaign-type-specific recommendations
     */
    getRecommendations(campaign) {
        switch(campaign.targetingType) {
            case 'AUTO':
                return this.optimizeAutoCampaign(campaign);
            case 'MANUAL':
                return campaign.keywords.length === 1
                    ? this.optimizeRankingCampaign(campaign)
                    : this.optimizeKeywordCampaign(campaign);
            default:
                return this.optimizeGenericCampaign(campaign);
        }
    }
    
    optimizeAutoCampaign(campaign) {
        const placementRec = this.optimizePlacements(campaign);
        
        return {
            campaignType: 'AUTO',
            priority: 'Placement optimization',
            actions: [
                placementRec,
                'Check Ads tab for low-CTR variations',
                'Review search terms for negative phrase matches'
            ]
        };
    }
    
    optimizeRankingCampaign(campaign) {
        return {
            campaignType: 'RANKING',
            priority: 'Organic rank improvement',
            metric: 'Track organic rank, not ACoS',
            actions: [
                'Increase Top of Search adjuster aggressively (up to 900%)',
                'ACoS > 100% is OK if organic rank is improving',
                'Monitor keyword rank daily'
            ]
        };
    }
}
```

---

### Phase 3: Enhanced Google Sheet (Week 3)

**New Sheets Structure:**

**Sheet 1: Campaign Dashboard**

```
Campaign | Type | Spend | Sales | ACoS | Top of Search ACoS | Product Pages ACoS | Recommended Action
```

**Sheet 2: Placement Analysis** ⭐ NEW

```
Campaign | Placement | Clicks | Sales | ACoS | Bid Adjuster | Recommended Change | Expected Impact
```

**Sheet 3: Keyword Optimization** ⭐ NEW

```
Campaign | Keyword | Clicks | Sales | ACoS | Current Bid | Ideal Bid | Adjustment | Statistical Significance
```

**Sheet 4: Negative Mining** ⭐ NEW

```
Campaign | Search Term | Clicks | Spend | Sales | Should Negate? | Reason
```

---

## Comparison Table

| Feature | Your Current Setup | Chris Rawlings | Implementation Effort | Impact |
|---------|-------------------|----------------|---------------------|---------|
| **Bleeder Detection** | ✅ Basic | ✅ Advanced | Low | Medium |
| **Placement Optimization** | ❌ No | ✅ Core strategy | **HIGH** | **⭐ HIGHEST** |
| **Ideal Bid Formula** | ❌ No | ✅ Mathematical | Medium | **⭐ HIGH** |
| **Incremental Changes** | ❌ No | ✅ 10-25% rule | Low | High |
| **Statistical Significance** | ❌ No | ✅ 3x rule | Medium | Medium |
| **Campaign-Type Logic** | ❌ Generic | ✅ Specific | High | High |
| **Search Term Mining** | ❌ No | ✅ Automated | Medium | High |
| **Ranking Campaign Support** | ❌ No | ✅ Rank > ACoS | Medium | Medium |

---

## Recommended Next Steps

### This Week (Immediate)

1. **Fetch placement reports** - Single biggest optimization lever
2. **Calculate ideal bids** - Simple formula, huge value
3. **Add placement columns** to Google Sheet

### Next Week

4. **Fetch search term reports** - Enable negative keyword mining
2. **Implement statistical significance** - Prevent bad decisions
3. **Build placement optimizer**

### Following Week

7. **Create campaign-type logic** - Auto vs Manual vs Ranking
2. **Add product variation analysis**
3. **Build optimization dashboard**

---

## Quick Win Example

### Before (Your Current System)

```
Campaign: berberine auto
ACoS: 132%
Recommendation: "URGENT - Cut budget by 50%"
Action: User manually pauses campaign
```

### After (Chris Rawlings Framework)

```
Campaign: berberine auto
Overall ACoS: 132%

Placement Breakdown:
  Top of Search: 121% ACoS (50% adjuster)  ✅ WINNER
  Product Pages: 160% ACoS (0% adjuster)   ❌ LOSER

Keyword Analysis:
  "berberine supplement" - Ideal bid: $0.47 (current: $1.57)

Incremental Actions:
  1. Increase Top of Search adjuster: 50% → 65%
  2. Decrease Product Pages adjuster: 0% → -10%
  3. Reduce base bid: $1.57 → $1.18
  4. Add negative phrase: "silicone"

Expected Result: ACoS drops to ~90% without killing campaign
```

---

## Conclusion

**Yes, Chris Rawlings framework is significantly better.**

**Why**:

- ✅ More granular (placement-level not campaign-level)
- ✅ More mathematical (ideal bid formula)
- ✅ More strategic (incremental not drastic)
- ✅ More intelligent (statistical significance)
- ✅ Campaign-type aware (different strategies)

**Your current system**: Reactive (finds bleeders after damage)  
**Chris Rawlings**: Proactive (optimizes incrementally for profit)

**Priority order for implementation**:

1. 🔥 **Placement reports** (biggest ROI)
2. 🔥 **Ideal bid calculator** (simple + powerful)
3. Search term mining
4. Statistical significance
5. Campaign-type logic

Start with placements—it's the single most impactful optimization lever according to Chris Rawlings!
