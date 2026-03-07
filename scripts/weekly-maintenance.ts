/**
 * Entry Point: Weekly Maintenance
 * Run every Monday morning to harvest STR, optimize bids, and check TACOS.
 *
 * Usage:
 *   npm run weekly-maintenance
 *   npm run weekly-maintenance -- --dry-run
 *
 * Inputs (provide via env or pass real data via --data-file):
 *   AMAZON_PROFILE_ID, TARGET_ACOS, BREAK_EVEN_ACOS, PPC_PHASE
 *
 * Data file format (JSON):
 *   { searchTermRows: [...], keywordMetrics: [...], adSpend, adRevenue, totalRevenue }
 */

import { readFileSync } from 'fs';
import { runWeeklyMaintenance, WeeklyMaintenanceInput } from '../src/sop/workflows/weekly-maintenance.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dataFileIdx = args.indexOf('--data-file');
const dataFile = dataFileIdx !== -1 ? args[dataFileIdx + 1] : null;

if (!dataFile) {
  console.error(
    '\nUsage: npm run weekly-maintenance -- --data-file <path> [--dry-run]\n\n' +
    'Data file must be JSON with shape:\n' +
    '  { searchTermRows, keywordMetrics, adSpend, adRevenue, totalRevenue }\n\n' +
    'Download the Search Term Report and Keyword Report from Amazon Ads console,\n' +
    'then parse them into the required JSON shape.\n',
  );
  process.exit(1);
}

let data: Omit<WeeklyMaintenanceInput, 'dryRun'>;
try {
  data = JSON.parse(readFileSync(dataFile, 'utf-8'));
} catch (err) {
  console.error(`Failed to read data file: ${dataFile}\n${err}`);
  process.exit(1);
}

const result = runWeeklyMaintenance({ ...data, dryRun });

// Exit with non-zero if there are critical action items
const hasCritical = result.actionItems.some(a => a.priority === 'critical');
process.exit(hasCritical ? 2 : 0);
