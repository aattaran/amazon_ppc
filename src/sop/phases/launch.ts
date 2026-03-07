/**
 * Launch Phase
 * Implements the SOP Week 1-4 strategy: campaign validation, no-touch rule enforcement,
 * and pre-launch checklist verification.
 * SOP Reference: Section 3 (Campaign Structure), Section 4 (Launch Phase)
 */

import { SOP_CONFIG } from '../../config/sop.config';
import {
  buildLaunchCampaigns,
  printCampaignPlan,
  BuildCampaignsOptions,
  CampaignSpec,
} from '../workflows/campaign-builder.js';

// ── Pre-Launch Checklist ─────────────────────────────────────────────────────

export interface PreLaunchCheckItem {
  id: string;
  description: string;
  required: boolean;
  passed: boolean | null;   // null = not yet evaluated
  notes?: string;
}

export interface PreLaunchCheckInput {
  /** How many reviews the listing has at time of launch */
  reviewCount: number;
  /** True if listing has A+ Content */
  hasAPlusContent: boolean;
  /** True if all 7 main images are uploaded */
  hasAllImages: boolean;
  /** True if title, bullets, description are optimized */
  copyOptimized: boolean;
  /** True if backend search terms are filled in */
  backendKeywordsFilled: boolean;
  /** True if price is set competitively vs category avg */
  pricingCompetitive: boolean;
  /** True if inventory > 90 days of projected sales */
  inventoryAdequate: boolean;
}

export interface PreLaunchCheckResult {
  passed: boolean;
  checks: PreLaunchCheckItem[];
  blockers: PreLaunchCheckItem[];
  warnings: PreLaunchCheckItem[];
}

/**
 * Run the SOP pre-launch checklist. Returns blockers (must fix) and warnings (should fix).
 */
export function runPreLaunchChecklist(input: PreLaunchCheckInput): PreLaunchCheckResult {
  const minReviews = SOP_CONFIG.minReviewsBeforeScaling;

  const checks: PreLaunchCheckItem[] = [
    {
      id: 'main_images',
      description: 'All 7 main images uploaded (lifestyle, infographic, white bg)',
      required: true,
      passed: input.hasAllImages,
      notes: 'Amazon shows up to 7 images. Use all slots. Main image must be white background.',
    },
    {
      id: 'aplus',
      description: 'A+ Content (Enhanced Brand Content) published',
      required: false,
      passed: input.hasAPlusContent,
      notes: 'A+ Content can lift conversions 5-10%. Not required to launch but recommended.',
    },
    {
      id: 'copy',
      description: 'Title, bullets, and description are keyword-optimized',
      required: true,
      passed: input.copyOptimized,
      notes: 'Target keyword must appear in title. Top 3-5 keywords in first two bullets.',
    },
    {
      id: 'backend_keywords',
      description: 'Backend search terms filled (250 bytes)',
      required: true,
      passed: input.backendKeywordsFilled,
      notes: 'Use all 250 bytes. No repetition. Include synonyms, misspellings, Spanish variants.',
    },
    {
      id: 'pricing',
      description: 'Price is competitive vs. category average',
      required: true,
      passed: input.pricingCompetitive,
      notes: 'Launch at or slightly below category average to aid conversion rate.',
    },
    {
      id: 'inventory',
      description: 'Inventory covers 90+ days of projected sales',
      required: true,
      passed: input.inventoryAdequate,
      notes: 'Running out of stock resets ranking. Never launch without 90-day buffer.',
    },
    {
      id: 'reviews',
      description: `Listing has ${minReviews}+ reviews before scaling budget`,
      required: false,
      passed: input.reviewCount >= minReviews,
      notes: `Current: ${input.reviewCount} reviews. Target: ${minReviews}. Run Vine or review request automation first.`,
    },
  ];

  const blockers = checks.filter(c => c.required && c.passed === false);
  const warnings = checks.filter(c => !c.required && c.passed === false);
  const passed = blockers.length === 0;

  return { passed, checks, blockers, warnings };
}

export function printPreLaunchChecklist(result: PreLaunchCheckResult): void {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PRE-LAUNCH CHECKLIST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const check of result.checks) {
    const icon = check.passed ? '✓' : check.required ? '✗' : '△';
    console.log(`  ${icon}  ${check.description}`);
    if (!check.passed && check.notes) {
      console.log(`       → ${check.notes}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (result.passed) {
    console.log('  STATUS: READY TO LAUNCH');
    if (result.warnings.length > 0) {
      console.log(`  ${result.warnings.length} warning(s) — fix after launch if possible`);
    }
  } else {
    console.log(`  STATUS: NOT READY — ${result.blockers.length} blocker(s) must be resolved`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// ── No-Touch Rule ────────────────────────────────────────────────────────────

export interface NoTouchCheckInput {
  /** Date campaigns went live (ISO string or Date) */
  launchDate: Date | string;
  /** Today's date — defaults to now */
  today?: Date | string;
}

export interface NoTouchCheckResult {
  daysLive: number;
  noTouchWindowDays: number;
  inNoTouchWindow: boolean;
  message: string;
}

/**
 * Enforce the no-touch window: do not adjust bids for the first N days (default 7).
 * Amazon's algorithm needs time to optimize delivery before you have meaningful data.
 */
export function checkNoTouchWindow(input: NoTouchCheckInput): NoTouchCheckResult {
  const launch = new Date(input.launchDate);
  const today = input.today ? new Date(input.today) : new Date();
  const daysLive = Math.floor((today.getTime() - launch.getTime()) / (1000 * 60 * 60 * 24));
  const noTouchWindowDays = SOP_CONFIG.launchNoTouchDays;
  const inNoTouchWindow = daysLive < noTouchWindowDays;

  const message = inNoTouchWindow
    ? `Day ${daysLive} of ${noTouchWindowDays}-day no-touch window. Do NOT adjust bids yet. ${noTouchWindowDays - daysLive} days remaining.`
    : `No-touch window complete (${daysLive} days live). Ready for first bid review.`;

  return { daysLive, noTouchWindowDays, inNoTouchWindow, message };
}

// ── Launch Setup Entry Point ─────────────────────────────────────────────────

export interface LaunchSetupOptions extends BuildCampaignsOptions {
  prelaunchInput: PreLaunchCheckInput;
  launchDate?: Date | string;
}

/**
 * Full launch setup: validate checklist, print campaign plan.
 * Returns null if checklist has blockers and force is not set.
 */
export function runLaunchSetup(opts: LaunchSetupOptions, force = false): CampaignSpec[] | null {
  const checkResult = runPreLaunchChecklist(opts.prelaunchInput);
  printPreLaunchChecklist(checkResult);

  if (!checkResult.passed && !force) {
    console.error('Launch setup aborted: resolve blockers first. Use --force to override.\n');
    return null;
  }

  if (!checkResult.passed && force) {
    console.warn('WARNING: Launching with unresolved checklist blockers (--force used).\n');
  }

  const campaigns = buildLaunchCampaigns(opts);
  printCampaignPlan(campaigns, opts.dryRun);

  if (opts.launchDate) {
    const noTouch = checkNoTouchWindow({ launchDate: opts.launchDate });
    console.log(`\n  NO-TOUCH STATUS: ${noTouch.message}\n`);
  } else {
    console.log(`\n  NOTE: Set --launch-date to track the no-touch window.\n`);
  }

  return campaigns;
}
