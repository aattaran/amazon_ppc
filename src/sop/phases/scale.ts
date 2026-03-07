/**
 * Scale Phase
 * Implements SOP scaling strategy: reallocate budget to proven SKC campaigns,
 * reduce discovery spend, and validate readiness to scale.
 * SOP Reference: Section 8.3 (Scale Phase), Section 3.6 (Budget Allocation)
 */

import { SOP_CONFIG } from '../../config/sop.config';
import { computeTacos, TacosSnapshot } from '../workflows/tacos-tracker';
import { CampaignSpec } from '../workflows/campaign-builder';

// ── Scale Readiness Check ────────────────────────────────────────────────────

export interface ScaleReadinessInput {
  reviewCount: number;
  tacos: TacosSnapshot;
  /** Number of active SKC campaigns with proven ACOS ≤ target */
  provenSkcCount: number;
  /** Total daily budget currently allocated */
  currentDailyBudget: number;
}

export interface ScaleReadinessResult {
  ready: boolean;
  checks: ScaleReadinessCheck[];
  blockers: ScaleReadinessCheck[];
}

export interface ScaleReadinessCheck {
  id: string;
  description: string;
  passed: boolean;
  notes: string;
}

/**
 * Validate that the account is ready to enter scale phase.
 * Requirements: enough reviews, healthy TACOS, proven SKC campaigns.
 */
export function checkScaleReadiness(input: ScaleReadinessInput): ScaleReadinessResult {
  const minReviews = SOP_CONFIG.minReviewsBeforeScaling;
  const matureMax = SOP_CONFIG.tacos.matureMax;

  const checks: ScaleReadinessCheck[] = [
    {
      id: 'reviews',
      description: `Listing has ${minReviews}+ reviews`,
      passed: input.reviewCount >= minReviews,
      notes: `Current: ${input.reviewCount}. Scaling before social proof leads to wasted spend.`,
    },
    {
      id: 'tacos',
      description: `TACOS ≤ ${pct(matureMax)} (mature threshold)`,
      passed: input.tacos.tacos <= matureMax,
      notes: `Current TACOS: ${pct(input.tacos.tacos)}. Organic is not carrying enough weight yet.`,
    },
    {
      id: 'tacos_status',
      description: 'TACOS status is not critical',
      passed: input.tacos.tacosStatus !== 'critical',
      notes: `Status: ${input.tacos.tacosStatus}. Fix TACOS before scaling.`,
    },
    {
      id: 'skc_campaigns',
      description: 'At least 1 proven SKC campaign with ACOS ≤ target',
      passed: input.provenSkcCount >= 1,
      notes: `Current proven SKCs: ${input.provenSkcCount}. Promote winning search terms to SKC first.`,
    },
    {
      id: 'phase',
      description: 'Current phase is "optimize" or "scale" (not still in launch)',
      passed: SOP_CONFIG.currentPhase !== 'launch',
      notes: `PPC_PHASE=${SOP_CONFIG.currentPhase}. Complete optimization phase before scaling.`,
    },
  ];

  const blockers = checks.filter(c => !c.passed);
  return { ready: blockers.length === 0, checks, blockers };
}

