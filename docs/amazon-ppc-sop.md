# Amazon PPC Standard Operating Procedure (SOP)

> Sourced from r/FulfillmentByAmazon, r/AmazonFBA, r/PPC, r/Entrepreneur — March 2026

---

## 1. Guiding Principles

- **PPC is a ranking tool, not just a sales tool.** The end goal is organic rank, not profitable ads.
- **Track TACOS, not just ACOS.** Total ACOS (ad spend / total revenue including organic) is the true health metric.
- **Amazon PPC is a robot — train it slowly.** The algorithm needs data before it can optimize. Do not make changes in the first 7 days.
- **Never mix scaling and optimizing.** Run dedicated phases for each.
- **1 product per ad group, always.** Name each ad group with the ASIN for easy reporting.

---

## 2. Before You Launch

### 2.1 Listing Optimization (Required Before Any PPC)
- [ ] Title includes top 2–3 primary keywords
- [ ] Bullet points cover features + secondary keywords
- [ ] Backend search terms fully populated (no duplicates)
- [ ] High-quality images (main + lifestyle + infographic)
- [ ] Minimum 15 reviews before scaling spend
- [ ] Price competitive vs. top 3 competitors

### 2.2 Know Your Numbers
- Calculate target ACOS from your margin before launch:
  ```
  Target ACOS = (Price - COGS - FBA fees - Storage fees) / Price
  ```
- Calculate break-even ACOS (point where you neither profit nor lose)
- Factor in long-term storage fees and oversized surcharges

### 2.3 Keyword Research
- Use Helium10 or DataForSEO to build a list of 30–50 target keywords
- Classify keywords by intent:
  - **Exact intent** (e.g. "stainless steel travel mug 20oz") — high CVR, start here
  - **Category** (e.g. "travel mug") — broad, good for discovery
  - **Competitor brand** (e.g. "Yeti mug") — high spend, use cautiously
- Start with long-tail keywords: low volume, low CPC, high buyer intent. Rank here first, then move up to broader terms.

---

## 3. Campaign Structure

### 3.1 Required Campaign Types

| Campaign | Match Type | Purpose |
|---|---|---|
| Auto — Discovery | Auto | Harvest new converting search terms |
| Ranking Campaign | Exact | Aggressive bids on top 5–10 target KWs for rank |
| Single Keyword Campaigns (SKC) | Exact | One proven keyword per campaign for precise control |
| Phrase/Broad | Phrase + Broad | Mid-funnel discovery, cheaper CPC |
| Product Targeting (PT) | ASIN | Target competitor listings |
| Defensive Brand | Exact | Bid on your own brand name |

### 3.2 Rules
- **Never mix Exact, Phrase, and Broad in the same ad group** — you cannot bid-optimize per match type
- **1 product per ad group** — enables product-level ACOS analysis
- Add each exact keyword as a **negative exact** in Auto and Broad campaigns to prevent internal cannibalization
- **Do not move a winning keyword** to a new campaign. Leave it in place and move all other keywords out. A keyword may not perform the same in a new campaign due to history/data loss.
- If a keyword is underperforming: archive it and restart in a fresh campaign (clears bad history)

---

## 4. Launch Phase (Weeks 1–4)

### 4.1 Week 1 Setup
1. Launch **Auto campaign** at $0.50–$0.75 CPC, moderate daily budget ($20–$50)
2. Launch **Exact match campaign** with your top 20–30 target keywords at competitive bids
3. Launch **Phrase campaign** with the same keyword list
4. Set **Top of Search (TOS) placement modifier** to 50–100% on ranking campaigns
5. Do NOT touch campaigns for 7 days

### 4.2 Week 2–4 Actions
- Pull **Search Term Report** weekly
- Identify winners: clicks + sales + acceptable ACOS → promote to SKC (Single Keyword Campaign)
- Identify bleeders: spend + no sales → add as **negative exact** immediately
- Do NOT optimize bids yet — this is the scaling phase

### 4.3 Launch Budget Guidance
- Expect to operate at or above break-even ACOS during launch — this is normal
- PPC losses at launch = investment in organic rank
- Sales velocity → keyword ranking → organic sales is the full cycle. It takes 4–12 weeks.

---

## 5. Optimization Phase

> Run this phase after you have at least 2–4 weeks of data. Do not mix with scaling.

### 5.1 Bid Optimization Rules

| Situation | Action |
|---|---|
| High ACOS, few sales | Lower bid 10–20% |
| Low ACOS, good sales | Increase budget; consider isolating into SKC |
| No impressions | Raise bid |
| Impressions, no clicks | Review keyword relevance; check listing main image |
| Clicks, no sales | Fix listing (images, price, reviews, copy) |
| High spend, 0 sales after 2 weeks | Pause keyword; add as negative |

