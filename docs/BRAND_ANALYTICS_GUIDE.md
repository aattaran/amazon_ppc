# Amazon Brand Analytics - Free Competitor Keyword Research

## Access Brand Analytics

**Requirements**:

- ✅ Brand Registry enrollment (you have this!)
- ✅ Seller Central account

**How to Access**:

1. Go to Seller Central
2. Navigate to: **Brands → Brand Analytics**
3. Available reports:
   - Amazon Search Terms (keyword rankings)
   - Market Basket Analysis (bought together)
   - Demographics
   - Item Comparison

---

## Amazon Search Terms Report (Most Important!)

### What It Shows

For each popular search term:

- **Top 3 clicked ASINs** (products customers click most)
- **Top 3 purchased ASINs** (products customers buy most)
- **Click share** (% of clicks)
- **Conversion share** (% of purchases)
- **Search frequency rank** (popularity ranking)

### How to Find Competitor Keywords

**Step 1: Download the Report**

1. Brand Analytics → Amazon Search Terms
2. Select date range (weekly reports)
3. Download CSV

**Step 2: Filter for Your Category**

```
Search for terms related to your products
Example: "berberine", "supplements", "dhb"
```

**Step 3: Identify Competitor ASINs**
Look at the Top 3 Clicked/Purchased columns:

- If YOUR ASIN appears → You're ranking!
- If COMPETITOR ASIN appears → That's their keyword!

**Example Row**:

```
Search Term: "berberine supplement"
Top Clicked #1: B08ABC1234 (Competitor)
Top Clicked #2: B07XYZ5678 (Your product!)
Top Clicked #3: B09DEF9012 (Competitor)
```

This means:

- ✅ You're ranking #2 for "berberine supplement"
- ⚠️ Competitor B08ABC1234 is beating you
- 💡 Add this to your PPC campaigns!

---

## Automating the Analysis

Since Brand Analytics doesn't have an API, we'll build a manual workflow:

### Step 1: Manual Download

1. Download Search Terms Report (CSV)
2. Save to: `amazon-ppc-platform/data/brand-analytics/`

### Step 2: Automated Analysis (Script)

I'll create a script that:

- Reads the CSV
- Finds competitor ASINs
- Extracts their keywords
- Identifies gaps (keywords you're NOT ranking for)
- Prioritizes by search volume

---

## Script Coming Next

Creating analyzer script to process Brand Analytics data!
