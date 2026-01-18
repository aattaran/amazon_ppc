# Amazon PPC Optimization Platform

Automated Amazon PPC campaign management and optimization system for ELEMNT Super Berberine (ASIN: B0DTDZFMY7). Features conservative budget control, automated bleeder detection, and API-driven optimization workflows.

## 🎯 Overview

This platform was built to solve a critical problem: **Amazon PPC campaigns bleeding money** with ACOS >118% and zero profitability. The solution implements a conservative strategy that:

- ✅ Reduces budgets on underperforming campaigns by 86% (from $37/day → $5/day)
- ✅ Creates 4 new highly-targeted campaigns based on 10,000+ keyword analysis
- ✅ Automates daily bleeder detection and budget optimization
- ✅ Minimizes financial risk with fixed bids and strict budget controls

**Key Results:**

- **Risk reduction**: 72% decrease in worst-case monthly loss (from $3,050 → $850)
- **Budget optimization**: From $145/day proposed → $35/day conservative
- **ROI improvement**: Target ACOS reduced from 118% → 30-50%

---

## 📊 Project Background

### **Problem Analysis**

**Period**: Nov 18, 2025 - Jan 17, 2026

| Metric | Value | Status |
|--------|-------|--------|
| Total Spend | $94.10 | 💸 |
| Total Sales | $79.47 | ❌ |
| Net Loss | -$14.63 | 🔴 |
| Overall ACOS | 118.4% | 🚨 |

**Identified Issues:**

- ❌ Targeting misspelled keywords ("berberberine")
- ❌ Too broad targeting (losing money on irrelevant clicks)
- ❌ Overbidding ($2.68-$3.77 CPC vs recommended $0.70-$1.50)
- ❌ Missing high-volume keywords (product not ranking for 10,000+ relevant searches)

### **Solution Strategy**

**Conservative 3-Pillar Approach:**

1. **Surgical Budget Cuts** - Reduce bleeders to minimal budgets
2. **Precision Targeting** - New campaigns with exact/phrase match only
3. **Fixed Bidding** - Predictable spend, no dynamic bidding surprises

---

## 🚀 Features

### **1. Bulksheet Generation**

- Amazon-template-compliant XLSX generation
- Template inheritance for 100% column compatibility
- Conservative campaign modifications
- Automated budget calculations

### **2. Bleeder Detection Engine**

- Daily ACOS monitoring
- Automated flagging of campaigns >100% ACOS
- Budget reduction recommendations
- Performance reporting

### **3. Keyword Research Integration**

- KW Dominator CSV parsing (10,037 keywords analyzed)
- Search volume analysis
- Competitor ranking intelligence
- Bid recommendation extraction

### **4. Amazon Ads API Integration**

- OAuth 2.0 authentication (LWA)
- Campaign management API
- Reporting API
- Automated token refresh

---

## 📁 Project Structure

```
amazon-ppc-platform/
├── docs/                           # Documentation
│   ├── BULKSHEETS.md              # Bulksheet format guide
│   └── KW Dominator V5.71.csv     # Keyword research data
├── .env.example                    # Environment variables template
├── .env                           # Your credentials (NOT in git)
├── detect-bleeders-daily.js       # Automated bleeder detection
├── generate-conservative-bulksheet.js  # Bulksheet generator
├── get-refresh-token.js           # OAuth token acquisition
├── test-api-access.js             # API connection testing
├── analyze-campaigns.js           # Campaign performance analysis
├── read-bulk.js                   # Bulk operations file parser
└── verify-final.js                # Bulksheet validation
```

---

## ⚙️ Setup

### **Prerequisites**

- Node.js 16+ installed
- Amazon Seller Central account
- Amazon Ads Campaign Manager access
- Amazon Ads API access (request via Ads Console)

### **Installation**

```bash
# Clone repository
git clone https://github.com/aattaran/amazon_ppc.git
cd amazon_ppc

# Install dependencies
npm install

# Copy environment template
copy .env.example .env
```

### **Environment Configuration**

Edit `.env` file:

```bash
# Amazon Ads API Credentials
AMAZON_CLIENT_ID=amzn1.application-oa2-client.XXXXXXXXX
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.XXXXXXXXX
AMAZON_REFRESH_TOKEN=Atzr|XXXXXXXXX  # Get via: node get-refresh-token.js
AMAZON_PROFILE_ID=XXXXXXXXX          # From Campaign Manager URL

# Product Information
PRODUCT_ASIN=B0DTDZFMY7
PRODUCT_NAME=ELEMNT Super Berberine

# Optimization Settings
CRITICAL_ACOS_THRESHOLD=100
TARGET_ACOS=30
```

