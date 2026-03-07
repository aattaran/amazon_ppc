/**
 * SOP Automation Rules — Consolidated Reference
 *
 * Every rule from the Amazon PPC SOP (docs/amazon-ppc-sop.md) expressed as
 * a declarative condition + action pair. This is the single source of truth
 * for what the automation engine should do in each scenario.
 *
 * All thresholds come from SOP_CONFIG — no magic numbers.
 */

import { SOP_CONFIG } from '../config/sop.config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AutomationRule {
  id: string;
  section: string;
  name: string;
  condition: string;
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  automated: boolean;
}

// ---------------------------------------------------------------------------
// Section 2 — Pre-Launch Readiness
// ---------------------------------------------------------------------------

const PRE_LAUNCH: AutomationRule[] = [
  {
    id: 'R01',
    section: '2.1',
    name: 'Minimum reviews gate',
    condition: `reviews < ${SOP_CONFIG.minReviewsBeforeScaling}`,
    action: `BLOCK scaling. Enroll in Amazon Vine or run giveaways until reviews >= ${SOP_CONFIG.minReviewsBeforeScaling}`,
    priority: 'critical',
    automated: false,
  },
  {
    id: 'R02',
    section: '2.2',
    name: 'Target ACOS calculation',
    condition: 'targetAcos = (price - COGS - FBA_fees - storage_fees) / price',
    action: `Set TARGET_ACOS env var. Current value: ${(SOP_CONFIG.targetAcos * 100).toFixed(0)}%`,
    priority: 'critical',
    automated: false,
  },
  {
    id: 'R03',
    section: '2.3',
    name: 'Keyword list minimum',
    condition: 'keywordCount < 30',
    action: 'WARN: Need 30-50 target keywords before launch. Use Helium10 or DataForSEO to expand list',
    priority: 'high',
    automated: false,
  },
];

// ---------------------------------------------------------------------------
// Section 3 — Campaign Structure Rules
// ---------------------------------------------------------------------------

const STRUCTURE: AutomationRule[] = [
  {
    id: 'R37',
    section: '3.2',
    name: 'Single match type per ad group',
    condition: 'countDistinct(adGroup.matchTypes) > 1',
    action: 'VIOLATION: Never mix Exact, Phrase, and Broad in the same ad group. Split into separate ad groups',
    priority: 'critical',
    automated: true,
  },
  {
    id: 'R38',
    section: '3.2',
    name: 'Single product per ad group',
    condition: 'countDistinct(adGroup.products) > 1',
    action: 'VIOLATION: Only 1 product per ad group. Split into separate ad groups for product-level ACOS analysis',
    priority: 'critical',
    automated: true,
  },
  {
    id: 'R39',
    section: '3.2',
    name: 'Do not move winning keywords',
    condition: 'keyword.isWinner AND keyword.isBeingMoved',
    action: 'BLOCK: Do NOT move a winning keyword to a new campaign — it may lose history. Move the losers out instead',
    priority: 'high',
    automated: false,
  },
  {
    id: 'R18',
    section: '3.2',
    name: 'Cross-campaign negative isolation',
    condition: 'keyword.matchType == EXACT AND keyword.campaign == exactCampaign',
    action: 'Add this keyword as NEGATIVE EXACT in all Auto, Phrase, and Broad campaigns to prevent cannibalization',
    priority: 'high',
    automated: true,
  },
];

// ---------------------------------------------------------------------------
// Section 4 — Launch Phase
// ---------------------------------------------------------------------------

const LAUNCH: AutomationRule[] = [
  {
    id: 'R04',
    section: '4.1',
    name: 'No-touch window',
    condition: `daysSinceLaunch < ${SOP_CONFIG.launchNoTouchDays}`,
    action: `BLOCK all bid/budget changes. Wait ${SOP_CONFIG.launchNoTouchDays} days for algorithm to collect data`,
    priority: 'critical',
    automated: true,
  },
  {
    id: 'R05',
    section: '4.1',
    name: 'Auto campaign initial CPC range',
    condition: 'campaign.type == AUTO AND phase == launch',
    action: 'Set CPC between $0.50 and $0.75. Set daily budget $20-$50',
    priority: 'medium',
    automated: false,
  },
  {
    id: 'R06',
    section: '4.1',
    name: 'TOS modifier on ranking campaigns',
    condition: 'campaign.type == RANKING AND phase == launch',
    action: `Set Top of Search placement modifier to ${(SOP_CONFIG.tosModifierLaunch * 100).toFixed(0)}-${(SOP_CONFIG.tosModifierRanking * 100).toFixed(0)}%`,
    priority: 'high',
    automated: true,
  },
  {
    id: 'R07',
    section: '4.3',
    name: 'High ACOS normal during launch',
    condition: `phase == launch AND acos > ${(SOP_CONFIG.breakEvenAcos * 100).toFixed(0)}%`,
    action: 'NO ACTION — high ACOS during launch is expected. This is rank investment. Do NOT reduce bids',
    priority: 'medium',
    automated: true,
  },
];

