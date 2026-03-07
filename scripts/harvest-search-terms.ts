/**
 * Entry Point: Harvest Search Terms
 * Classifies STR rows as winners/bleeders and prints negative keyword recommendations.
 *
 * Usage:
 *   npm run harvest -- --data-file <path>
 *
 * Data file format (JSON):
 *   Array of SearchTermRow objects from the Amazon Search Term Report.
 *
 * Download the Search Term Report from:
 *   Amazon Ads Console → Reports → Search Term Report → Download CSV
 *   Then parse the CSV into the required JSON shape.
 */

import { readFileSync } from 'fs';
import {
  harvestSearchTerms,
  printHarvestReport,
  SearchTermRow,
} from '../src/sop/workflows/search-term-harvest.js';

const args = process.argv.slice(2);
const dataFileIdx = args.indexOf('--data-file');
const dataFile = dataFileIdx !== -1 ? args[dataFileIdx + 1] : null;

if (!dataFile) {
  console.error(
    '\nUsage: npm run harvest -- --data-file <path>\n\n' +
    'Data file must be a JSON array of SearchTermRow objects:\n' +
    '  [ { campaignId, campaignName, adGroupId, adGroupName, targetingType,\n' +
    '      matchType, searchTerm, impressions, clicks, spend, sales, orders }, ... ]\n',
  );
  process.exit(1);
}

let rows: SearchTermRow[];
try {
  rows = JSON.parse(readFileSync(dataFile, 'utf-8'));
} catch (err) {
  console.error(`Failed to read data file: ${dataFile}\n${err}`);
  process.exit(1);
}

const result = harvestSearchTerms(rows);
printHarvestReport(result);

// Print machine-readable negative list for scripting
if (result.negativeRecommendations.length > 0) {
  console.log('NEGATIVES_JSON=' + JSON.stringify(
    result.negativeRecommendations.map(n => ({
      searchTerm: n.searchTerm,
      campaignId: n.campaignId,
      matchType: n.matchType,
    })),
  ));
}
