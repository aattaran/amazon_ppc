# Sellermate Active Rules — Current State
Last updated: 2026-03-28 (Data analysis session: SBC TargetCPC recalculated, negation/budget rules enhanced, harvest mapping rebuilt, All Targets increase rule added)
Active: 18 | Advisory-only: 1 (old pause) | Disabled: 6

---

## BID DECREASE — All Targets

### Reduce Bid 30% - ACoS ≥70%, No Sales
- **Type:** All Targets | **Schedule:** Fr | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** ACoS ≥ 70% AND Sales = 0 → Reduce Bid 30%

### Reduce Bid 10% - ACoS 50-70%, Has Sales
- **Type:** All Targets | **Schedule:** Fr | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** ACoS 50–70% AND Sales > 0 → Reduce Bid 10%
- **Note:** ACoS < 60% guard added to avoid overlap with "Reduce/Increase Bid - CVR ≤4%..." rule.

### Reduce Bid 20% - Clicks 20-39, No Orders
- **Type:** All Targets | **Schedule:** Fr | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** Clicks ∈ [20, 39] AND Orders = 0 → Reduce Bid 20%

### Reduce Bid - Emergency 7d Spend Guard
- **Type:** All Targets | **Schedule:** Sa | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** High spend within 7d AND no/low revenue → Reduce Bid
- **Note:** Changed from Keyword Targets → All Targets (covers auto + product targets). Runs Saturday.

---

## BID INCREASE — All Targets

### Increase Bid 10% - ACoS ≤35%, Has Orders (Max $1.08)
- **Type:** All Targets | **Schedule:** Fr | **Lookback:** 30d | Skip: 3d | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** ACoS ≤ 35% AND Ad Purchases ≥ 1 → Increase Bid 10% (Max $1.08)
- **Note:** Added 2026-03-28. Closes the gap where auto targets and product targets had no upward bid support. All 7 decrease rules are All Targets, but previously no increase rule covered All Targets.

---

## PAUSE — All Targets

### ~~Pause - Clicks >40, No Orders~~
- **Type:** All Targets | **Schedule:** Fr | **Campaigns:** 16 | **Auto Execute:** OFF (advisory only)
- Redundant — "Pause Target - Clicks > 40, No Orders" does the same thing automatically.

### Pause Target - Clicks > 40, No Orders
- **Type:** All Targets | **Schedule:** Fr | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** Clicks > 40 AND Orders = 0 → Pause

---

## BUDGET MANAGEMENT — Campaign

### Adjust Budget - Usage ≥90% & ACoS ≤40% | ACoS ≥80% & Spend ≥$30
- **Type:** Campaign | **Schedule:** All Days | **Lookback:** Today's Live Data | **Campaigns:** 16 | **Auto Execute:** Partial
- **IF:** Budget Usage > 90% AND ACoS ≤ 40% AND Ad Purchases ≥ 1 → Increase Budget 20% (max $50)
- **ELSE_IF:** ACoS ≥ 80% AND Spend ≥ $30 → Decrease Budget 20% (min $9)
- **ELSE_IF:** Spend ≥ $30 AND Ad Purchases == 0 → Decrease Budget 30% (min $5) *(added 2026-03-27, catches zero-sales campaigns where ACoS is N/A)*
- **Runs:** All Days at 1:00 PM.

### Reduce Budget - TOS Share ≥50% & ACoS ≥45%
- **Type:** Campaign | **Schedule:** All Days | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** TOS Share ≥ 50% AND ACoS ≥ 45% → Reduce Budget

---

## BID RULES — Keyword Targets

### Increase Bid - Zero Impressions
- **Type:** Keyword Targets | **Schedule:** Fr | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** Impressions = 0 → Increase Bid
- **Note:** Rescues buried keywords.

### Reduce/Increase Bid - CVR ≤4% OR ACoS ≥60% | CPC > RPC | ACoS ≤30% (Max $1.08)
- **Type:** Keyword Targets | **Schedule:** Fr | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** CVR ≤ 4% OR ACoS ≥ 60% → Reduce Bid
- **ELSE_IF:** CPC > RPC → Reduce Bid
- **ELSE_IF:** ACoS ≤ 30% → Increase Bid (Max $1.08)
- **Note:** Schedule changed from Fr+Tu to Fr only (removes oscillation risk). Stays as Keyword Targets because changing to All Targets wipes conditions in Sellermate.

