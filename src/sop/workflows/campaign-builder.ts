/**
 * Campaign Builder
 * Creates the 6 SOP-required campaign types for a product launch.
 * SOP Reference: Section 3 — Campaign Structure
 */

import { SOP_CONFIG } from '../../config/sop.config';

export type CampaignType = 'auto' | 'exact' | 'skc' | 'phrase' | 'competitor' | 'defensive';

export interface CampaignSpec {
  type: CampaignType;
  name: string;
  matchType: 'AUTO' | 'EXACT' | 'PHRASE' | 'BROAD' | 'TARGETING_EXPRESSION';
  dailyBudget: number;
  tosModifier: number;   // % for top-of-search placement bid modifier
  ppModifier: number;    // % for product pages placement bid modifier
  purpose: string;
  keywords?: string[];   // for exact/phrase/SKC campaigns
  targetAsins?: string[]; // for competitor/defensive campaigns
  notes: string;
}

export interface BuildCampaignsOptions {
  productName: string;
  dailyBudget: number;      // total daily budget to split across campaigns
  targetKeywords: string[]; // top 20–30 keywords for exact/phrase campaigns
  competitorAsins?: string[];
  brandKeywords?: string[];
  skcKeyword?: string;      // optional: build a single SKC for one proven keyword
  dryRun?: boolean;
}

/**
 * Build the full set of SOP-required campaign specs for a product.
 * Applies budget allocation from SOP_CONFIG.budgetAllocation.
 */
export function buildLaunchCampaigns(opts: BuildCampaignsOptions): CampaignSpec[] {
  const { productName, dailyBudget, targetKeywords, competitorAsins = [], brandKeywords = [], skcKeyword } = opts;
  const tpl = SOP_CONFIG.campaignNameTemplates;
  const alloc = SOP_CONFIG.budgetAllocation;

  const resolve = (template: string, keyword?: string) =>
    template
      .replace('[PRODUCT]', productName.toUpperCase())
      .replace('[KEYWORD]', (keyword ?? 'KW').toUpperCase().replace(/\s+/g, '-'));

  const campaigns: CampaignSpec[] = [
    // 1. Auto Discovery — catches unknown search terms
    {
      type: 'auto',
      name: resolve(tpl.auto),
      matchType: 'AUTO',
      dailyBudget: round(dailyBudget * alloc.discovery * 0.5),
      tosModifier: SOP_CONFIG.tosModifierLaunch,
      ppModifier: 0,
      purpose: 'Harvest new converting search terms. Run at low CPC. Never pause — always keep this alive.',
      notes: 'Set bid at 40–60% of suggested bid. Harvest winners weekly into exact match campaigns.',
    },

    // 2. Exact Ranking — aggressive bids on top target keywords
    {
      type: 'exact',
      name: resolve(tpl.exact),
      matchType: 'EXACT',
      dailyBudget: round(dailyBudget * alloc.skc * 0.4),
      tosModifier: SOP_CONFIG.tosModifierRanking,
      ppModifier: 0,
      purpose: 'Drive ranking for top 20–30 target keywords. High TOS modifier to win page 1.',
      keywords: targetKeywords,
      notes: 'Top 5–10 keywords get highest bids. Add all keywords as negative exact in auto/broad campaigns.',
    },

    // 3. Phrase/Broad Discovery — mid-funnel, cheaper CPC
    {
      type: 'phrase',
      name: resolve(tpl.phrase),
      matchType: 'PHRASE',
      dailyBudget: round(dailyBudget * alloc.discovery * 0.5),
      tosModifier: SOP_CONFIG.tosModifierLaunch * 0.5,
      ppModifier: 0,
      purpose: 'Mid-funnel discovery at lower CPC. Feed winners to exact/SKC campaigns.',
      keywords: targetKeywords,
      notes: 'Lower bids than exact. Add exact keywords as negatives to prevent cannibalization.',
    },

    // 4. Competitor ASIN Targeting
    {
      type: 'competitor',
      name: resolve(tpl.competitor),
      matchType: 'TARGETING_EXPRESSION',
      dailyBudget: round(dailyBudget * alloc.competitor),
      tosModifier: 0,
      ppModifier: 0.50,
      purpose: 'Appear on competitor product pages. Steal traffic from top competing ASINs.',
      targetAsins: competitorAsins,
      notes: 'Target top 3–5 competitor ASINs. Use product pages modifier instead of TOS.',
    },

    // 5. Defensive Brand Campaign
    {
      type: 'defensive',
      name: resolve(tpl.defensive),
      matchType: 'EXACT',
      dailyBudget: round(dailyBudget * alloc.defensive),
      tosModifier: 0,
      ppModifier: 0,
      purpose: 'Prevent competitors from appearing when customers search your brand name.',
      keywords: brandKeywords,
      notes: 'Low bids sufficient — you own your brand. Protect high-intent branded traffic.',
    },
  ];

  // 6. Optional: SKC for a known winning keyword
  if (skcKeyword) {
    campaigns.push({
      type: 'skc',
      name: resolve(tpl.skc, skcKeyword),
      matchType: 'EXACT',
      dailyBudget: round(dailyBudget * alloc.skc * 0.6),
      tosModifier: SOP_CONFIG.tosModifierRanking,
      ppModifier: 0,
      purpose: `Single-keyword campaign for proven winner: "${skcKeyword}". Full budget control and isolation.`,
      keywords: [skcKeyword],
      notes: 'Only create SKCs for keywords with proven ACOS ≤ target. One keyword per campaign, max budget control.',
    });
  }

  return campaigns;
}

export function printCampaignPlan(campaigns: CampaignSpec[], dryRun = false): void {
  const tag = dryRun ? ' [DRY RUN — not created]' : '';
  const totalBudget = campaigns.reduce((s, c) => s + c.dailyBudget, 0);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  CAMPAIGN BUILD PLAN${tag}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Total daily budget: $${totalBudget.toFixed(2)}`);
  console.log(`  Campaigns to create: ${campaigns.length}`);

  for (const c of campaigns) {
    console.log(`\n  [${c.type.toUpperCase()}] ${c.name}`);
    console.log(`    Match:      ${c.matchType}`);
    console.log(`    Budget:     $${c.dailyBudget}/day`);
    console.log(`    TOS mod:    +${(c.tosModifier * 100).toFixed(0)}%`);
    console.log(`    Purpose:    ${c.purpose}`);
    if (c.keywords?.length) {
      console.log(`    Keywords:   ${c.keywords.slice(0, 5).join(', ')}${c.keywords.length > 5 ? ` +${c.keywords.length - 5} more` : ''}`);
    }
    if (c.targetAsins?.length) {
      console.log(`    ASINs:      ${c.targetAsins.join(', ')}`);
    }
    console.log(`    Notes:      ${c.notes}`);
  }
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
