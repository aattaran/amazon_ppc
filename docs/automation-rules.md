# Amazon PPC SOP — Automation Rules

> Every rule from the SOP expressed as a conditional math expression.
> Thresholds reference `.env` defaults: TARGET_ACOS=30%, BREAK_EVEN_ACOS=45%, MIN_CLICKS_BEFORE_NEGATING=10.

---

## Section 2 — Pre-Launch Readiness

| ID | Rule | Condition | Action | Priority | Auto? |
|----|------|-----------|--------|----------|-------|
| R01 | Minimum reviews gate | `reviews < 15` | BLOCK scaling. Enroll in Vine until reviews >= 15 | Critical | No |
| R02 | Target ACOS formula | `targetAcos = (price - COGS - FBA_fees - storage) / price` | Compute and set TARGET_ACOS before launching any campaign | Critical | No |
| R03 | Keyword list minimum | `keywordCount < 30` | WARN: Need 30-50 keywords. Use Helium10 or DataForSEO | High | No |

---

## Section 3 — Campaign Structure

| ID | Rule | Condition | Action | Priority | Auto? |
|----|------|-----------|--------|----------|-------|
| R37 | Single match type per ad group | `countDistinct(adGroup.matchTypes) > 1` | VIOLATION: Split into separate ad groups per match type | Critical | Yes |
| R38 | Single product per ad group | `countDistinct(adGroup.products) > 1` | VIOLATION: Split into separate ad groups per product | Critical | Yes |
| R39 | Never move winning keywords | `keyword.isWinner AND keyword.isBeingMoved` | BLOCK: Move the losers out instead. Winners lose history in new campaigns | High | No |
| R18 | Cross-campaign negative isolation | `keyword.matchType == EXACT AND keyword.campaign == exactCampaign` | Add as NEGATIVE EXACT in all Auto, Phrase, and Broad campaigns | High | Yes |

---

## Section 4 — Launch Phase (Weeks 1-4)

| ID | Rule | Condition | Action | Priority | Auto? |
|----|------|-----------|--------|----------|-------|
| R04 | No-touch window | `daysSinceLaunch < 7` | BLOCK all bid/budget changes for 7 days | Critical | Yes |
| R05 | Auto campaign initial CPC | `campaign.type == AUTO AND phase == launch` | Set CPC = $0.50-$0.75, daily budget = $20-$50 | Medium | No |
| R06 | TOS modifier on ranking campaigns | `campaign.type == RANKING AND phase == launch` | Set Top of Search modifier = 50-100% | High | Yes |
| R07 | High ACOS normal during launch | `phase == launch AND acos > breakEvenAcos` | NO ACTION — this is rank investment, do NOT reduce bids | Medium | Yes |

---

## Section 5.1 — Bid Optimization Decision Tree

| ID | Rule | Condition | Action | Priority | Auto? |
|----|------|-----------|--------|----------|-------|
| R08 | No impressions | `impressions == 0` | Raise bid 25%. `newBid = currentBid * 1.25` | High | Yes |
| R09 | Impressions, no clicks | `impressions >= 100 AND clicks == 0` | DO NOT adjust bid. Review main image and title — creative problem | High | No |
| R10 | Clicks, no sales — negate | `clicks >= 10 AND orders == 0` | Add as NEGATIVE EXACT. Pause keyword | Critical | Yes |
| R11 | Clicks, no sales — wait | `clicks > 0 AND clicks < 10 AND orders == 0` | WAIT — need 10 clicks minimum before negating | Low | Yes |
| R12 | ACOS above break-even | `acos > 45%` | Lower bid 15%. `newBid = currentBid * 0.85` | Critical | Yes |
| R13 | ACOS between target and break-even | `30% < acos <= 45%` | Lower bid 7.5% (gentle). `newBid = currentBid * 0.925` | High | Yes |
| R14 | Low ACOS, strong performer | `acos <= 30% AND orders >= 3` | Isolate to SKC campaign. Increase budget | High | No |
| R15 | Low ACOS, scaling | `acos <= 30% AND orders < 3` | Raise bid 20%. `newBid = currentBid * 1.20` | Medium | Yes |

### Decision Tree Summary

```
keyword
├── impressions == 0?
│   └── YES → R08: raise bid 25%
├── clicks == 0?
│   ├── impressions >= 100 → R09: review image/title
│   └── impressions < 100 → needs more data
├── orders == 0?
│   ├── clicks >= 10 → R10: NEGATE
│   └── clicks < 10 → R11: WAIT
└── has sales → evaluate ACOS
    ├── acos > 45% → R12: lower bid 15%
    ├── 30% < acos <= 45% → R13: lower bid 7.5%
    ├── acos <= 30% AND orders >= 3 → R14: isolate to SKC
    └── acos <= 30% AND orders < 3 → R15: raise bid 20%
```

---

## Section 5.2 — Negative Keywords

| ID | Rule | Condition | Action | Priority | Auto? |
|----|------|-----------|--------|----------|-------|
| R16 | High clicks, zero sales | `clicks >= 10 AND orders == 0` | Add as NEGATIVE EXACT in source campaign | Critical | Yes |
| R17 | ACOS above break-even | `searchTerm.acos > 45%` | Add search term as NEGATIVE EXACT — losing money | Critical | Yes |

---

## Section 5.3 — Placement Optimization