export function printScaleReadinessReport(result: ScaleReadinessResult): void {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SCALE READINESS CHECK');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const check of result.checks) {
    const icon = check.passed ? '✓' : '✗';
    console.log(`  ${icon}  ${check.description}`);
    if (!check.passed) {
      console.log(`       → ${check.notes}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(result.ready
    ? '  STATUS: READY TO SCALE — increase SKC budgets and reduce discovery'
    : `  STATUS: NOT READY — ${result.blockers.length} blocker(s) must be resolved first`,
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ── Budget Reallocation ──────────────────────────────────────────────────────

export interface ScaleBudgetInput {
  /** Total daily budget to allocate across all campaign types */
  totalDailyBudget: number;
  /** Names or IDs of proven SKC campaigns (to receive the SKC allocation) */
  provenSkcCampaigns: string[];
}

export interface ScaleBudgetAllocation {
  totalDailyBudget: number;
  skcBudget: number;
  skcPerCampaign: number;
  discoveryBudget: number;
  competitorBudget: number;
  defensiveBudget: number;
  alloc: typeof SOP_CONFIG.budgetAllocation;
}

/**
 * Compute the SOP budget allocation for the scale phase.
 * SKC campaigns receive 50% of total budget (split equally across proven SKCs).
 */
export function computeScaleBudget(input: ScaleBudgetInput): ScaleBudgetAllocation {
  const alloc = SOP_CONFIG.budgetAllocation;
  const { totalDailyBudget, provenSkcCampaigns } = input;

  const skcBudget        = round(totalDailyBudget * alloc.skc);
  const discoveryBudget  = round(totalDailyBudget * alloc.discovery);
  const competitorBudget = round(totalDailyBudget * alloc.competitor);
  const defensiveBudget  = round(totalDailyBudget * alloc.defensive);
  const skcPerCampaign   = provenSkcCampaigns.length > 0
    ? round(skcBudget / provenSkcCampaigns.length)
    : skcBudget;

  return {
    totalDailyBudget,
    skcBudget,
    skcPerCampaign,
    discoveryBudget,
    competitorBudget,
    defensiveBudget,
    alloc,
  };
}

export function printScaleBudgetPlan(input: ScaleBudgetInput, alloc: ScaleBudgetAllocation, dryRun = false): void {
  const tag = dryRun ? ' [DRY RUN]' : '';

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  SCALE BUDGET ALLOCATION${tag}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Total daily budget:   $${alloc.totalDailyBudget.toFixed(2)}`);
  console.log('');
  console.log(`  SKC (${pct(alloc.alloc.skc)}):            $${alloc.skcBudget.toFixed(2)}/day`);
  if (input.provenSkcCampaigns.length > 0) {
    console.log(`    Split across ${input.provenSkcCampaigns.length} SKC campaign(s): $${alloc.skcPerCampaign.toFixed(2)}/day each`);
    for (const name of input.provenSkcCampaigns) {
      console.log(`      • ${name}`);
    }
  }
  console.log(`  Discovery (${pct(alloc.alloc.discovery)}):       $${alloc.discoveryBudget.toFixed(2)}/day (auto + phrase)`);
  console.log(`  Competitor (${pct(alloc.alloc.competitor)}):      $${alloc.competitorBudget.toFixed(2)}/day`);
  console.log(`  Defensive (${pct(alloc.alloc.defensive)}):       $${alloc.defensiveBudget.toFixed(2)}/day`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

// ── External Traffic Prompt ──────────────────────────────────────────────────

/**
 * Print the SOP prompt to consider external traffic sources at scale.
 * External traffic (TikTok, influencers, Meta) boosts BSR and organic rank.
 */
export function printExternalTrafficPrompt(tacos: TacosSnapshot): void {
  if (tacos.tacos > SOP_CONFIG.tacos.matureMax) return; // not ready yet

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  EXTERNAL TRAFFIC — ACTION PROMPT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  TACOS is ${pct(tacos.tacos)} — organic is carrying weight. Time to accelerate.`);
  console.log('');
  console.log('  Recommended next steps:');
  console.log('  1. TikTok/Reels creator outreach — product seeding for UGC');
  console.log('  2. Meta retargeting to Amazon product page (attribution link)');
  console.log('  3. Email list / Klaviyo → Amazon follow-up sequence');
  console.log('  4. Rebate promotions (Vine Voices, Rebatekey) to push BSR');
  console.log('  5. ManyChat → Messenger → Amazon link sequence');
  console.log('');
  console.log('  External traffic signals boost organic rank independently of PPC spend.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ── Full Scale Run ───────────────────────────────────────────────────────────

export interface ScaleInput {
  reviewCount: number;
  adSpend: number;
  adRevenue: number;
  totalRevenue: number;
  provenSkcCampaigns: string[];
  totalDailyBudget: number;
  dryRun?: boolean;
}

/**
 * Run the full scale phase workflow.
 */
export function runScalePhase(input: ScaleInput): void {
  const { adSpend, adRevenue, totalRevenue, provenSkcCampaigns, totalDailyBudget, reviewCount, dryRun = false } = input;
  const tag = dryRun ? ' [DRY RUN]' : '';

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  SCALE PHASE${tag}`);
  console.log(`${'═'.repeat(50)}\n`);

  const tacos = computeTacos(adSpend, adRevenue, totalRevenue);

  const readiness = checkScaleReadiness({
    reviewCount,
    tacos,
    provenSkcCount: provenSkcCampaigns.length,
    currentDailyBudget: totalDailyBudget,
  });
  printScaleReadinessReport(readiness);

  if (!readiness.ready) return;

  const budgetInput: ScaleBudgetInput = { totalDailyBudget, provenSkcCampaigns };
  const allocation = computeScaleBudget(budgetInput);
  printScaleBudgetPlan(budgetInput, allocation, dryRun);

  printExternalTrafficPrompt(tacos);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
