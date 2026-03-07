/**
 * SOP Configuration — Single source of truth for all PPC thresholds and parameters.
 * All values read from environment variables with safe defaults.
 * Set these in your .env file to tune behavior without touching code.
 */

export type PpcPhase = 'launch' | 'optimize' | 'scale';

function envFloat(key: string, defaultVal: number): number {
  const val = process.env[key];
  if (!val) return defaultVal;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? defaultVal : parsed;
}

function envInt(key: string, defaultVal: number): number {
  const val = process.env[key];
  if (!val) return defaultVal;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultVal : parsed;
}

function envString<T extends string>(key: string, defaultVal: T, allowed: T[]): T {
  const val = process.env[key] as T | undefined;
  if (!val || !allowed.includes(val)) return defaultVal;
  return val;
}

export const SOP_CONFIG = {
  // ── Phase Control ──────────────────────────────────────────────────────────
  // PPC_PHASE=launch | optimize | scale
  currentPhase: envString<PpcPhase>('PPC_PHASE', 'launch', ['launch', 'optimize', 'scale']),

  // ── ACOS Thresholds ────────────────────────────────────────────────────────
  // TARGET_ACOS: your desired profitable ACOS (e.g. 0.30 = 30%)
  targetAcos: envFloat('TARGET_ACOS', 0.30),

  // BREAK_EVEN_ACOS: price - COGS - FBA fees - storage / price
  breakEvenAcos: envFloat('BREAK_EVEN_ACOS', 0.45),

  // ACOS_BID_REDUCTION_PCT: how much to lower bids when ACOS is high (0.15 = 15%)
  acosBidReductionPct: envFloat('ACOS_BID_REDUCTION_PCT', 0.15),

  // ACOS_BID_INCREASE_PCT: how much to raise bids when ACOS is low + sales are good
  acosBidIncreasePct: envFloat('ACOS_BID_INCREASE_PCT', 0.20),

  // ── TACOS Stages ───────────────────────────────────────────────────────────
  // Total ACOS = ad spend / total revenue (including organic)
  tacos: {
    launchMax: envFloat('TACOS_LAUNCH_MAX', 0.40),   // launch: up to 40% is OK
    growthMax: envFloat('TACOS_GROWTH_MAX', 0.25),   // growth: 15–25%
    matureMax: envFloat('TACOS_MATURE_MAX', 0.15),   // mature: 8–15%
    target:    envFloat('TACOS_TARGET', 0.12),        // your goal
  },

  // ── Budget Allocation (scale phase only) ───────────────────────────────────
  // Must sum to 1.0. Adjust via env vars.
  budgetAllocation: {
    skc:        envFloat('BUDGET_SKC', 0.50),         // proven single-keyword campaigns
    discovery:  envFloat('BUDGET_DISCOVERY', 0.25),   // auto + broad + phrase
    competitor: envFloat('BUDGET_COMPETITOR', 0.15),  // competitor ASIN targeting
    defensive:  envFloat('BUDGET_DEFENSIVE', 0.10),   // brand defense campaigns
  },

  // ── Bid Decision Thresholds ────────────────────────────────────────────────
  // MIN_CLICKS_BEFORE_NEGATING: how many clicks with 0 sales before adding as negative
  minClicksBeforeNegating: envInt('MIN_CLICKS_BEFORE_NEGATING', 10),

  // MIN_IMPRESSIONS_BEFORE_BID_RAISE: below this, raise bid instead of pausing
  minImpressionsBeforeBidRaise: envInt('MIN_IMPRESSIONS_BEFORE_BID_RAISE', 100),

  // ── TOS (Top of Search) Modifiers ─────────────────────────────────────────
  // TOS_MODIFIER_LAUNCH: % increase for launch campaigns (0.75 = +75%)
  tosModifierLaunch:  envFloat('TOS_MODIFIER_LAUNCH', 0.75),

  // TOS_MODIFIER_RANKING: % increase for ranking/SKC campaigns (1.00 = +100%)
  tosModifierRanking: envFloat('TOS_MODIFIER_RANKING', 1.00),

  // ── Launch Phase Settings ──────────────────────────────────────────────────
  // LAUNCH_DAYS: days to run before touching any bids (no-touch window)
  launchNoTouchDays: envInt('LAUNCH_DAYS', 7),

  // LAUNCH_REVIEW_INTERVAL_DAYS: how often to review after no-touch window
  launchReviewIntervalDays: envInt('LAUNCH_REVIEW_DAYS', 7),

  // ── Keyword Eligibility ────────────────────────────────────────────────────
  // MIN_REVIEWS_BEFORE_SCALING: listing review count required before scaling budget
  minReviewsBeforeScaling: envInt('MIN_REVIEWS_BEFORE_SCALING', 15),

  // ── Reporting ─────────────────────────────────────────────────────────────
  // REPORT_LOOKBACK_DAYS: days of data to pull for analysis
  reportLookbackDays: envInt('REPORT_LOOKBACK_DAYS', 30),

  // ── Campaign Naming Convention ─────────────────────────────────────────────
  // Use [PRODUCT] and [KEYWORD] as placeholders — replaced at runtime
  campaignNameTemplates: {
    auto:       process.env.CAMPAIGN_TPL_AUTO       ?? '[PRODUCT]-AUTO-DISCOVERY',
    exact:      process.env.CAMPAIGN_TPL_EXACT      ?? '[PRODUCT]-EXACT-RANKING',
    skc:        process.env.CAMPAIGN_TPL_SKC        ?? '[PRODUCT]-SKC-[KEYWORD]',
    phrase:     process.env.CAMPAIGN_TPL_PHRASE     ?? '[PRODUCT]-PHRASE-BROAD',
    competitor: process.env.CAMPAIGN_TPL_COMPETITOR ?? '[PRODUCT]-PT-COMPETITOR',
    defensive:  process.env.CAMPAIGN_TPL_DEFENSIVE  ?? '[PRODUCT]-BRAND-DEFENSE',
  },

  // ── Amazon API ─────────────────────────────────────────────────────────────
  profileId: process.env.AMAZON_PROFILE_ID ?? '',
  productAsin: process.env.PRODUCT_ASIN ?? '',
  productName: process.env.PRODUCT_NAME ?? 'PRODUCT',
} as const;

export type SopConfig = typeof SOP_CONFIG;