| ID | Rule | Condition | Action | Priority | Auto? |
|----|------|-----------|--------|----------|-------|
| R19 | TOS outperforming | `tos.acos < rest.acos AND tos.conversions > 0` | Increase TOS modifier (up to 100%) | Medium | No |
| R20 | Product pages converting | `productPages.orders > 0 AND overall.acos > targetAcos` | DO NOT pause keyword. Adjust placement modifiers, not base bid | High | No |

---

## Section 5.4 — Dayparting

| ID | Rule | Condition | Action | Priority | Auto? |
|----|------|-----------|--------|----------|-------|
| R21 | Overnight bid reduction | `hour >= 0 AND hour < 6` | Reduce bids during 12am-6am to prevent overnight waste | Medium | Yes |

---

## Section 6 — Scaling Phase

| ID | Rule | Condition | Action | Priority | Auto? |
|----|------|-----------|--------|----------|-------|
| R22 | TACOS gate for scaling | `phase == scale AND tacos > 15%` | BLOCK scaling. Return to optimization phase | Critical | Yes |
| R23 | Budget allocation | `phase == scale` | SKC: 50%, Discovery: 25%, Competitor: 15%, Defensive: 10% | High | No |
| R24 | Vine enrollment | `reviews < 30` | Enroll in Vine before aggressive scaling | Medium | No |

### Budget Allocation Formula

```
totalBudget = monthlyPpcBudget

skc_budget        = totalBudget * 0.50    // proven single-keyword campaigns
discovery_budget  = totalBudget * 0.25    // auto + broad + phrase
competitor_budget = totalBudget * 0.15    // competitor ASIN targeting
defensive_budget  = totalBudget * 0.10    // brand defense campaigns

assert: skc + discovery + competitor + defensive == totalBudget
```

---

## Section 7 — Weekly Maintenance

| ID | Rule | Condition | Action | Priority | Auto? |
|----|------|-----------|--------|----------|-------|
| R35 | Budget cap warning | `campaignSpend >= dailyBudget * 0.90` | WARN: Hitting cap. Missing peak hours. Increase or reallocate | High | Yes |
| R36 | Min days between bid changes | `daysSinceLastBidChange < 7` | BLOCK bid change. Algorithm needs 7+ days of data per change | High | Yes |

### Weekly Checklist Triggers

```
EVERY Monday:
  1. Pull Search Term Report → run R10, R11, R16, R17
  2. Run bid optimization   → run R08-R15
  3. Check budget caps      → run R35
  4. Review placements      → run R19, R20
  5. Check organic rank     → run R33, R34
  6. Calculate TACOS        → run R25-R29
```

---

## Section 7.1 — TACOS Phase Classification

| ID | Rule | Condition | Action | Priority | Auto? |
|----|------|-----------|--------|----------|-------|
| R25 | TACOS — launch | `tacos > 25%` | Phase = LAUNCH. Expected 25-40%. Focus on velocity | Medium | Yes |
| R26 | TACOS — growth | `15% < tacos <= 25%` | Phase = OPTIMIZE. Harvest negatives, adjust bids. Do NOT scale | Medium | Yes |
| R27 | TACOS — mature | `tacos <= 15%` | Phase = SCALE. Organic carrying weight. Scale proven SKCs | Medium | Yes |
| R28 | TACOS trend worsening | `tacos[w] > tacos[w-1] > tacos[w-2]` | PAUSE scaling. Return to optimization. Two consecutive rises = regression | Critical | No |
| R29 | TACOS trend improving | `tacos[w] < tacos[w-1]` | Stay in current phase. Strategy is working | Low | Yes |

### TACOS Journey

```
Month 1-2  (Launch):   25-40%  →  invest in rank
Month 3-4  (Growth):   15-25%  →  optimize bids, harvest negatives
Month 5-6  (Momentum): 10-15%  →  scale proven keywords
Month 6+   (Mature):    8-12%  →  organic leader
```

---

## Section 9 — Funnel Diagnostic

| ID | Rule | Condition | Action | Priority | Auto? |
|----|------|-----------|--------|----------|-------|
| R30 | No impressions | `impressions == 0` | FIX: Raise bid 20-30% or swap keyword | High | No |
| R31 | Impressions, no clicks | `impressions > 0 AND clicks == 0` | FIX: Improve main image, title, price visibility | High | No |
| R32 | Clicks, no sales | `clicks > 0 AND orders == 0` | FIX: Listing quality — images, bullets, price, reviews, A+ content | High | No |
| R33 | Good ACOS, no organic lift | `acos <= 30% AND organicRank NOT improving` | FIX: Increase budget for more velocity. Add external traffic | Medium | No |
| R34 | Good PPC, organic declining | `ppc.sales > 0 AND organicRank declining` | FIX: Increase TOS modifier. Drive external traffic (TikTok, IG, FB) | High | No |

### Funnel Flow

```
Search → Impression → Click → Add to Cart → Purchase
         ↓ fail        ↓ fail     ↓ fail        ↓ fail
         R30           R31        R32            R32
         (bid/kw)      (image)    (listing)      (price/reviews)
```

---

## Key Formulas Reference

```
ACOS        = adSpend / adRevenue
TACOS       = adSpend / totalRevenue           (totalRevenue = ad + organic)
CVR         = orders / clicks
CTR         = clicks / impressions
CPC         = spend / clicks
ROAS        = adRevenue / adSpend              (inverse of ACOS)
breakEven   = (price - COGS - FBA - storage) / price
margin      = price - COGS - FBA - storage - adSpend
profitAcos  = margin / price                   (ACOS below this = profit)
```

---

*39 rules total | 22 automatable, 17 require human review | Source: docs/amazon-ppc-sop.md*
