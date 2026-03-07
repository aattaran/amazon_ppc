/**
 * Entry Point: Optimize Phase
 * Runs bid optimization, negative keyword harvest, and placement modifier review.
 *
 * Usage:
 *   npm run optimize -- --data-file <path> [--dry-run]
 *
 * Data file format (JSON):
 *   {
 *     searchTermRows: [...],
 *     keywordMetrics: [...],
 *     placementMetrics: [...]   // optional — skip placement review if omitted
 *   }
 */

import { readFileSync } from 'fs';
import { runOptimizePhase, OptimizeInput } from '../src/sop/phases/optimize.js';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const dataFileIdx = args.indexOf('--data-file');
const dataFile = dataFileIdx !== -1 ? args[dataFileIdx + 1] : null;

if (!dataFile) {
  console.error(
    '\nUsage: npm run optimize -- --data-file <path> [--dry-run]\n\n' +
    'Data file must be JSON with shape:\n' +
    '  { searchTermRows, keywordMetrics, placementMetrics? }\n',
  );
  process.exit(1);
}

let data: Omit<OptimizeInput, 'dryRun'>;
try {
  data = JSON.parse(readFileSync(dataFile, 'utf-8'));
} catch (err) {
  console.error(`Failed to read data file: ${dataFile}\n${err}`);
  process.exit(1);
}

runOptimizePhase({ ...data, placementMetrics: data.placementMetrics ?? [], dryRun });