---

## HARVESTING — Mapped

### Harvest ST - Ad Purchases ≥2 & ACoS ≤30% -> Exact
- **Type:** Mapped Harvesting | **Schedule:** Fr | **Lookback:** 30d | Skip: 3d | **Campaigns:** via mapping | **Auto Execute:** ON
- **IF:** Ad Purchases ≥ 2 AND ACoS ≤ 30% → Add search term to mapped campaign (Exact $1.08, Phrase $1.08)
- **Negate:** Auto-negates harvested term as Exact in source ad group
- **Mapping:** "Active Campaign Harvest" (created 2026-03-27, replaces broken "Test Mapping" which pointed to paused campaigns)
  - SP_AUTO_B0DTDZFMY7 → berberine exact new 11 (E) + SP_MANUAL_KT_PHRASE (P)
  - SP_MANUAL_KT_BROAD → berberine exact new 11 (E) + SP_MANUAL_KT_PHRASE (P)
  - SP_MANUAL_KT_PHRASE → berberine exact new 11 (E)

---

## PLACEMENTS

### Reduce Placement - No Sales
- **Type:** Placements | **Schedule:** Fr | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** Spend threshold AND no sales → Reduce Placement %

### Increase Placement - Low ACoS
- **Type:** Placements | **Schedule:** Fr | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** ACoS ≤ 35% AND Ad Purchases ≥ 2 AND CVR ≥ 8% → Boost Placement %

---

## SMART BID CEILING — Low-Data Keyword Protection (Advanced Mode)

> **Concept:** "Death by 1,000 cuts" fix. Uses a Calculated Variable `TargetCPC` = `Campaign Target ACoS × 2.42`
> (where 2.42 = AOV × CVR = $22.00 × 11%). Keywords below ceiling can be safely increased; keywords above get reduced.
> At 30% campaign target ACoS → TargetCPC = $0.73. Updated 2026-03-27 from Fixed $0.49 (stale AOV/CVR inputs).

### SBC-1: Smart Ceiling — Reduce Over-Priced Low-Data Bids
- **Type:** All Targets | **Schedule:** Fr | **Lookback:** 30d | Skip: 7d | **Campaigns:** 17 | **Auto Execute:** ON
- **Variable:** TargetCPC = Calculated (Campaign Target ACoS × 2.42)
- **IF:** Current Bid >= TargetCPC (Variable) AND Click <= 2 AND Ad Purchases <= 0 → Reduce Bid 15%

### SBC-2: Smart Ceiling — Safe Increase for Buried Keywords
- **Type:** Keyword Targets | **Schedule:** Fr | **Lookback:** 30d | Skip: 7d | **Campaigns:** 16 | **Auto Execute:** ON
- **Variable:** TargetCPC = Calculated (Campaign Target ACoS × 2.42)
- **IF:** Current Bid <= TargetCPC (Variable) AND Impressions <= 0 → Increase Bid 10%

### SBC-3: Smart Ceiling — Hard Stop for Runaway Low-Data
- **Type:** All Targets | **Schedule:** Fr | **Lookback:** 30d | Skip: 7d | **Campaigns:** 16 | **Auto Execute:** ON
- **Variable:** TargetCPC = Calculated (Campaign Target ACoS × 2.42)
- **IF:** Current Bid >= TargetCPC (Variable) AND Click >= 3 AND Click <= 10 AND Ad Purchases <= 0 → Reduce Bid 25%

### SBC-4: Smart Ceiling — Scale Affordable Converters
- **Type:** Keyword Targets | **Schedule:** Fr | **Lookback:** 30d | Skip: 7d | **Campaigns:** 16 | **Auto Execute:** ON
- **Variable:** TargetCPC = Calculated (Campaign Target ACoS × 2.42)
- **IF:** Current Bid <= TargetCPC (Variable) AND Ad Purchases >= 1 AND ACoS <= 30 → Increase Bid 10%

---

## SEARCH TERM NEGATION

