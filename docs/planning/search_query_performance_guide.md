# Search Query Performance Analyzer - Setup Guide

**Feature**: Chris Rawlings "Sales Stealing" Strategy  
**API**: Amazon Selling Partner API (SP-API)  
**Report**: Brand Analytics Search Query Performance  
**Status**: Ready for credentials

---

## What It Does

### **The "Sales Stealing" Opportunity**

**Problem**: You're converting better than competitors but getting fewer clicks.

**Strategy**: Find keywords where:

1. **High volume** (>1,000 searches/month)
2. **Winning conversion** (Your CVR > Market CVR)
3. **Losing clicks** (Your CTR < Market CTR)

**Action**: Optimize main image & title to "steal" those clicks.

---

## Example: Real Scenario

### **Keyword: "berberine supplement"**

**Current Performance**:

```
Search Volume: 45,000 searches/month

Your Performance:
  - Impressions: 12,000
  - Clicks: 360 (CTR: 3.0%)
  - Purchases: 54 (CVR: 15.0%)
  
Market Average:
  - Total Clicks: 2,250 (CTR: 5.0%)
  - Total Purchases: 157 (CVR: 7.0%)
```

**Analysis**:

- ✅ Your CVR (15.0%) > Market CVR (7.0%) → You convert 2x better!
- ❌ Your CTR (3.0%) < Market CTR (5.0%) → You're losing 40% of clicks

**The Steal**:

```
If your CTR matched market:
  Expected clicks: 600 (instead of 360)
  Expected purchases: 90 (instead of 54)
  
HIDDEN OPPORTUNITY: +36 sales/month (+67% increase)
```

**Action**:

```
1. Update main image:
   - Show benefit customers search for
   - Mirror top competitor's image style
   
2. Update title:
   - Add "berberine supplement" in first 80 chars
   - Include key benefit visible in images
   
Expected result: CTR increases from 3% → 5%
```

---

## Setup Requirements

### **1. Amazon Brand Registry**

**Required**: Your brand must be enrolled in Amazon Brand Registry

**Why**: Brand Analytics is only available to registered brands

**Check**:

```
Go to: Seller Central → Brands → Brand Registry
Confirm: Your brand shows "Active" status
```

---

### **2. SP-API Credentials**

**Step 1: Create SP-API Application**

1. Go to: <https://sellercentral.amazon.com/apps/manage>
2. Click **"Add new app client"**
3. Fill in:
   - App name: "Titan Search Query Analyzer"
   - OAuth Redirect URI: `http://localhost:3000`
4. Click **"Create"**
5. Copy:
   - LWA Client ID
   - LWA Client Secret

**Step 2: Get Refresh Token**

1. Replace `YOUR_CLIENT_ID` in this URL:

   ```
   https://sellercentral.amazon.com/apps/authorize/consent?application_id=YOUR_CLIENT_ID&state=state123&version=beta
   ```

2. Visit the URL in browser
3. Click **"Allow access"**
4. Copy the `spapi_oauth_code` from the redirect
5. Exchange for refresh token:

   ```bash
   curl -X POST https://api.amazon.com/auth/o2/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code" \
     -d "code=YOUR_SPAPI_OAUTH_CODE" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET"
   ```

6. Copy the `refresh_token` from response

**Step 3: Update `.env`**

```bash
SP_API_CLIENT_ID=amzn1.application-oa2-client.xxxxx
SP_API_CLIENT_SECRET=amzn1.oa2-cs.v1.xxxxx
SP_API_REFRESH_TOKEN=Atzr|IwEBIxxxxx
```

---

## Running the Analyzer

### **Command**

```bash
node fetch-sqp-report.js
```

### **What Happens**

```
1. 🔑 Authenticating with SP-API
2. 📊 Requesting Brand Analytics report (last month)
3. ⏳ Polling for completion (30-120 seconds)
4. 📥 Downloading report data
5. 🔍 Analyzing for hidden gems
6. 📋 Printing results
```

---

## Expected Output

### **Sample Results**

```
╔════════════════════════════════════════════════════════════════╗
║  🎯 HIDDEN GEMS - SALES STEALING OPPORTUNITIES                 ║
║  Chris Rawlings Strategy: Fix Image/Title to Steal Clicks     ║
╚════════════════════════════════════════════════════════════════╝

Found 8 opportunities:

═══════════════════════════════════════════════════════════════

1. 💎 BERBERINE SUPPLEMENT
   Volume: 45,000 searches/month
   CTR: Mine 3.0% vs Market 5.0% (40.0% gap)
   CVR: Mine 15.0% vs Market 7.0% (+114.3% advantage)
   Current Sales: 54/month
   Potential: +36 sales/month if CTR matches market
   → ACTION: Optimize main image & title for "berberine supplement"

2. 💎 BERBERINE 1200MG
   Volume: 18,500 searches/month
   CTR: Mine 2.5% vs Market 4.8% (47.9% gap)
   CVR: Mine 18.2% vs Market 8.5% (+114.1% advantage)
   Current Sales: 22/month
   Potential: +19 sales/month if CTR matches market
   → ACTION: Optimize main image & title for "berberine 1200mg"

... (6 more)

═══════════════════════════════════════════════════════════════

📝 Recommended Actions (Priority Order):

1. "berberine supplement"
   - Update main image to highlight benefit shown in competitor listings
   - Add "berberine supplement" prominently in title (first 80 chars)
   - Expected uplift: +36 sales/month

2. "berberine 1200mg"
   - Update main image to highlight benefit shown in competitor listings
   - Add "berberine 1200mg" prominently in title (first 80 chars)
   - Expected uplift: +19 sales/month

... (3 more)

═══════════════════════════════════════════════════════════════

💰 TOTAL OPPORTUNITY:

   Current monthly sales on these terms: 142
   Potential additional sales: +89
   Total uplift potential: 62.7% increase
```

