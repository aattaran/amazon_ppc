# Placement Analysis Setup Guide

**Status**: ⚠️ Requires Amazon Ads Reporting API Access

---

## What We Learned

The placement fetcher encountered an API limitation. Amazon Ads Reporting API requires:

1. **Approved API access** for asynchronous reporting
2. **Specific report request format**
3. **Polling mechanism** for report completion

---

## Immediate Next Steps

### Option 1: Manual Placement Export (Quickest!)

**Steps**:

1. Go to Amazon Ads Console
2. Navigate to any campaign
3. Click **"Placement" tab**
4. Export the placement data to CSV
5. Upload to Google Sheets manually

**What You'll Get**:

```
Campaign | Placement | Impressions | Clicks | Spend | Sales | ACoS
berberine auto | Top of Search | 5,600 | 89 | $145.30 | $120.00 | 121%
berberine auto | Product Pages | 3,650 | 33 | $48.00 | $30.00 | 160%
berberine auto | Rest of Search | 3,200 | 34 | $52.20 | $35.00 | 149%
```

**Then Apply Chris Rawlings Rules**:

- Top of Search = 121% ACoS ✅ (Winner)
- Product Pages = 160% ACoS ❌ (Loser)

**Action**: Increase Top of Search adjuster +15%, Decrease Product Pages -10%

---

### Option 2: Amazon Advertising API Access Request

**To get full automated access**:

1. **Apply for API Access**:
   - Go to <https://advertising.amazon.com/API/docs/>
   - Request Sponsored Products API access
   - Explain use case: "Automated placement performance analysis"

2. **Wait for Approval** (1-2 weeks typically)

3. **Once Approved**, the `fetch-ppc-placements.js` script will work

---

### Option 3: Use Amazon's Bulk Operations (Intermediate)

**Download placement reports in bulk**:

1. Amazon Ads Console → **Reports** tab
2. Create report:
   - Report type: **Sponsored Products Campaigns**
   - **Segment by**: Placement
   - Date range: Last 30 days
   - Metrics: Impressions, Clicks, Spend, Sales

3. Download CSV

4. Upload to Google Sheets "PPC Placements" tab

---

## What the Script Would Do (When API Access Granted)

```javascript
// Fetch placement-segmented performance
{
    campaignName: "berberine auto",
    placements: {
        topOfSearch: {
            clicks: 89,
            spend: 145.30,
            sales: 120.00,
            acos: 121.08
        },
        productPages: {
            clicks: 33,
            spend: 48.00,
            sales: 30.00,
            acos: 160.00
        },
        restOfSearch: {
            clicks: 34,
            spend: 52.20,
            sales: 35.00,
            acos: 149.14
        }
    },
    recommendation: {
        winner: "topOfSearch",
        action: "Increase Top of Search adjuster by +15%",
        loser: "productPages",
        action2: "Decrease Product Pages adjuster by -10%"
    }
}
```

---

## Alternative: Build Simple Placement Calculator

While waiting for API access, I can create a **Google Sheets formula-based calculator**:

### Input (You paste from Amazon)

```
Campaign | Placement | Clicks | Spend | Sales
```

### Output (Auto-calculated)

```
Campaign | Placement | ACoS | Rank | Recommended Adjustment
berberine auto | Top of Search | 121% | 1 (Winner) | +15% adjuster
berberine auto | Product Pages | 160% | 3 (Loser) | -10% adjuster
```

---

## Current Working Scripts

**What Works Now**:

1. ✅ `fetch-ppc-quick.js` - Campaign structure + pagination
2. ✅ `test-ppc-sync.js` - Idempotency testing
3. ⚠️ `fetch-ppc-placements.js` - Needs API access

**What Needs API Access**:

- Placement segmentation
- Search term reports
- Keyword-level performance

---

## Recommended Workflow (Today)

**Until API access is granted**:

1. **Manual Export** placement data from Amazon Ads Console
2. **Paste into Google Sheets**
3. **Use Chris Rawlings rules** manually:
   - Sort by ACoS (ascending)
   - Winner = Top placement
   - Increase winner adjuster +15%
   - Decrease loser adjuster -10%

4. **Track results** over 1 week
5. **Repeat weekly**

---

## Next Steps

**Choose one**:

### A) Quick Win (Manual - Today)

- Export 1 campaign's placement data
- Apply +15%/-10% rule
- Monitor for 1 week
- Measure ACoS improvement

### B) API Access (Automated - 2 weeks)

- Request Amazon Ads API access
- Wait for approval
- Run `fetch-ppc-placements.js`

### C) Google Sheets Calculator (Hybrid - This Week)

- I build a formula-based placement analyzer
- You paste Amazon data weekly
- Sheet auto-calculates recommendations

**Which would you prefer?**
