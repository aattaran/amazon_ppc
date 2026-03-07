/**
 * Weekly Maintenance Orchestrator
 * Runs the Monday checklist: STR harvest → bid optimization → TACOS check.
 * SOP Reference: Section 7 — Weekly Review Schedule
 *
 * This module ties together the three core workflows into a single runnable pass.
 * Each step is logged independently so you can run them in isolation if needed.
 */

import { SOP_CONFIG } from '../../config/sop.config';
import {
  harvestSearchTerms,
  printHarvestReport,
  SearchTermRow,
  HarvestResult,
} from './search-term-harvest.js';
import {
  optimizeBids,
  printBidOptimizationReport,
  KeywordMetrics,
} from './bid-optimizer.js';
import {
  computeTacos,
  printTacosReport,
  TacosSnapshot,
} from './tacos-tracker.js';

export interface WeeklyMaintenanceInput {
  /** Raw rows from the Search Term Report (STR) download */
  searchTermRows: SearchTermRow[];
  /** Keyword-level metrics from the Sponsored Products report */
  keywordMetrics: KeywordMetrics[];
  /** Ad spend for the period */
  adSpend: number;
  /** Revenue attributed to ads */
  adRevenue: number;
  /** Total revenue including organic — pass adRevenue if organic is unknown */
  totalRevenue: number;
  /** If true, print reports but do not apply any changes */
  dryRun?: boolean;
}

export interface WeeklyMaintenanceResult {
  harvestResult: HarvestResult;
  bidSummary: ReturnType<typeof optimizeBids>['summary'];
  tacosSnapshot: TacosSnapshot;
  actionItems: ActionItem[];
}

export interface ActionItem {
  priority: 'critical' | 'high' | 'normal';
  category: 'negatives' | 'bids' | 'skc' | 'tacos' | 'review';
  description: string;
  count?: number;
}

/**
 * Run the full Monday maintenance workflow.
 * Steps:
 *   1. Harvest STR → classify winners/bleeders → build negative list
 *   2. Optimize bids → raise/lower/negate/isolate per decision tree
 *   3. Compute TACOS → determine phase and flag status
 *   4. Compile prioritized action items
 */