---

## Action Workflow

### **Step 1: Identify Top Opportunity**

From the output, pick the keyword with highest potential sales.

**Example**: "berberine supplement" (+36 sales/month)

---

### **Step 2: Competitive Research**

1. Go to Amazon.com
2. Search for the keyword ("berberine supplement")
3. Study the top 3 listings:
   - What's in their main image?
   - What benefits do they highlight?
   - What's in their title first 80 chars?

**Example findings**:

```
Top 3 listings show:
  - Main image: Capsule bottle with "1200mg" badge
  - Title starts with: "Berberine Supplement 1200mg..."
  - Key benefit: "Blood Sugar Support"
```

---

### **Step 3: Update Your Listing**

**Main Image**:

```
Before: Generic bottle photo
After: Bottle + "1200mg" badge + "Blood Sugar Support" text
```

**Title**:

```
Before: Berberine HCL Complex | Premium Quality | 120 Capsules
After: Berberine Supplement 1200mg - Blood Sugar Support | 120 Capsule Complex
```

**Why This Works**:

- Your CVR is already 15% (market is 7%)
- You just need more clicks
- Match the visual/title pattern of top performers
- Your superior conversion rate will turn those clicks into sales

---

### **Step 4: Monitor Results**

**Week 1-2**: Run report again

```bash
node fetch-sqp-report.js
```

**Expected change**:

```
"berberine supplement"
  Before: CTR 3.0%, 54 sales/month
  After:  CTR 4.5%, 81 sales/month (+50% increase)
```

---

## The Mathematics Behind It

### **Formula**

```javascript
Potential Sales = Search Volume × (Market CTR - My CTR) × My CVR
```

**Example**:

```
Search Volume: 45,000
Market CTR: 5.0% (0.05)
My CTR: 3.0% (0.03)
My CVR: 15.0% (0.15)

Potential = 45,000 × (0.05 - 0.03) × 0.15
          = 45,000 × 0.02 × 0.15
          = 135 additional sales/month

Current sales: 54
Potential sales: 189
Uplift: +250%
```

---

## Troubleshooting

### **Error: "Not Found" (404)**

**Cause**: SP-API application not approved or incorrect credentials

**Fix**:

1. Verify credentials in `.env`
2. Ensure app is approved in Seller Central
3. Check that refresh token hasn't expired (90 days)

---

### **Error: "Unauthorized" (401)**

**Cause**: Invalid access token or expired refresh token

**Fix**:

1. Get new refresh token (see setup step 2)
2. Update `.env` with new token
3. Re-run script

---

### **Error: "Brand Analytics access required"**

**Cause**: Brand not enrolled in Brand Registry

**Fix**:

1. Enroll in Amazon Brand Registry
2. Wait for approval (1-2 weeks)
3. Then run script

---

### **No Hidden Gems Found**

**Cause**: Your CTR is already optimal!

**This is good news**: You're capturing clicks efficiently.

**Alternative strategies**:

1. Focus on other keywords (lower in report)
2. Run PPC campaigns on these terms to increase impressions
3. Look for new keyword opportunities in search term reports

---

## Chris Rawlings Strategy Summary

### **The Insight**

Most sellers focus on:

- Conversion rate optimization (CRO)
- Lowering ACOS
- Finding new keywords

**Chris Rawlings says**: If your CVR is already high, the biggest opportunity is **capturing more clicks on existing winners**.

### **Why It Works**

**Traditional thinking**:

```
"My product has 10% CVR. I need to improve listing to get to 15%."
Result: Small incremental gain
```

**Sales Stealing thinking**:

```
"My product has 15% CVR (market is 7%). I just need 2x more clicks."
Result: 2x sales increase with no conversion changes
```

### **The ROI**

**Timeline**: 1-2 weeks per keyword
**Cost**: $0 (just image/title updates)
**Expected lift**: 30-100% sales increase on optimized keywords

**Example**:

```
Month 1: Fix top 3 keywords → +65 sales/month
Month 2: Fix next 3 keywords → +42 sales/month
Month 3: Fix next 2 keywords → +28 sales/month

Total: +135 sales/month over 3 months
```

---

## Integration with Titan Platform

### **Workflow**

**Monthly Routine**:

```
1. Monday Week 1: Run search query analyzer
   bash: node fetch-sqp-report.js

2. Tuesday Week 1: Update top 3 listings (images/titles)

3. Monday Week 2: Run PPC optimizer
   bash: node optimize-bids.js
   
4. Apply: Create PPC campaigns for "hidden gem" keywords
   
5. Monitor: Check CTR improvements in Brand Analytics
```

**Synergy with PPC**:

```
Hidden Gem Found: "berberine supplement"
  - Organic CTR: 3% → 5% (image/title fix)
  - PPC Campaign: Launch with $50/day budget
  - Combined CTR: Watch it climb to 7-8%
  - Result: Organic rank improves, PPC costs drop
```

---

## Next Steps

### **Today (Setup)**

1. ✅ Script created: `fetch-sqp-report.js`
2. ⚠️ Get SP-API credentials (15 min)
3. ⚠️ Update `.env` file

### **This Week (First Run)**

1. Run analyzer
2. Identify top 3 hidden gems
3. Research competitor images/titles
4. Update your listings

### **Next Month (Results)**

1. Re-run analyzer
2. Measure CTR improvements
3. Calculate sales lift
4. Repeat for next batch

---

**Expected ROI**: 30-100% sales increase on optimized keywords with $0 cost! 🚀
