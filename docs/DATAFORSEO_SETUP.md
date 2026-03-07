# DataForSEO API Setup

## Account Info

**Dashboard**: <https://app.dataforseo.com/>  
**User**: <ali@mcro.ai>  
**Balance**: $1.00  
**Status**: Active (~9999 days)

## API Credentials Location

Credentials stored securely in: `.credentials/dataforseo.txt`

**⚠️ IMPORTANT**: This directory is gitignored - credentials will NOT be committed to GitHub.

## What is DataForSEO?

DataForSEO provides SEO data including:

- 🔍 SERP (Search Engine Results) data
- 📊 Keyword research & search volumes
- 🏆 Competitor rankings
- 📈 Backlink data
- 💰 CPC/PPC data

## Use Cases for PPC

### 1. Competitor Keyword Research

Get keywords your competitors rank for:

```bash
POST /v3/serp/google/organic/live
```

### 2. Search Volume Data

Get monthly search volumes:

```bash
POST /v3/keywords_data/google_ads/search_volume/live
```

### 3. Keyword Difficulty

Find easy-to-rank keywords:

```bash
POST /v3/keywords_data/google_ads/keywords_for_keywords/live
```

### 4. CPC Data

Get cost-per-click estimates:

```bash
POST /v3/keywords_data/google_ads/ad_traffic_by_keywords/live
```

## Quick Start

### Node.js Example

```javascript
const axios = require('axios');

const dataForSEO = axios.create({
  baseURL: 'https://api.dataforseo.com/v3',
  auth: {
    username: process.env.DATAFORSEO_USERNAME,  // Set in .env
    password: process.env.DATAFORSEO_PASSWORD   // Set in .env
  }
});

// Get SERP results for keyword
async function getCompetitors(keyword) {
  const response = await dataForSEO.post('/serp/google/organic/live', [{
    keyword: keyword,
    location_code: 2840 // USA
  }]);
  
  return response.data;
}

// Get search volume
async function getSearchVolume(keywords) {
  const response = await dataForSEO.post('/keywords_data/google_ads/search_volume/live', [{
    keywords: keywords,
    location_code: 2840
  }]);
  
  return response.data;
}
```

## Pricing

DataForSEO uses a **credit system**:

- SERP data: ~$0.003-0.02 per keyword
- Search volume: ~$0.001 per keyword
- Backlinks: ~$0.01-0.05 per domain

**Your $1 balance** = ~50-1000 API calls depending on endpoint

## Integration with PPC Platform

### Recommended Workflow

1. **Use Brand Analytics** (FREE) for initial keyword discovery
2. **Use DataForSEO** to:
   - Get search volumes for those keywords
   - Find related keywords
   - Check competitor rankings
   - Get CPC estimates

3. **Import to Amazon PPC** via Amazon Ads API

### Example: Complete Keyword Research Pipeline

```javascript
// 1. Analyze Brand Analytics report
const brandKeywords = analyzeBrandAnalytics('data/brand-analytics/search-terms.csv');

// 2. Get search volumes from DataForSEO
const keywordsWithVolume = await getSearchVolume(brandKeywords);

// 3. Get related keywords
const relatedKeywords = await getRelatedKeywords(topKeywords);

// 4. Add to Amazon PPC campaigns
for (const keyword of highVolumeKeywords) {
  await amazonAds.createKeyword({
    adGroupId: 'your-ad-group',
    keyword: keyword.text,
    bid: keyword.cpc * 0.8 // Start at 80% of recommended CPC
  });
}
```

## API Documentation

**Official Docs**: <https://docs.dataforseo.com/>  
**Postman Examples**: <https://app.dataforseo.com/api-dashboard>  
**Pricing**: <https://dataforseo.com/pricing>

## Screenshot

![DataForSEO Dashboard](../uploaded_image_1769297452639.png)

Shows:

- $1.00 balance
- API access enabled
- 9999 days remaining

## Next Steps

1. ✅ Credentials saved securely
2. 📝 Create DataForSEO integration script
3. 🔗 Combine with Brand Analytics data
4. 🚀 Automate keyword research pipeline

---

**Remember**: DataForSEO complements Amazon Brand Analytics (which is FREE). Use Brand Analytics first, then DataForSEO for deeper research.