// ---------------------------------------------------------------------------
// Section 5.1 — Bid Optimization Decision Tree
// ---------------------------------------------------------------------------

const BID_OPTIMIZATION: AutomationRule[] = [
  {
    id: 'R08',
    section: '5.1',
    name: 'No impressions — raise bid',
    condition: 'impressions == 0',
    action: 'Raise bid 20-30%. newBid = currentBid * 1.25',
    priority: 'high',
    automated: true,
  },
  {
    id: 'R09',
    section: '5.1',
    name: 'Impressions but no clicks — creative issue',
    condition: `impressions >= ${SOP_CONFIG.minImpressionsBeforeBidRaise} AND clicks == 0`,
    action: 'DO NOT adjust bid. Review main image and title for relevance. This is a creative problem, not a bid problem',
    priority: 'high',
    automated: false,
  },
  {
    id: 'R10',
    section: '5.1',
    name: 'Clicks, no sales — negate bleeder',
    condition: `clicks >= ${SOP_CONFIG.minClicksBeforeNegating} AND orders == 0`,
    action: 'Add keyword as NEGATIVE EXACT. Pause keyword. This is wasted spend',
    priority: 'critical',
    automated: true,
  },
  {
    id: 'R11',
    section: '5.1',
    name: 'Clicks, no sales — needs more data',
    condition: `clicks > 0 AND clicks < ${SOP_CONFIG.minClicksBeforeNegating} AND orders == 0`,
    action: `WAIT — need ${SOP_CONFIG.minClicksBeforeNegating} clicks minimum before negating. Monitor next week`,
    priority: 'low',
    automated: true,
  },
  {
    id: 'R12',
    section: '5.1',
    name: 'ACOS above break-even — lower bid',
    condition: `acos > ${(SOP_CONFIG.breakEvenAcos * 100).toFixed(0)}%`,
    action: `Lower bid ${(SOP_CONFIG.acosBidReductionPct * 100).toFixed(0)}%. newBid = currentBid * ${(1 - SOP_CONFIG.acosBidReductionPct).toFixed(2)}`,
    priority: 'critical',
    automated: true,
  },
  {
    id: 'R13',
    section: '5.1',
    name: 'ACOS between target and break-even — gentle reduction',
    condition: `${(SOP_CONFIG.targetAcos * 100).toFixed(0)}% < acos <= ${(SOP_CONFIG.breakEvenAcos * 100).toFixed(0)}%`,
    action: `Lower bid ${(SOP_CONFIG.acosBidReductionPct * 50).toFixed(1)}% (gentle). newBid = currentBid * ${(1 - SOP_CONFIG.acosBidReductionPct * 0.5).toFixed(3)}`,
    priority: 'high',
    automated: true,
  },
  {
    id: 'R14',
    section: '5.1',
    name: 'Low ACOS, multiple orders — isolate to SKC',
    condition: `acos <= ${(SOP_CONFIG.targetAcos * 100).toFixed(0)}% AND orders >= 3`,
    action: 'Isolate keyword into its own Single Keyword Campaign (SKC). Increase budget on SKC. Do NOT remove from original campaign — move losers out instead',
    priority: 'high',
    automated: false,
  },
  {
    id: 'R15',
    section: '5.1',
    name: 'Low ACOS, few orders — raise bid to scale',
    condition: `acos <= ${(SOP_CONFIG.targetAcos * 100).toFixed(0)}% AND orders < 3`,
    action: `Raise bid ${(SOP_CONFIG.acosBidIncreasePct * 100).toFixed(0)}%. newBid = currentBid * ${(1 + SOP_CONFIG.acosBidIncreasePct).toFixed(2)}`,
    priority: 'medium',
    automated: true,
  },
];

// ---------------------------------------------------------------------------
// Section 5.2 — Negative Keywords
// ---------------------------------------------------------------------------

const NEGATIVE_KEYWORDS: AutomationRule[] = [
  {
    id: 'R16',
    section: '5.2',
    name: 'High clicks, zero sales — negate',
    condition: `clicks >= ${SOP_CONFIG.minClicksBeforeNegating} AND orders == 0`,
    action: 'Add as NEGATIVE EXACT in the campaign where it appeared',
    priority: 'critical',
    automated: true,
  },
  {
    id: 'R17',
    section: '5.2',
    name: 'ACOS above break-even — negate search term',
    condition: `searchTerm.acos > ${(SOP_CONFIG.breakEvenAcos * 100).toFixed(0)}%`,
    action: 'Add search term as NEGATIVE EXACT — losing money on every sale',
    priority: 'critical',
    automated: true,
  },
];

