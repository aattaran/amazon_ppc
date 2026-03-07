/**
 * Entry Point: TACOS Report
 * Prints current TACOS, ACOS, ad dependency, and suggested PPC phase.
 *
 * Usage:
 *   npm run tacos-report -- --spend <n> --ad-revenue <n> --total-revenue <n>
 *   npm run tacos-report -- --data-file <path>
 *
 * Data file format (JSON):
 *   { adSpend: number, adRevenue: number, totalRevenue: number }
 *
 * If totalRevenue is unknown (no organic tracking), pass the same value as adRevenue.
 */

import { readFileSync } from 'fs';
import { computeTacos, printTacosReport } from '../src/sop/workflows/tacos-tracker.js';

const args = process.argv.slice(2);

function argVal(flag: string): string | null {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] ?? null : null;
}

const dataFile = argVal('--data-file');
let adSpend: number, adRevenue: number, totalRevenue: number;

if (dataFile) {
  try {
    const data = JSON.parse(readFileSync(dataFile, 'utf-8'));
    adSpend      = Number(data.adSpend);
    adRevenue    = Number(data.adRevenue);
    totalRevenue = Number(data.totalRevenue ?? data.adRevenue);
  } catch (err) {
    console.error(`Failed to read data file: ${dataFile}\n${err}`);
    process.exit(1);
  }
} else {
  const spendArg   = argVal('--spend');
  const adRevArg   = argVal('--ad-revenue');
  const totalRevArg = argVal('--total-revenue');

  if (!spendArg || !adRevArg) {
    console.error(
      '\nUsage:\n' +
      '  npm run tacos-report -- --spend <n> --ad-revenue <n> --total-revenue <n>\n' +
      '  npm run tacos-report -- --data-file <path>\n\n' +
      'If --total-revenue is omitted, assumes 100% ad-attributed revenue (no organic).\n',
    );
    process.exit(1);
  }

  adSpend      = parseFloat(spendArg);
  adRevenue    = parseFloat(adRevArg);
  totalRevenue = totalRevArg ? parseFloat(totalRevArg) : adRevenue;
}

const snap = computeTacos(adSpend, adRevenue, totalRevenue);
printTacosReport(snap);

// Exit code 2 = critical, 1 = above-target, 0 = on-track
const exitMap = { 'on-track': 0, 'above-target': 1, 'critical': 2 } as const;
process.exit(exitMap[snap.tacosStatus]);
