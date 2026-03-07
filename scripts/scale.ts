/**
 * Entry Point: Scale Phase
 * Checks scale readiness, computes budget allocation, prints external traffic prompt.
 *
 * Usage:
 *   npm run scale -- --data-file <path> [--dry-run]
 *
 * Data file format (JSON):
 *   {
 *     reviewCount: number,
 *     adSpend: number,
 *     adRevenue: number,
 *     totalRevenue: number,
 *     provenSkcCampaigns: string[],  // names of proven SKC campaigns
 *     totalDailyBudget: number
 *   }
 */

import { readFileSync } from 'fs';
import { runScalePhase, ScaleInput } from '../src/sop/phases/scale.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dataFileIdx = args.indexOf('--data-file');
const dataFile = dataFileIdx !== -1 ? args[dataFileIdx + 1] : null;

if (!dataFile) {
  console.error(
    '\nUsage: npm run scale -- --data-file <path> [--dry-run]\n\n' +
    'Data file must be JSON with shape:\n' +
    '  { reviewCount, adSpend, adRevenue, totalRevenue, provenSkcCampaigns, totalDailyBudget }\n',
  );
  process.exit(1);
}

let data: Omit<ScaleInput, 'dryRun'>;
try {
  data = JSON.parse(readFileSync(dataFile, 'utf-8'));
} catch (err) {
  console.error(`Failed to read data file: ${dataFile}\n${err}`);
  process.exit(1);
}

runScalePhase({ ...data, dryRun });