// ---------------------------------------------------------------------------
// Section 5.3 — Placement Optimization
// ---------------------------------------------------------------------------

const PLACEMENT: AutomationRule[] = [
  {
    id: 'R19',
    section: '5.3',
    name: 'TOS outperforming — increase modifier',
    condition: 'tos.acos < rest.acos AND tos.conversions > 0',
    action: `Increase TOS placement modifier. Consider up to ${(SOP_CONFIG.tosModifierRanking * 100).toFixed(0)}%`,
    priority: 'medium',
    automated: false,
  },
  {
    id: 'R20',
    section: '5.3',
    name: 'Product pages converting — do not pause',
    condition: 'productPages.orders > 0 AND overall.acos > targetAcos',
    action: 'DO NOT pause keyword. It looks bad overall but product page placement is converting. Adjust placement modifiers instead of base bid',
    priority: 'high',
    automated: false,
  },
];

// ---------------------------------------------------------------------------
// Section 5.4 — Dayparting
// ---------------------------------------------------------------------------

const DAYPARTING: AutomationRule[] = [
  {
    id: 'R21',
    section: '5.4',
    name: 'Overnight bid reduction',
    condition: 'hour >= 0 AND hour < 6',
    action: 'Reduce bids during overnight hours (12am-6am) to prevent wasted spend on low-conversion traffic',
    priority: 'medium',
    automated: true,
  },
];

// ---------------------------------------------------------------------------
// Section 6 — Scaling Phase
// ---------------------------------------------------------------------------

const SCALING: AutomationRule[] = [
  {
    id: 'R22',
    section: '6',
    name: 'TACOS gate for scaling',
    condition: `phase == scale AND tacos > ${(SOP_CONFIG.tacos.matureMax * 100).toFixed(0)}%`,
    action: 'BLOCK scaling. TACOS too high — return to optimization phase first',
    priority: 'critical',
    automated: true,
  },
  {
    id: 'R23',
    section: '6.2',
    name: 'Budget allocation at scale',
    condition: 'phase == scale',
    action: [
      `SKC (proven keywords): ${(SOP_CONFIG.budgetAllocation.skc * 100).toFixed(0)}% of total budget`,
      `Discovery (Auto + Broad + Phrase): ${(SOP_CONFIG.budgetAllocation.discovery * 100).toFixed(0)}%`,
      `Competitor ASIN targeting: ${(SOP_CONFIG.budgetAllocation.competitor * 100).toFixed(0)}%`,
      `Defensive brand campaigns: ${(SOP_CONFIG.budgetAllocation.defensive * 100).toFixed(0)}%`,
    ].join('. '),
    priority: 'high',
    automated: false,
  },
  {
    id: 'R24',
    section: '6.1',
    name: 'Vine enrollment gate',
    condition: 'reviews < 30',
    action: 'Enroll in Amazon Vine program to build review count before aggressive scaling',
    priority: 'medium',
    automated: false,
  },
];

// ---------------------------------------------------------------------------
// Section 7 — Weekly Maintenance & TACOS
// ---------------------------------------------------------------------------

const WEEKLY_MAINTENANCE: AutomationRule[] = [
  {
    id: 'R35',
    section: '7',
    name: 'Budget cap warning',
    condition: 'campaignSpend >= dailyBudget * 0.90',
    action: 'WARN: Campaign is hitting budget cap. Increase budget or reallocate from low performers. Missing afternoon/evening peak hours',
    priority: 'high',
    automated: true,
  },
  {
    id: 'R36',
    section: '7',
    name: 'Minimum days between bid changes',
    condition: `daysSinceLastBidChange < ${SOP_CONFIG.launchNoTouchDays}`,
    action: `BLOCK bid change. Need ${SOP_CONFIG.launchNoTouchDays}+ days of data per change. Frequent changes disrupt the algorithm`,
    priority: 'high',
    automated: true,
  },
];

// ---------------------------------------------------------------------------
// Section 7.1 — TACOS Phase Classification
// ---------------------------------------------------------------------------