### 5.2 Negative Keywords
- Add negatives **weekly** from Search Term Report
- Categories to negate:
  - Irrelevant product types
  - Competitor brand names (unless intentional)
  - Keywords with 10+ clicks and 0 sales
- In exact campaigns, add your target keyword as negative in all auto/phrase/broad campaigns

### 5.3 Placement Reports
- Check **Top of Search vs. Rest of Search vs. Product Pages** performance separately
- A keyword that looks dead overall may be converting well on product pages — don't pause it blindly
- Adjust placement modifiers accordingly (not just base bids)

### 5.4 Dayparting
- Review hourly sales data to identify peak buying hours
- Reduce bids during overnight hours (typically 12am–6am) to prevent wasted spend
- Tools: Xnurta, Perpetua, or manual scheduled rules in Seller Central

---

## 6. Scaling Phase

> Run this phase when TACOS is healthy and you have proven keywords. Do not mix with optimization.

### 6.1 Scaling Checklist
- [ ] Increase budgets on profitable campaigns first (Pareto: 80% of results from 20% of campaigns)
- [ ] Test new keyword variants (long-tail → mid-tail → head terms)
- [ ] Launch competitor ASIN targeting (Product Targeting campaigns)
- [ ] Add catch-all Auto campaign at low CPC to continuously harvest new terms
- [ ] Defensive brand campaign live and spending
- [ ] Test external traffic: TikTok, Instagram, Facebook → Amazon listing (boosts organic rank signal)
- [ ] Amazon Vine program enrolled if under 30 reviews

### 6.2 Budget Allocation at Scale
- 50%+ of total budget → proven SKC campaigns (known converters)
- 25% → discovery (Auto + Broad + new Phrase campaigns)
- 15% → competitor ASIN targeting
- 10% → defensive brand campaigns

---

## 7. Ongoing Maintenance (Weekly)

| Task | Frequency |
|---|---|
| Pull Search Term Report, add negatives | Weekly |
| Review campaign ACOS vs. target | Weekly |
| Adjust bids on top 20 keywords | Weekly |
| Check budget utilization (campaigns hitting limit?) | Weekly |
| Review placement performance (TOS vs. product pages) | Weekly |
| Check organic rank for top 5 keywords | Weekly |
| Review TACOS trend | Weekly |

### 7.1 TACOS Benchmarks
| Stage | Expected TACOS |
|---|---|
| Launch (Month 1–2) | 25–40% |
| Growth (Month 3–6) | 15–25% |
| Mature (6+ months) | 8–15% |

---

## 8. Common Mistakes to Avoid

1. **Changing bids every 1–2 days** — disrupts the algorithm, need 7+ days of data per change
2. **Mixing Exact/Phrase/Broad in one ad group** — impossible to bid-optimize per match type
3. **Optimizing and scaling simultaneously** — muddies data, run them in separate phases
4. **Pausing high-ACOS keywords driving organic rank** — check if organic sales increased alongside PPC spend; often worth it
5. **Setting budgets too low** — campaigns run out by noon, losing afternoon/evening peak hours
6. **Ignoring TACOS** — focusing only on ACOS misses the organic lift that PPC is building
7. **Not factoring FBA fees into margin** — leads to false sense of profitability
8. **Moving winning keywords to new campaigns** — they often don't perform the same; move the losers instead

---

## 9. Funnel Diagnostic

When sales stall, diagnose which part of the funnel is broken:

```
Search → Impression → Click → Listing View → Add to Cart → Purchase
```

| Symptom | Likely Cause | Fix |
|---|---|---|
| No impressions | Bid too low or keyword irrelevant | Raise bid or swap keyword |
| Impressions, no clicks | Bad main image or title | Improve main image, title |
| Clicks, no sales | Bad listing, price, or reviews | Fix listing, price, get reviews |
| Good ACOS but no organic rank | Not enough sales velocity | Increase budget, drive more volume |
| Good PPC but declining organic | Competitor outranking | Increase TOS modifier, external traffic |

---

## 10. Key Metrics Reference

| Metric | Definition | Healthy Range |
|---|---|---|
| ACOS | Ad Spend / Ad Revenue | At or below break-even during launch; 20–35% at scale |
| TACOS | Ad Spend / Total Revenue | 8–20% depending on stage |
| CVR | Orders / Clicks | 10–20%+ (category-dependent) |
| CTR | Clicks / Impressions | 0.3–0.5%+ |
| CPC | Cost per Click | Varies; track vs. keyword bid |
| ROAS | Revenue / Ad Spend | Inverse of ACOS; track alongside margin |

---

*Last updated: March 2026 | Source: r/FulfillmentByAmazon, r/AmazonFBA, r/PPC community insights*
