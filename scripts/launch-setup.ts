/**
 * Entry Point: Launch Setup
 * Validates pre-launch checklist and prints the 6-campaign build plan.
 *
 * Usage:
 *   npm run launch-setup -- --dry-run
 *   npm run launch-setup -- --force          (bypass checklist blockers)
 *   npm run launch-setup -- --data-file <path>
 *
 * Data file format (JSON):
 *   {
 *     productName, dailyBudget, targetKeywords,
 *     competitorAsins, brandKeywords, skcKeyword,
 *     reviewCount, hasAPlusContent, hasAllImages, copyOptimized,
 *     backendKeywordsFilled, pricingCompetitive, inventoryAdequate,
 *     launchDate  // optional ISO date string
 *   }
 */

import { readFileSync } from 'fs';
import { SOP_CONFIG } from '../src/config/sop.config.js';
import { runLaunchSetup, LaunchSetupOptions } from '../src/sop/phases/launch.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force   = args.includes('--force');
const dataFileIdx = args.indexOf('--data-file');
const dataFile = dataFileIdx !== -1 ? args[dataFileIdx + 1] : null;

// If no data file, run with defaults from env (useful for quick previews)
let input: Record<string, unknown> = {
  productName:             SOP_CONFIG.productName,
  dailyBudget:             50,
  targetKeywords:          ['example keyword 1', 'example keyword 2'],
  competitorAsins:         [],
  brandKeywords:           [SOP_CONFIG.productName.toLowerCase()],
  reviewCount:             0,
  hasAPlusContent:         false,
  hasAllImages:            false,
  copyOptimized:           false,
  backendKeywordsFilled:   false,
  pricingCompetitive:      false,
  inventoryAdequate:       false,
};

if (dataFile) {
  try {
    input = JSON.parse(readFileSync(dataFile, 'utf-8'));
  } catch (err) {
    console.error(`Failed to read data file: ${dataFile}\n${err}`);
    process.exit(1);
  }
}

const opts: LaunchSetupOptions = {
  productName:      String(input.productName ?? SOP_CONFIG.productName),
  dailyBudget:      Number(input.dailyBudget ?? 50),
  targetKeywords:   (input.targetKeywords as string[]) ?? [],
  competitorAsins:  (input.competitorAsins as string[]) ?? [],
  brandKeywords:    (input.brandKeywords as string[]) ?? [],
  skcKeyword:       input.skcKeyword as string | undefined,
  launchDate:       input.launchDate as string | undefined,
  dryRun,
  prelaunchInput: {
    reviewCount:           Number(input.reviewCount ?? 0),
    hasAPlusContent:       Boolean(input.hasAPlusContent),
    hasAllImages:          Boolean(input.hasAllImages),
    copyOptimized:         Boolean(input.copyOptimized),
    backendKeywordsFilled: Boolean(input.backendKeywordsFilled),
    pricingCompetitive:    Boolean(input.pricingCompetitive),
    inventoryAdequate:     Boolean(input.inventoryAdequate),
  },
};

const campaigns = runLaunchSetup(opts, force);
process.exit(campaigns === null ? 1 : 0);