export function runWeeklyMaintenance(input: WeeklyMaintenanceInput): WeeklyMaintenanceResult {
  const { searchTermRows, keywordMetrics, adSpend, adRevenue, totalRevenue, dryRun = false } = input;
  const tag = dryRun ? ' [DRY RUN]' : '';

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  WEEKLY PPC MAINTENANCE${tag}`);
  console.log(`  Phase: ${SOP_CONFIG.currentPhase.toUpperCase()}`);
  console.log(`  Lookback: ${SOP_CONFIG.reportLookbackDays} days`);
  console.log(`${'═'.repeat(50)}\n`);

  // ── Step 1: Search Term Harvest ──────────────────────────────────────────
  console.log('  STEP 1 / 3 — Search Term Harvest');
  const harvestResult = harvestSearchTerms(searchTermRows);
  printHarvestReport(harvestResult);

  // ── Step 2: Bid Optimization ─────────────────────────────────────────────
  console.log('  STEP 2 / 3 — Bid Optimization');
  const { decisions, summary: bidSummary } = optimizeBids(keywordMetrics);
  printBidOptimizationReport(decisions);

  // ── Step 3: TACOS Check ──────────────────────────────────────────────────
  console.log('  STEP 3 / 3 — TACOS Status');
  const tacosSnapshot = computeTacos(adSpend, adRevenue, totalRevenue);
  printTacosReport(tacosSnapshot);

  // ── Compile Action Items ─────────────────────────────────────────────────
  const actionItems: ActionItem[] = buildActionItems(harvestResult, bidSummary, tacosSnapshot);

  printActionPlan(actionItems, dryRun);

  return { harvestResult, bidSummary, tacosSnapshot, actionItems };
}

function buildActionItems(
  harvest: HarvestResult,
  bids: ReturnType<typeof optimizeBids>['summary'],
  tacos: TacosSnapshot,
): ActionItem[] {
  const items: ActionItem[] = [];

  // Negatives — highest priority (wasted spend)
  if (harvest.negativeRecommendations.length > 0) {
    const totalWasted = harvest.negativeRecommendations.reduce((s, n) => s + n.wastedSpend, 0);
    items.push({
      priority: totalWasted > 100 ? 'critical' : 'high',
      category: 'negatives',
      description: `Add ${harvest.negativeRecommendations.length} negative exact keywords ($${totalWasted.toFixed(2)} wasted spend to recover)`,
      count: harvest.negativeRecommendations.length,
    });
  }

  // Keywords to negate from bid optimizer
  if (bids.negate.length > 0) {
    items.push({
      priority: 'high',
      category: 'negatives',
      description: `Negate ${bids.negate.length} keywords at keyword level (clicks with 0 orders)`,
      count: bids.negate.length,
    });
  }

  // SKC promotions
  if (harvest.skcCandidates.length > 0) {
    items.push({
      priority: 'high',
      category: 'skc',
      description: `Promote ${harvest.skcCandidates.length} winning search term(s) to Single-Keyword Campaigns`,
      count: harvest.skcCandidates.length,
    });
  }

  if (bids.isolate.length > 0) {
    items.push({
      priority: 'high',
      category: 'skc',
      description: `Isolate ${bids.isolate.length} keyword(s) into dedicated SKC campaigns`,
      count: bids.isolate.length,
    });
  }

  // Bid changes
  if (bids.raise.length > 0) {
    items.push({
      priority: 'normal',
      category: 'bids',
      description: `Raise bids on ${bids.raise.length} keyword(s) (low ACOS or no impressions)`,
      count: bids.raise.length,
    });
  }

  if (bids.lower.length > 0) {
    items.push({
      priority: 'normal',
      category: 'bids',
      description: `Lower bids on ${bids.lower.length} keyword(s) (ACOS above target)`,
      count: bids.lower.length,
    });
  }

  // TACOS alerts
  if (tacos.tacosStatus === 'critical') {
    items.push({
      priority: 'critical',
      category: 'tacos',
      description: `TACOS is CRITICAL (${(tacos.tacos * 100).toFixed(1)}%). Pause low-performers, cut discovery budget, focus budget on proven SKCs only.`,
    });
  } else if (tacos.tacosStatus === 'above-target') {
    items.push({
      priority: 'high',
      category: 'tacos',
      description: `TACOS is above target (${(tacos.tacos * 100).toFixed(1)}%). Tighten bids and accelerate negative harvesting.`,
    });
  }

  // Phase mismatch
  if (tacos.suggestedPhase !== SOP_CONFIG.currentPhase) {
    items.push({
      priority: 'high',
      category: 'review',
      description: `Phase mismatch: PPC_PHASE="${SOP_CONFIG.currentPhase}" but TACOS data suggests "${tacos.suggestedPhase}". Update PPC_PHASE in .env.`,
    });
  }

  // Sort: critical first, then high, then normal
  const order = { critical: 0, high: 1, normal: 2 };
  items.sort((a, b) => order[a.priority] - order[b.priority]);

  return items;
}

function printActionPlan(items: ActionItem[], dryRun: boolean): void {
  const tag = dryRun ? ' [DRY RUN — review only]' : '';
  console.log(`\n${'━'.repeat(50)}`);
  console.log(`  ACTION PLAN${tag}`);
  console.log(`${'━'.repeat(50)}`);

  if (items.length === 0) {
    console.log('  No actions required this week. Monitor and return next Monday.');
  }

  for (const item of items) {
    const icon = item.priority === 'critical' ? '🔴' : item.priority === 'high' ? '🟡' : '🟢';
    console.log(`\n  ${icon} [${item.priority.toUpperCase()}] [${item.category.toUpperCase()}]`);
    console.log(`     ${item.description}`);
  }

  console.log(`\n${'━'.repeat(50)}\n`);
}