### Negate ST - Bleeders & High ACoS
- **Type:** Search Terms | **Lookback:** 30d | Skip: 3d | **Schedule:** Fr | **Campaigns:** 16 | **Auto Execute:** ON
- **IF:** Clicks > 20 AND Ad Purchases == 0 → Add Negative Exact
- **ELSE_IF:** ACoS > 70 AND Clicks ≥ 20 AND Ad Purchases ≥ 1 → Add Negative Exact
- **ELSE_IF:** Spend ≥ $15 AND Ad Purchases == 0 → Add Negative Exact *(added 2026-03-27, catches high-CPC terms that bleed via spend before hitting 20 clicks)*

---

## DISABLED (6 rules — legacy, 9 campaigns each from old paused campaign set)

| Rule | Type | Reason |
|------|------|--------|
| Increase Bid - Low ACoS Good Sales | All Targets | Covered by Reduce/Increase Bid multi-tier |
| Reduce Bid - Low CVR High ACoS | Keyword Targets | Covered by Reduce/Increase Bid multi-tier |
| Reduce Bid - CPC Exceeds RPC | Keyword Targets | Covered by Reduce/Increase Bid multi-tier |
| Reduce Budget - TOS Share ≥50% & ACoS ≥45% | Placements | Disabled — action type mismatch |
| Pause Target... | All Targets | Legacy, 9 campaigns |
| impression... | All Targets | Legacy, 9 campaigns |

---

## Summary Table

| # | Name | Type | Campaigns | Execute | Schedule |
|---|------|------|-----------|---------|----------|
| 1 | Reduce Bid 30% - ACoS ≥70%, No Sales | All Targets | 16 | ON | Fr |
| 2 | Reduce Bid 10% - ACoS 50-70%, Has Sales | All Targets | 16 | ON | Fr |
| 3 | Reduce Bid 20% - Clicks 20-39, No Orders | All Targets | 16 | ON | Fr |
| 4 | ~~Pause - Clicks >40, No Orders~~ | All Targets | 16 | OFF | Fr |
| 5 | Pause Target - Clicks > 40, No Orders | All Targets | 16 | ON | Fr |
| 6 | Reduce Bid - Emergency 7d Spend Guard | All Targets | 16 | ON | Sa |
| 7 | **Increase Bid 10% - ACoS ≤35%, Has Orders** | **All Targets** | **16** | **ON** | **Fr** |
| 8 | SBC-1: Reduce Over-Priced Low-Data | All Targets | 17 | ON | Fr |
| 9 | SBC-3: Hard Stop Runaway Low-Data | All Targets | 16 | ON | Fr |
| 10 | Adjust Budget (3 tiers) | Campaign | 16 | Partial | All Days |
| 11 | Reduce Budget - TOS Share ≥50% & ACoS ≥45% | Campaign | 16 | ON | All Days |
| 12 | Increase Bid - Zero Impressions | Keyword Targets | 16 | ON | Fr |
| 13 | Reduce/Increase Bid - CVR/ACoS/RPC multi-tier | Keyword Targets | 16 | ON | Fr |
| 14 | SBC-2: Safe Increase Buried Keywords | Keyword Targets | 16 | ON | Fr |
| 15 | SBC-4: Scale Affordable Converters | Keyword Targets | 16 | ON | Fr |
| 16 | Harvest ST - Ad Purchases ≥2 & ACoS ≤30% | Mapped Harvesting | 1 (mapping) | ON | Fr |
| 17 | Reduce Placement - No Sales | Placements | 16 | ON | Fr |
| 18 | Increase Placement - Low ACoS | Placements | 16 | ON | Fr |
| 19 | Negate ST - Bleeders & High ACoS (3 tiers) | Search Terms | 16 | ON | Fr |

### Coverage Matrix

| Target Type | Bid Decrease | Bid Increase | Pause | Budget | Placement | Negate | Harvest |
|---|---|---|---|---|---|---|---|
| **Keywords** | Rules 1-3, 6, 8, 9, 13 | Rules 7, 12, 13, 14, 15 | Rule 5 | Rules 10-11 | Rules 17-18 | Rule 19 | Rule 16 |
| **Auto targets** | Rules 1-3, 6, 8, 9 | **Rule 7** | Rule 5 | Rules 10-11 | Rules 17-18 | Rule 19 | Rule 16 |
| **Product targets** | Rules 1-3, 6, 8, 9 | **Rule 7** | Rule 5 | Rules 10-11 | Rules 17-18 | Rule 19 | Rule 16 |

**All target types now have both increase and decrease coverage.** The gap identified on 2026-03-27 (no All Targets increase rule) is closed by Rule 7.
