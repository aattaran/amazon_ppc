/**
 * Optimize Phase
 * Runs the full optimization loop: bid adjustment, negative keyword harvest,
 * and placement modifier review.
 * SOP Reference: Section 5 (Bid Optimization), Section 5.2 (Negative Keywords),
 *               Section 6 (Placement Modifiers)
 */

import { SOP_CONFIG } from '../../config/sop.config';
import {
  optimizeBids,
  printBidOptimizationReport,
  KeywordMetrics,
  BidDecision,
} from '../workflows/bid-optimizer.js';
import {
  harvestSearchTerms,
  printHarvestReport,
  SearchTermRow,
  NegativeKeyword,
  ClassifiedTerm,
} from '../workflows/search-term-harvest.js';

// ── Placement Modifier Review ────────────────────────────────────────────────

export interface PlacementMetrics {
  campaignId: string;
  campaignName: string;
  /** Impressions from top-of-search placement */
  tosImpressions: number;
  /** Clicks from top-of-search placement */
  tosClicks: number;
  /** Revenue from top-of-search placement */
  tosSales: number;
  /** Spend at top-of-search */
  tosSpend: number;
  /** Impressions from product pages placement */
  ppImpressions: number;
  /** Clicks from product pages placement */
  ppClicks: number;
  /** Revenue from product pages placement */
  ppSales: number;
  /** Spend at product pages */
  ppSpend: number;
  /** Current TOS bid modifier (0.75 = +75%) */
  currentTosModifier: number;
  /** Current product pages bid modifier */
  currentPpModifier: number;
}

export type PlacementAction =
  | { type: 'raise_tos';  newModifier: number; reason: string }
  | { type: 'lower_tos';  newModifier: number; reason: string }
  | { type: 'raise_pp';   newModifier: number; reason: string }
  | { type: 'lower_pp';   newModifier: number; reason: string }
  | { type: 'no_action';  reason: string }
  | { type: 'needs_data'; reason: string };

export interface PlacementDecision {
  campaign: PlacementMetrics;
  tosAction: PlacementAction;
  ppAction: PlacementAction;
}

/**
 * Review placement modifiers for a campaign.
 * TOS modifier: raise when TOS ACOS ≤ target, lower when above break-even.
 */
export function reviewPlacementModifiers(p: PlacementMetrics): PlacementDecision {
  const target = SOP_CONFIG.targetAcos;
  const breakEven = SOP_CONFIG.breakEvenAcos;
  const step = 0.25; // adjust modifiers in 25% increments

  const tosAcos = p.tosSales > 0 ? p.tosSpend / p.tosSales : null;
  const ppAcos  = p.ppSales > 0  ? p.ppSpend  / p.ppSales  : null;

  const tosAction = decidePlacementAction(tosAcos, p.currentTosModifier, 'tos', target, breakEven, step, p.tosClicks);
  const ppAction  = decidePlacementAction(ppAcos,  p.currentPpModifier,  'pp',  target, breakEven, step, p.ppClicks);

  return { campaign: p, tosAction, ppAction };
}

