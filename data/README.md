# Week 1 Data Foundation - README

## What We Built

✅ **Directory Structure:**

```
data/
├── business-reports/  ← Put Business Report CSV here
├── ads-reports/       ← Put Ads Report CSV here
├── products/          ← products.json
└── processed/         ← Output files

src/
├── data/
│   ├── csv-parser.js
│   └── metrics-calculator.js
└── analysis/
    └── smart-segmenter.js
```

✅ **Modules:**

- `csv-parser.js` - Parses Amazon CSV reports
- `metrics-calculator.js` - Calculates Ad Dependency %, TACoS %, CVR
- `smart-segmenter.js` - Heist methodology (5 segments)

✅ **Scripts:**

- `calculate-metrics.js` - Run first
- `segment-products.js` - Run second

---

## How to Use

### **Step 1: Install Dependencies**

```bash
npm install csv-parser
```

### **Step 2: Edit products.json**

Edit `data/products/products.json` with your ASINs:

```json
[
  {
    "asin": "B0DTDZFMY7",
    "name": "Your Product Name",
    "launchDate": "2024-11-15",
    "category": "Health & Household",
    "tier": "Premium",
    "notes": "Optional notes"
  }
]
```

**CRITICAL:** Get the launch date right! This determines if it's in the "Honeymoon Phase" (0-60 days).

### **Step 3: Download Reports from Amazon**

**Business Report:**

1. Go to: Seller Central → Reports → Business Reports → Detail Page Sales and Traffic
2. Date Range: Last 90 days
3. Download → Save as: `data/business-reports/business-report-2026-01-25.csv`

**Ads Report:**

1. Go to: Advertising Console → Reports → Advertised Product Report
2. Date Range: Last 90 days
3. Download → Save as: `data/ads-reports/ads-report-2026-01-25.csv`

### **Step 4: Run Calculator**

```bash
node calculate-metrics.js
```

**Output:** `data/processed/product-metrics.json`

**What it shows:**

- Total Sales, Ad Sales, Organic Sales
- Ad Dependency % (should be <40%)
- TACoS % (should be <5% for mature products)
- CVR %

### **Step 5: Run Segmenter**

```bash
node segment-products.js
```

**Output:** `data/processed/product-segments.json`

**What it shows:**

- 🚀 LAUNCH (0-60 days) - 2x budget
- 🏆 CASH COW (healthy) - 1.2x budget
- ⚠️ AD-DEPENDENT (>50% ad sales) - 0.5x budget
- 💸 HIGH TACOS (>8%) - 0.7x budget
- ✅ MAINTAIN - 1.0x budget

---

## Understanding the Output

### **Example Output:**

```
🏆 CASH COW - Dihydroberberine (B0DTDZFMY7)
  Priority: 2 | Budget Multiplier: 1.2x
  Days Live: 71 | Total Sales: $5,430.50
  Ad Dep: 35.2% | TACoS: 4.3%
  Strategy:
    - Healthy: TACoS 4.3%, Ad Dep 35%
    - Maintain current strategy
    - Defend against competitors
    - Efficiency optimization only
```

**Translation:**

- **Cash Cow** = Healthy product
- **Ad Dep 35%** = 35% of sales from ads (< 40% = good)
- **TACoS 4.3%** = Ad spend is 4.3% of revenue (< 5% = profitable)
- **Budget Multiplier 1.2x** = Give this 20% more budget than average

---

## Troubleshooting

**Error: "No .csv files found"**

- Download reports from Amazon and put in correct folders

**Error: "Cannot find module 'csv-parser'"**

- Run: `npm install csv-parser`

**Error: "ENOENT: no such file or directory, open 'data/products/products.json'"**

- Create products.json with your ASINs

**Metrics look wrong:**

- Check that CSV column names match (Amazon sometimes changes them)
- Verify date ranges are the same for both reports
- Make sure launch dates are correct in products.json

---

## Next Steps (Week 2)

Once segmentation is working:

1. Push segments to Google Sheets (use existing sync service)
2. Set up Shopify + Meta Pixel
3. Create Custom Audiences
4. Request Amazon Attribution access

---

## Quick Start Checklist

- [ ] Run: `npm install csv-parser`
- [ ] Edit: `data/products/products.json` (add 3-5 ASINs)
- [ ] Download Business Report → `data/business-reports/`
- [ ] Download Ads Report → `data/ads-reports/`
- [ ] Run: `node calculate-metrics.js`
- [ ] Run: `node segment-products.js`
- [ ] Review: `data/processed/product-segments.json`
- [ ] Validate: Do segments make sense?

**If all checks pass, Week 1 is complete!** ✅
