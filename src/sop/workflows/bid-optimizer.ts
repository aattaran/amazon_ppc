/**
 * Bid Optimizer — SOP Decision Tree
 * Implements the weekly keyword-level bid optimization logic from SOP Section 5.1.
 * Each keyword is evaluated individually through the decision tree.
 */

import { SOP_CONFIG } from '../../config/sop.config';

export interface KeywordMetrics {
  keywordId: string;
  keyword: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  currentBid: number;
}

export type BidAction =
  | { type: 'raise_bid';    newBid: number; reason: string }
  | { type: 'lower_bid';    newBid: number; reason: string }
  | { type: 'negate';       reason: string }
  | { type: 'isolate_skc';  reason: string }
  | { type: 'no_action';    reason: string }
  | { type: 'needs_data';   reason: string };

export interface BidDecision {
  keyword: KeywordMetrics;
  action: BidAction;
}

/**
 * Run the SOP bid optimization decision tree for a single keyword.
 */
export function decideBidAction(kw: KeywordMetrics): BidDecision {
  const acos = kw.sales > 0 ? kw.spend / kw.sales : Infinity;
  const targetAcos = SOP_CONFIG.targetAcos;
  const breakEvenAcos = SOP_CONFIG.breakEvenAcos;
  const reductionPct = SOP_CONFIG.acosBidReductionPct;
  const increasePct = SOP_CONFIG.acosBidIncreasePct;
  const minClicks = SOP_CONFIG.minClicksBeforeNegating;

  // 1. No impressions → raise bid
  if (kw.impressions === 0) {
    const newBid = round(kw.currentBid * 1.25);
    return {
      keyword: kw,
      action: { type: 'raise_bid', newBid, reason: 'No impressions — bid too low' },
    };
  }

  // 2. Has impressions, no clicks
  if (kw.clicks === 0) {
    if (kw.impressions < SOP_CONFIG.minImpressionsBeforeBidRaise) {
      return {
        keyword: kw,
        action: { type: 'needs_data', reason: `Only ${kw.impressions} impressions — need more data` },
      };
    }
    // Many impressions, zero clicks → creative/relevance issue, not bid
    return {
      keyword: kw,
      action: {
        type: 'no_action',
        reason: 'Impressions but 0 clicks — review main image and title relevance, not a bid issue',
      },
    };
  }

  // 3. Has clicks, no sales
  if (kw.orders === 0) {
    if (kw.clicks >= minClicks) {
      return {
        keyword: kw,
        action: {
          type: 'negate',
          reason: `${kw.clicks} clicks, 0 orders — add as negative exact to prevent waste`,
        },
      };
    }
    return {
      keyword: kw,
      action: {
        type: 'needs_data',
        reason: `${kw.clicks} clicks, 0 orders — wait for ${minClicks - kw.clicks} more clicks before negating`,
      },
    };
  }

  // 4. Has sales — evaluate ACOS
  if (acos > breakEvenAcos) {
    // High ACOS, losing money
    const newBid = round(kw.currentBid * (1 - reductionPct));
    return {
      keyword: kw,
      action: {
        type: 'lower_bid',
        newBid,
        reason: `ACOS ${pct(acos)} > break-even ${pct(breakEvenAcos)} — lower bid ${pct(reductionPct)}`,
      },
    };
  }

  if (acos > targetAcos && acos <= breakEvenAcos) {
    // Above target but below break-even — slight reduction
    const newBid = round(kw.currentBid * (1 - reductionPct * 0.5));
    return {
      keyword: kw,
      action: {
        type: 'lower_bid',
        newBid,
        reason: `ACOS ${pct(acos)} above target ${pct(targetAcos)} — gentle bid reduction ${pct(reductionPct * 0.5)}`,
      },
    };
  }

  if (acos <= targetAcos && kw.orders >= 3) {
    // Low ACOS, multiple orders → isolate to SKC and scale
    return {
      keyword: kw,
      action: {
        type: 'isolate_skc',
        reason: `ACOS ${pct(acos)} ≤ target, ${kw.orders} orders — strong performer, isolate to SKC campaign`,
      },
    };
  }

  if (acos <= targetAcos) {
    // At or below target — scale up
    const newBid = round(kw.currentBid * (1 + increasePct));
    return {
      keyword: kw,
      action: {
        type: 'raise_bid',
        newBid,
        reason: `ACOS ${pct(acos)} ≤ target ${pct(targetAcos)} — increase bid ${pct(increasePct)} to capture more volume`,
      },
    };
  }

  return {
    keyword: kw,
    action: { type: 'no_action', reason: `ACOS ${pct(acos)} is at target — monitor next week` },
  };
}

/**
 * Run the decision tree on all keywords and return grouped results.
 */
export function optimizeBids(keywords: KeywordMetrics[]): {
  decisions: BidDecision[];
  summary: {
    raise: BidDecision[];
    lower: BidDecision[];
    negate: BidDecision[];
    isolate: BidDecision[];
    noAction: BidDecision[];
    needsData: BidDecision[];
  };
} {
  const decisions = keywords.map(decideBidAction);
  return {
    decisions,
    summary: {
      raise:     decisions.filter(d => d.action.type === 'raise_bid'),
      lower:     decisions.filter(d => d.action.type === 'lower_bid'),
      negate:    decisions.filter(d => d.action.type === 'negate'),
      isolate:   decisions.filter(d => d.action.type === 'isolate_skc'),
      noAction:  decisions.filter(d => d.action.type === 'no_action'),
      needsData: decisions.filter(d => d.action.type === 'needs_data'),
    },
  };
}

export function printBidOptimizationReport(decisions: BidDecision[]): void {
  const { summary } = optimizeBids(decisions.map(d => d.keyword));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  BID OPTIMIZATION REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Keywords reviewed: ${decisions.length}`);
  console.log(`  Raise bid:    ${summary.raise.length}`);
  console.log(`  Lower bid:    ${summary.lower.length}`);
  console.log(`  Negate:       ${summary.negate.length}`);
  console.log(`  Isolate→SKC:  ${summary.isolate.length}`);
  console.log(`  No action:    ${summary.noAction.length}`);
  console.log(`  Needs data:   ${summary.needsData.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const group of [
    { label: 'NEGATE (add as negative exact)', items: summary.negate },
    { label: 'ISOLATE → SKC', items: summary.isolate },
    { label: 'RAISE BID', items: summary.raise },
    { label: 'LOWER BID', items: summary.lower },
  ]) {
    if (group.items.length === 0) continue;
    console.log(`\n  ${group.label}:`);
    for (const d of group.items) {
      const newBid = 'newBid' in d.action ? `  → $${d.action.newBid}` : '';
      console.log(`    • [${d.keyword.matchType}] "${d.keyword.keyword}"${newBid}  — ${d.action.reason}`);
    }
  }
  console.log('');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