function decidePlacementAction(
  acos: number | null,
  currentMod: number,
  placement: 'tos' | 'pp',
  target: number,
  breakEven: number,
  step: number,
  clicks: number,
): PlacementAction {
  const raiseKey = placement === 'tos' ? 'raise_tos' : 'raise_pp';
  const lowerKey = placement === 'tos' ? 'lower_tos' : 'lower_pp';
  const label    = placement === 'tos' ? 'Top-of-Search' : 'Product Pages';

  if (clicks < 10) {
    return { type: 'needs_data', reason: `${label}: fewer than 10 clicks — wait for more data` };
  }

  if (acos === null) {
    return { type: 'needs_data', reason: `${label}: no sales yet — wait for more data` };
  }

  if (acos <= target) {
    const newModifier = round(Math.min(currentMod + step, 9.00)); // Amazon caps at 900%
    return newModifier === currentMod
      ? { type: 'no_action', reason: `${label}: ACOS ${pct(acos)} ≤ target, modifier already at max` }
      : { type: raiseKey as PlacementAction['type'], newModifier, reason: `${label}: ACOS ${pct(acos)} ≤ target — raise modifier from ${pct(currentMod)} to ${pct(newModifier)}` } as PlacementAction;
  }

  if (acos > breakEven) {
    const newModifier = round(Math.max(currentMod - step, 0));
    return newModifier === currentMod
      ? { type: 'no_action', reason: `${label}: ACOS above break-even but modifier already at 0` }
      : { type: lowerKey as PlacementAction['type'], newModifier, reason: `${label}: ACOS ${pct(acos)} > break-even — lower modifier from ${pct(currentMod)} to ${pct(newModifier)}` } as PlacementAction;
  }

  return { type: 'no_action', reason: `${label}: ACOS ${pct(acos)} between target and break-even — hold` };
}

// ── Full Optimize Run ────────────────────────────────────────────────────────

export interface OptimizeInput {
  searchTermRows: SearchTermRow[];
  keywordMetrics: KeywordMetrics[];
  placementMetrics: PlacementMetrics[];
  dryRun?: boolean;
}

export interface OptimizeResult {
  bidDecisions: BidDecision[];
  negatives: NegativeKeyword[];
  skcCandidates: ClassifiedTerm[];
  placementDecisions: PlacementDecision[];
}

/**
 * Run the full optimize phase: bid decisions, negative harvest, placement review.
 */
export function runOptimizePhase(input: OptimizeInput): OptimizeResult {
  const { searchTermRows, keywordMetrics, placementMetrics, dryRun = false } = input;
  const tag = dryRun ? ' [DRY RUN]' : '';

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  OPTIMIZE PHASE${tag}`);
  console.log(`  Target ACOS:     ${pct(SOP_CONFIG.targetAcos)}`);
  console.log(`  Break-even ACOS: ${pct(SOP_CONFIG.breakEvenAcos)}`);
  console.log(`${'═'.repeat(50)}\n`);

  // Bid optimization
  const { decisions: bidDecisions } = optimizeBids(keywordMetrics);
  printBidOptimizationReport(bidDecisions);

  // Search term harvest
  const harvest = harvestSearchTerms(searchTermRows);
  printHarvestReport(harvest);

  // Placement review
  const placementDecisions = placementMetrics.map(reviewPlacementModifiers);
  printPlacementReport(placementDecisions);

  return {
    bidDecisions,
    negatives: harvest.negativeRecommendations,
    skcCandidates: harvest.skcCandidates,
    placementDecisions,
  };
}

export function printPlacementReport(decisions: PlacementDecision[]): void {
  const actionable = decisions.filter(
    d => d.tosAction.type !== 'no_action' && d.tosAction.type !== 'needs_data'
      || d.ppAction.type !== 'no_action' && d.ppAction.type !== 'needs_data',
  );

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PLACEMENT MODIFIER REVIEW');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Campaigns reviewed: ${decisions.length}`);
  console.log(`  Campaigns needing changes: ${actionable.length}`);

  for (const d of actionable) {
    console.log(`\n  ${d.campaign.campaignName}`);
    if (d.tosAction.type !== 'no_action' && d.tosAction.type !== 'needs_data') {
      const mod = 'newModifier' in d.tosAction ? `  → ${pct(d.tosAction.newModifier)}` : '';
      console.log(`    TOS: ${d.tosAction.reason}${mod}`);
    }
    if (d.ppAction.type !== 'no_action' && d.ppAction.type !== 'needs_data') {
      const mod = 'newModifier' in d.ppAction ? `  → ${pct(d.ppAction.newModifier)}` : '';
      console.log(`    PP:  ${d.ppAction.reason}${mod}`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
