/**
 * Search Term Harvester
 * Downloads the Search Term Report (STR), classifies terms as winners or bleeders,
 * and produces negative keyword recommendations.
 * SOP Reference: Section 7 (Weekly), Section 5.2 (Negative Keywords)
 */

import { SOP_CONFIG } from '../../config/sop.config';

export interface SearchTermRow {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  targetingType: 'AUTO' | 'MANUAL';
  matchType: 'EXACT' | 'PHRASE' | 'BROAD' | 'TARGETING_EXPRESSION';
  searchTerm: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
}

export type TermClassification = 'winner' | 'bleeder' | 'needs_data' | 'no_spend';

export interface ClassifiedTerm extends SearchTermRow {
  classification: TermClassification;
  acos: number | null;
  reason: string;
  recommendation: 'promote_to_skc' | 'add_negative' | 'monitor' | 'no_action';
}

/**
 * Classify each search term as winner, bleeder, or needs more data.
 */
export function classifySearchTerms(terms: SearchTermRow[]): ClassifiedTerm[] {
  return terms.map(term => classify(term));
}

function classify(term: SearchTermRow): ClassifiedTerm {
  const acos = term.sales > 0 ? term.spend / term.sales : null;
  const targetAcos = SOP_CONFIG.targetAcos;
  const breakEvenAcos = SOP_CONFIG.breakEvenAcos;
  const minClicks = SOP_CONFIG.minClicksBeforeNegating;

  // No spend at all
  if (term.spend === 0) {
    return {
      ...term,
      acos,
      classification: 'no_spend',
      reason: 'No spend recorded — term may not have been shown yet',
      recommendation: 'no_action',
    };
  }

  // Spend but no clicks (very rare, but handle it)
  if (term.clicks === 0) {
    return {
      ...term,
      acos,
      classification: 'needs_data',
      reason: 'Spend with 0 clicks — likely impression-based, monitor',
      recommendation: 'monitor',
    };
  }

  // Clicks but no sales — check click threshold
  if (term.orders === 0) {
    if (term.clicks >= minClicks) {
      return {
        ...term,
        acos,
        classification: 'bleeder',
        reason: `${term.clicks} clicks, 0 orders, $${term.spend.toFixed(2)} wasted — negate immediately`,
        recommendation: 'add_negative',
      };
    }
    return {
      ...term,
      acos,
      classification: 'needs_data',
      reason: `${term.clicks} clicks, 0 orders — wait for ${minClicks - term.clicks} more clicks`,
      recommendation: 'monitor',
    };
  }

  // Has sales — evaluate ACOS
  if (acos! > breakEvenAcos) {
    return {
      ...term,
      acos,
      classification: 'bleeder',
      reason: `ACOS ${pct(acos!)} > break-even ${pct(breakEvenAcos)} — losing money`,
      recommendation: 'add_negative',
    };
  }

  if (acos! <= targetAcos && term.orders >= 2) {
    return {
      ...term,
      acos,
      classification: 'winner',
      reason: `ACOS ${pct(acos!)} ≤ target ${pct(targetAcos)}, ${term.orders} orders — strong performer`,
      recommendation: 'promote_to_skc',
    };
  }

  if (acos! <= targetAcos) {
    return {
      ...term,
      acos,
      classification: 'winner',
      reason: `ACOS ${pct(acos!)} ≤ target — monitor for more data before promoting to SKC`,
      recommendation: 'monitor',
    };
  }

  return {
    ...term,
    acos,
    classification: 'needs_data',
    reason: `ACOS ${pct(acos!)} between target and break-even — lower bid slightly, monitor`,
    recommendation: 'monitor',
  };
}

export interface HarvestResult {
  winners: ClassifiedTerm[];
  bleeders: ClassifiedTerm[];
  needsData: ClassifiedTerm[];
  noSpend: ClassifiedTerm[];
  negativeRecommendations: NegativeKeyword[];
  skcCandidates: ClassifiedTerm[];
}

export interface NegativeKeyword {
  searchTerm: string;
  campaignId: string;
  campaignName: string;
  matchType: 'NEGATIVE_EXACT';
  reason: string;
  wastedSpend: number;
}

/**
 * Harvest the STR: classify terms and produce actionable outputs.
 */
export function harvestSearchTerms(terms: SearchTermRow[]): HarvestResult {
  const classified = classifySearchTerms(terms);

  const winners   = classified.filter(t => t.classification === 'winner');
  const bleeders  = classified.filter(t => t.classification === 'bleeder');
  const needsData = classified.filter(t => t.classification === 'needs_data');
  const noSpend   = classified.filter(t => t.classification === 'no_spend');

  const negativeRecommendations: NegativeKeyword[] = bleeders.map(t => ({
    searchTerm:  t.searchTerm,
    campaignId:  t.campaignId,
    campaignName: t.campaignName,
    matchType:   'NEGATIVE_EXACT' as const,
    reason:      t.reason,
    wastedSpend: t.spend,
  }));

  const skcCandidates = winners.filter(t => t.recommendation === 'promote_to_skc');

  return { winners, bleeders, needsData, noSpend, negativeRecommendations, skcCandidates };
}

export function printHarvestReport(result: HarvestResult): void {
  const totalWasted = result.negativeRecommendations.reduce((s, n) => s + n.wastedSpend, 0);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SEARCH TERM HARVEST REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Winners (promote/monitor): ${result.winners.length}`);
  console.log(`  Bleeders (negate):         ${result.bleeders.length}`);
  console.log(`  Needs data:                ${result.needsData.length}`);
  console.log(`  No spend:                  ${result.noSpend.length}`);
  console.log(`  Wasted spend to recover:   $${totalWasted.toFixed(2)}`);

  if (result.negativeRecommendations.length > 0) {
    console.log('\n  NEGATIVES TO ADD:');
    for (const neg of result.negativeRecommendations) {
      console.log(`    ✗ "${neg.searchTerm}" ($${neg.wastedSpend.toFixed(2)} wasted) — ${neg.reason}`);
    }
  }

  if (result.skcCandidates.length > 0) {
    console.log('\n  SKC CANDIDATES (promote to single-keyword campaigns):');
    for (const kw of result.skcCandidates) {
      console.log(`    ✓ "${kw.searchTerm}" — ${kw.reason}`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