### **Amazon Ads API Access**

1. **Create LWA Security Profile**: <https://developer.amazon.com/loginwithamazon/console>
2. **Request API Access**: <https://advertising.amazon.com/API/docs/en-us/setting-up/request-access>
3. **Get Refresh Token**:

   ```bash
   node get-refresh-token.js
   ```

4. **Test Connection**:

   ```bash
   node test-api-access.js
   ```

---

## 🔧 Usage

### **Daily Bleeder Detection**

Run every morning to identify losing campaigns:

```bash
node detect-bleeders-daily.js
```

**Output:**

- 🚨 Critical bleeders (ACOS ≥100%)
- ⚠️ Warning campaigns (ACOS 80-99%)
- ✅ Healthy campaigns (ACOS <80%)
- 📥 Auto-generated optimization bulksheet

### **Manual Bulksheet Generation**

```bash
node generate-conservative-bulksheet.js
```

Creates: `CONSERVATIVE-BULKSHEET-AMAZON-FORMAT-YYYYMMDD.xlsx`

Upload to: **Amazon Ads Campaign Manager** → **Bulk Operations** → **Upload**

### **Campaign Analysis**

```bash
node analyze-campaigns.js
```

Analyzes existing campaigns from bulk export file.

---

## 📈 Campaign Strategy

### **Current Campaigns (Modified)**

| Campaign | Old Budget | New Budget | Action | Reason |
|----------|-----------|-----------|--------|--------|
| berberine exact new | $9/day | $2/day | Reduced | ACOS 106.6% |
| berberberine h phrase | $8/day | $3/day | Reduced | ACOS 80.9% |
| berberine auto new 2 | $14/day | $0 | Paused | $14 spend, 0 sales |
| berberine asin new11 | Variable | $0 | Paused | $1.96 spend, 0 sales |
| berberine broad new | Variable | $0 | Paused | $0 spend, 0 sales |

**Total Old Budget**: $37/day → **New**: $5/day (86% reduction)

### **New Campaigns (Created)**

#### **1. DHB Core Exact - Conservative** ($10/day)

**Strategy**: Exact match only, top 5 keywords

```
Keywords:
- dihydroberberine (7,962 SV, bid $0.75)
- dihydroberberine supplement (2,244 SV, bid $0.70)
- glucovantage dihydroberberine (447 SV, bid $0.80)
- dhb supplement (412 SV, bid $0.65)
- dihydroberberine 200mg (195 SV, bid $0.70)
```

#### **2. GlucoVantage Branded - Low Risk** ($8/day)

**Strategy**: Exact + Phrase, branded ingredient

```
Keywords:
- glucovantage (447 SV, exact, bid $0.85)
- glucovantage supplement (phrase, bid $0.70)
- glucovantage dihydroberberine (exact, bid $0.80)
```

#### **3. Formula Unique - Test** ($7/day)

**Strategy**: Phrase match, unique differentiators

```
Keywords:
- berberine lions mane (~100 SV, bid $0.60)
- berberine ceylon cinnamon (phrase, bid $0.55)
- berberine chromium (phrase, bid $0.55)
```

#### **4. Competitor Conquest - Tiny Test** ($5/day)

**Strategy**: Phrase match, competitor brands

```
Keywords:
- double wood berberine (phrase, bid $0.50)
- thorne berberine (phrase, bid $0.50)
```

**Total New Budget**: $30/day  
**Overall Budget**: $35/day (vs. $37/day old campaigns)

---

## 🎯 Key Metrics

### **Budget Allocation**

```
Total Daily Budget: $35/day
Monthly Budget: $1,050/month

Risk Assessment:
- Best case (30% ACOS): Profitable
- Realistic (50% ACOS): Break-even to small profit
- Worst case (80% ACOS): -$850/month loss (vs. -$3,050 aggressive plan)
```

### **Performance Targets**

| Metric | Target | Threshold |
|--------|--------|-----------|
| ACOS | 30% | <80% acceptable |
| ROAS | 3.33 | >1.25 minimum |
| CPC | $0.70-$1.50 | <$2.00 max |
| CTR | >0.5% | Monitor |

---