const TACOS: AutomationRule[] = [
  {
    id: 'R25',
    section: '7.1',
    name: 'TACOS — launch phase',
    condition: `tacos > ${(SOP_CONFIG.tacos.growthMax * 100).toFixed(0)}%`,
    action: `Phase = LAUNCH. Expected TACOS: ${(SOP_CONFIG.tacos.growthMax * 100).toFixed(0)}-${(SOP_CONFIG.tacos.launchMax * 100).toFixed(0)}%. Focus on velocity, not profitability`,
    priority: 'medium',
    automated: true,
  },
  {
    id: 'R26',
    section: '7.1',
    name: 'TACOS — growth/optimize phase',
    condition: `${(SOP_CONFIG.tacos.matureMax * 100).toFixed(0)}% < tacos <= ${(SOP_CONFIG.tacos.growthMax * 100).toFixed(0)}%`,
    action: 'Phase = OPTIMIZE. Harvest negatives, adjust bids, review placements. Do NOT scale yet',
    priority: 'medium',
    automated: true,
  },
  {
    id: 'R27',
    section: '7.1',
    name: 'TACOS — mature/scale phase',
    condition: `tacos <= ${(SOP_CONFIG.tacos.matureMax * 100).toFixed(0)}%`,
    action: 'Phase = SCALE. Organic is carrying weight. Ready to scale proven SKC campaigns',
    priority: 'medium',
    automated: true,
  },
  {
    id: 'R28',
    section: '7',
    name: 'TACOS trend worsening',
    condition: 'tacos_this_week > tacos_last_week AND tacos_last_week > tacos_two_weeks_ago',
    action: 'Pause scaling immediately. Return to optimization phase. Two consecutive weeks of rising TACOS = regression',
    priority: 'critical',
    automated: false,
  },
  {
    id: 'R29',
    section: '7',
    name: 'TACOS trend improving',
    condition: 'tacos_this_week < tacos_last_week',
    action: 'Stay in current phase. Strategy is working — do not change approach',
    priority: 'low',
    automated: true,
  },
];

// ---------------------------------------------------------------------------
// Section 9 — Funnel Diagnostic
// ---------------------------------------------------------------------------

const FUNNEL_DIAGNOSTIC: AutomationRule[] = [
  {
    id: 'R30',
    section: '9',
    name: 'Funnel break — no impressions',
    condition: 'impressions == 0',
    action: 'FIX: Bid too low or keyword irrelevant. Raise bid 20-30% or swap for a better keyword',
    priority: 'high',
    automated: false,
  },
  {
    id: 'R31',
    section: '9',
    name: 'Funnel break — impressions but no clicks',
    condition: 'impressions > 0 AND clicks == 0',
    action: 'FIX: Bad main image or title. CTR problem — improve main image, title, or price visibility',
    priority: 'high',
    automated: false,
  },
  {
    id: 'R32',
    section: '9',
    name: 'Funnel break — clicks but no sales',
    condition: 'clicks > 0 AND orders == 0',
    action: 'FIX: Listing quality issue. Check images, bullet points, price competitiveness, review count, and A+ content',
    priority: 'high',
    automated: false,
  },
  {
    id: 'R33',
    section: '9',
    name: 'Funnel break — good ACOS but no organic rank lift',
    condition: `acos <= ${(SOP_CONFIG.targetAcos * 100).toFixed(0)}% AND organicRank NOT improving`,
    action: 'FIX: Not enough sales velocity. Increase budget to drive more volume. Add external traffic (TikTok, Instagram, Facebook)',
    priority: 'medium',
    automated: false,
  },
  {
    id: 'R34',
    section: '9',
    name: 'Funnel break — good PPC but organic declining',
    condition: 'ppc.sales > 0 AND organicRank declining',
    action: 'FIX: Competitor outranking. Increase TOS placement modifier. Drive external traffic to boost organic rank signal',
    priority: 'high',
    automated: false,
  },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const SOP_RULES: AutomationRule[] = [
  ...PRE_LAUNCH,
  ...STRUCTURE,
  ...LAUNCH,
  ...BID_OPTIMIZATION,
  ...NEGATIVE_KEYWORDS,
  ...PLACEMENT,
  ...DAYPARTING,
  ...SCALING,
  ...WEEKLY_MAINTENANCE,
  ...TACOS,
  ...FUNNEL_DIAGNOSTIC,
];

export const SOP_RULES_BY_SECTION = {
  preLaunch:        PRE_LAUNCH,
  structure:        STRUCTURE,
  launch:           LAUNCH,
  bidOptimization:  BID_OPTIMIZATION,
  negativeKeywords: NEGATIVE_KEYWORDS,
  placement:        PLACEMENT,
  dayparting:       DAYPARTING,
  scaling:          SCALING,
  weeklyMaintenance: WEEKLY_MAINTENANCE,
  tacos:            TACOS,
  funnelDiagnostic: FUNNEL_DIAGNOSTIC,
} as const;

/** Lookup a single rule by ID (e.g. "R08") */
export function getRuleById(id: string): AutomationRule | undefined {
  return SOP_RULES.find(r => r.id === id);
}

/** Get all rules that can be auto-executed without human review */
export function getAutomatedRules(): AutomationRule[] {
  return SOP_RULES.filter(r => r.automated);
}

/** Get all rules that require human review */
export function getManualRules(): AutomationRule[] {
  return SOP_RULES.filter(r => !r.automated);
}

/** Get all critical-priority rules */
export function getCriticalRules(): AutomationRule[] {
  return SOP_RULES.filter(r => r.priority === 'critical');
}
