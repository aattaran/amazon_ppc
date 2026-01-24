# Brand Metrics API - What You Actually Get

## ⚠️ Important Clarification

The **Brand Metrics API** does NOT provide competitor keyword rankings. Instead, it shows:

✅ **YOUR brand's performance metrics**  
✅ **Category benchmark comparisons** (median & top performers)  
❌ **NOT competitor names or keywords**

---

## What the Brand Metrics API Provides

### 1. Your Brand Performance

- **Customer Conversion Rate** - % of visitors who buy
- **Engaged Shopper Rate** - % of viewers who interact
- **New to Brand Rate** - % of first-time customers
- **Branded Searches** - How many people search your brand
- **Detail Page Views** - Product page traffic
- **Add to Carts** - Shopping behavior

### 2. Category Benchmarks (Indirect Competitor Data)

For each metric, you get **3 data points**:

1. **Your Performance** - Your actual number
2. **Category Median** - Average of all brands in category
3. **Category Top Performers** - Top 25% of brands

**Example**:

```
Your Conversion Rate: 11.6%
Category Median: 13.0%
Top Performers: 45.8%
```

This tells you:

- ✅ You're **below average** (11.6% < 13%)
- ⚠️ You could improve by **3.9x** to match top performers

---

## How to Use for Competitive Intelligence

### What You Learn (Indirectly)

1. **Market Positioning**
   - Are you above or below category average?
   - How far from top performers?

2. **Opportunity Gaps**

   ```
   If top performers have 3x better CVR:
   → They have better listings, pricing, or reviews
   → Reverse engineer what they're doing right
   ```

3. **Category Performance**

   ```
   High "Branded Searches" benchmark:
   → Competitors are investing in brand building
   → You should too
   ```

### What You DON'T Learn

❌ **Who** the competitors are  
❌ **What keywords** they rank for  
❌ **Their actual numbers**  

You only see aggregated category data (median/top performers).

---

## For Actual Competitor Keywords

Since Brand Metrics API doesn't show competitor keywords, you need:

### Option 1: Amazon Brand Analytics (Also FREE with Brand Registry!)

**Access**: Seller Central → Brands → Brand Analytics

**Reports Available**:

1. **Amazon Search Terms Report**
   - Top 1 million search terms
   - Top 3 clicked ASINs per term
   - Conversion share

2. **Market Basket Analysis**
   - Products bought together with yours
   - Competitor products customers also buy

3. **Demographics**
   - Age, income, education of buyers
   - Compare to category average

**How to Find Competitor Keywords**:

```
1. Go to Search Terms Report
2. Filter by your category
3. Look at Top 3 Clicked ASINs
4. Find terms where competitors' ASINs appear
5. Note high-volume terms you're NOT ranking for
```

### Option 2: Helium 10 / Jungle Scout

**For specific competitor ASINs**:

- Enter competitor ASIN
- Get all keywords they rank for
- See search volumes
- Get PPC bid estimates

---

## Implementation

### Already Created

✅ `get-brand-metrics.js` - Fetches your brand performance vs category

### To Run

```bash
node get-brand-metrics.js
```

### What It Does

1. Creates Brand Metrics report
2. Polls until ready (~1-5 minutes)
3. Downloads JSON data
4. Analyzes your performance vs category
5. Saves to `brand-metrics-[timestamp].json`

### Sample Output

```
📊 BRAND METRICS ANALYSIS
Date: 2026-01-20
Brand: Luxe Allur
Category: /Sports & Fitness/Supplements

YOUR PERFORMANCE:
  Conversion Rate: 11.63%
  Engaged Shopper Rate: 5%

VS CATEGORY BENCHMARKS:
  Category Median CVR: 13.04%
  Top Performers CVR: 45.77%

⚠️ BELOW CATEGORY AVERAGE (-10.8%)
```

---

## Next Steps

### 1. Get Brand Metrics (Now)

```bash
# Run the script
node get-brand-metrics.js

# Analyze where you stand vs competitors
```

### 2. Get Competitor Keywords (Choose One)

**FREE Option**:

- Use Amazon Brand Analytics Search Terms Report
- Manual analysis of top clicked ASINs

**PAID Option** ($99-399/mo):

- Helium 10 for automated competitor research
- API integration for automation

### 3. Combine the Data

```javascript
// Brand Metrics tells you WHERE you're weak
brandMetrics.conversionRate < categoryMedian
// → Focus on conversion optimization

// Brand Analytics tells you WHAT keywords matter
topSearchTerms.filter(t => 
  t.topASINs.includes(competitorASIN)
)
// → Target those keywords in PPC

// Helium 10 tells you competitor bid strategy
helium10.getKeywordData(competitorASIN)
// → Match or beat their bids
```

---

## Summary

| Data Source | What It Shows | Cost | Competitor Info |
|------------|---------------|------|-----------------|
| **Brand Metrics API** | Your performance vs category benchmarks | FREE | Indirect (benchmarks only) |
| **Brand Analytics** | Top search terms + clicked ASINs | FREE | Top 3 ASINs per term |
| **Helium 10** | Competitor keyword rankings + volumes | $99-399/mo | Direct & detailed |

**Best Approach**: Use all three together!