## 📚 Documentation

Comprehensive documentation available in `/brain/` artifacts:

- **[kw_dominator_analysis.md](C:\Users\AATTARAN\.gemini\antigravity\brain\d7918361-d491-40b8-b848-d8655da864c5\kw_dominator_analysis.md)** - Full 10,000+ keyword analysis
- **[campaign_restructuring_plan.md](C:\Users\AATTARAN\.gemini\antigravity\brain\d7918361-d491-40b8-b848-d8655da864c5\campaign_restructuring_plan.md)** - Conservative strategy details
- **[amazon_api_setup_guide.md](C:\Users\AATTARAN\.gemini\antigravity\brain\d7918361-d491-40b8-b848-d8655da864c5\amazon_api_setup_guide.md)** - Complete API setup instructions
- **[api_permissions_guide.md](C:\Users\AATTARAN\.gemini\antigravity\brain\d7918361-d491-40b8-b848-d8655da864c5\api_permissions_guide.md)** - Partner vs Direct Advertiser comparison
- **[walkthrough.md](C:\Users\AATTARAN\.gemini\antigravity\brain\d7918361-d491-40b8-b848-d8655da864c5\walkthrough.md)** - Complete project walkthrough
- **[session_documentation.md](C:\Users\AATTARAN\.gemini\antigravity\brain\d7918361-d491-40b8-b848-d8655da864c5\session_documentation.md)** - Full session summary

---

## 🔒 Security

**CRITICAL: Never commit `.env` file to version control!**

`.gitignore` excludes:

- ✅ `.env` (API secrets)
- ✅ `node_modules/`
- ✅ `*.xlsx` (bulksheet files)
- ✅ `*.csv` (keyword data)
- ✅ `*.json` (except package.json)

**API Credentials Security:**

- Use environment variables only
- Never share `AMAZON_CLIENT_SECRET` or `AMAZON_REFRESH_TOKEN`
- Rotate tokens if compromised
- Store `.env` in password manager

---

## 🐛 Troubleshooting

### **API Connection Issues**

**Error**: `invalid_scope` or `Unauthorized`

**Solution**: Ensure you've requested **Direct Advertiser** API access (not Partner) and been approved by Amazon.

```bash
# Test your connection
node test-api-access.js
```

### **Bulksheet Upload Errors**

**Error**: "Column mismatch" or "Invalid format"

**Solution**: Use `verify-final.js` to validate structure:

```bash
node verify-final.js
```

### **No Rankings for Keywords**

**Problem**: Product not showing in search results

**Solution**:

1. Update backend search terms in Seller Central
2. Optimize product title with target keywords
3. Allow 24-48 hours for indexing
4. Use PPC to capture traffic while organic ranking builds

---

## 📊 KW Dominator Analysis Highlights

**Dataset**: 10,037 keywords across 10 competitor ASINs

**Top Opportunities:**

1. `dihydroberberine` - 7,962 monthly searches, rank 0 (not indexed!)
2. `glucovantage dihydroberberine` - 447 searches, product differentiator
3. `berberine lions mane` - ~100 searches, ZERO competition

**Critical Finding**: ELEMNT Super Berberine was **NOT RANKING** for ANY of the 10,000+ keywords analyzed, indicating fundamental listing indexing issue.

**Competitor Insight**: Double Wood Supplements (B0CNS2PBHX) dominates core DHB keywords.

---

## 🚀 Roadmap

### **Immediate (Week 1)**

- [ ] Daily bleeder monitoring
- [ ] Search term report analysis (Day 3)
- [ ] First bid optimizations (Day 7)

### **Short Term (Month 1)**

- [ ] Increase review count to 50+
- [ ] Expand winning campaigns
- [ ] A/B test ad copy
- [ ] Implement negative keyword automation

### **Long Term**

- [ ] Machine learning bid optimization
- [ ] Automated budget pacing
- [ ] Multi-ASIN management
- [ ] Reporting dashboard

---

## 📞 Support

**Issues**: <https://github.com/aattaran/amazon_ppc/issues>

**Amazon Ads API Support**: <advertising-api-support@amazon.com>

---

## 📝 License

MIT License - See LICENSE file

---

## 🙏 Acknowledgments

- **KW Dominator** - Keyword research data
- **Amazon Ads API** - Campaign management automation
- **xlsx.js** - Excel file generation

---

**Built with ❤️ for profitable Amazon PPC campaigns**
