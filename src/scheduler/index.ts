/**
 * Scheduler — Cron-based automation for SOP rules.
 * Each job fetches live data from Amazon, runs the SOP decision logic,
 * and either auto-applies or queues changes for approval.
 *
 * Schedules:
 *   Daily  6:00 AM — Bleeder detection
 *   Daily  8:00 AM — Bid optimization + Search term harvest
 *   Daily  9:00 AM — TACOS check
 *   Monday 6:00 AM — Full weekly maintenance
 */

import cron from 'node-cron';
import { runJob, ChangeRequest } from './job-runner';
import { optimizeBids } from '../sop/workflows/bid-optimizer';
import { harvestSearchTerms } from '../sop/workflows/search-term-harvest';
import { computeTacos } from '../sop/workflows/tacos-tracker';
import { SOP_CONFIG } from '../config/sop.config';

// Amazon client is injected from server.ts to share the same token/instance
let amazonClient: any = null;

export function initScheduler(client: any): void {
  amazonClient = client;

  const enabled = (key: string) => process.env[key] !== 'false';

  // ── Daily 6:00 AM — Bleeder Detection ───────────────────────────────────
  if (enabled('ENABLE_DAILY_BLEEDERS')) {
    cron.schedule('0 6 * * *', () => {
      console.log('\n⏰ [CRON] Running bleeder detection...');
      runBidOptimizationJob().catch(console.error);
    }, { timezone: 'America/New_York' });
    console.log('  Scheduled: Daily bleeder detection at 6:00 AM ET');
  }

  // ── Daily 8:00 AM — Bid Optimization ────────────────────────────────────
  if (enabled('ENABLE_DAILY_BIDS')) {
    cron.schedule('0 8 * * *', () => {
      console.log('\n⏰ [CRON] Running bid optimization...');
      runBidOptimizationJob().catch(console.error);
    }, { timezone: 'America/New_York' });
    console.log('  Scheduled: Daily bid optimization at 8:00 AM ET');
  }

  // ── Daily 8:30 AM — Search Term Harvest ─────────────────────────────────
  if (enabled('ENABLE_DAILY_STR')) {
    cron.schedule('30 8 * * *', () => {
      console.log('\n⏰ [CRON] Running search term harvest...');
      runSearchTermHarvestJob().catch(console.error);
    }, { timezone: 'America/New_York' });
    console.log('  Scheduled: Daily STR harvest at 8:30 AM ET');
  }

  // ── Daily 9:00 AM — TACOS Check ────────────────────────────────────────
  if (enabled('ENABLE_DAILY_TACOS')) {
    cron.schedule('0 9 * * *', () => {
      console.log('\n⏰ [CRON] Running TACOS check...');
      runTacosCheckJob().catch(console.error);
    }, { timezone: 'America/New_York' });
    console.log('  Scheduled: Daily TACOS check at 9:00 AM ET');
  }

  // ── Monday 6:00 AM — Full Weekly Maintenance ───────────────────────────
  if (enabled('ENABLE_WEEKLY_MAINTENANCE')) {
    cron.schedule('0 6 * * 1', () => {
      console.log('\n⏰ [CRON] Running full weekly maintenance...');
      runFullWeeklyJob().catch(console.error);
    }, { timezone: 'America/New_York' });
    console.log('  Scheduled: Weekly maintenance on Mondays at 6:00 AM ET');
  }

  console.log('Scheduler initialized\n');
}

// ── Job: Bid Optimization ─────────────────────────────────────────────────

export async function runBidOptimizationJob() {
  return runJob('bid-optimization', async () => {
    // 1. Fetch keyword report from Amazon
    const kwRows = await amazonClient.fetchKeywordReport(SOP_CONFIG.reportLookbackDays);

    // 2. Fetch current keywords to get live bids
    const liveKeywords = await amazonClient.fetchKeywords({ include: ['ENABLED', 'PAUSED'] });
    const bidMap = new Map(liveKeywords.map((k: any) => [k.keywordId, Number(k.bid?.value ?? 0)]));

    // 3. Merge current bids into report data
    const enriched = kwRows.map((r: any) => ({
      ...r,
      currentBid: bidMap.get(r.keywordId) ?? r.currentBid ?? 0,
    }));

    // 4. Run SOP decision tree
    const { decisions } = optimizeBids(enriched);

    // 5. Convert decisions to change requests
    const changes: ChangeRequest[] = [];
    for (const d of decisions) {
      if (d.action.type === 'no_action' || d.action.type === 'needs_data') continue;

      if (d.action.type === 'raise_bid' || d.action.type === 'lower_bid') {
        const act = d.action;  // narrow the union
        const ruleId = act.type === 'raise_bid' ? 'R08' : 'R12';
        changes.push({
          ruleId,
          entityType: 'keyword',
          entityId: d.keyword.keywordId,
          entityName: d.keyword.keyword,
          action: act.type,
          oldValue: String(d.keyword.currentBid),
          newValue: String(act.newBid),
          reason: act.reason,
          apply: async () => {
            await amazonClient.updateKeywordBids([
              { keywordId: d.keyword.keywordId, bid: act.newBid },
            ]);
          },
        });
      }

      if (d.action.type === 'negate') {
        changes.push({
          ruleId: 'R10',
          entityType: 'negative',
          entityId: d.keyword.campaignId,  // campaignId so approve endpoint can dispatch
          entityName: d.keyword.keyword,
          action: 'negate',
          oldValue: null,
          newValue: 'NEGATIVE_EXACT',
          reason: d.action.reason,
          apply: async () => {
            await amazonClient.createNegativeKeywords([{
              campaignId: d.keyword.campaignId,
              keywordText: d.keyword.keyword,
              matchType: 'NEGATIVE_EXACT',
              state: 'ENABLED',
            }]);
          },
        });
      }

      if (d.action.type === 'isolate_skc') {
        changes.push({
          ruleId: 'R14',
          entityType: 'keyword',
          entityId: d.keyword.keywordId,
          entityName: d.keyword.keyword,
          action: 'isolate_skc',
          oldValue: d.keyword.campaignName,
          newValue: 'SKC campaign',
          reason: d.action.reason,
          apply: null, // SKC creation needs manual review
        });
      }
    }

    return changes;
  });
}

// ── Job: Search Term Harvest ──────────────────────────────────────────────

export async function runSearchTermHarvestJob() {
  return runJob('search-term-harvest', async () => {
    // 1. Fetch STR from Amazon
    const rows = await amazonClient.fetchSTRReport(SOP_CONFIG.reportLookbackDays);

    // 2. Classify terms
    const result = harvestSearchTerms(rows);

    // 3. Convert to change requests
    const changes: ChangeRequest[] = [];

    // Negatives (R16/R17)
    for (const neg of result.negativeRecommendations) {
      changes.push({
        ruleId: neg.reason.includes('ACOS') ? 'R17' : 'R16',
        entityType: 'negative',
        entityId: neg.campaignId,  // stored so approve endpoint can dispatch
        entityName: neg.searchTerm,
        action: 'negate',
        oldValue: `spend=$${neg.wastedSpend.toFixed(2)}`,
        newValue: 'NEGATIVE_EXACT',
        reason: neg.reason,
        apply: async () => {
          await amazonClient.createNegativeKeywords([{
            campaignId: neg.campaignId,
            keywordText: neg.searchTerm,
            matchType: 'NEGATIVE_EXACT',
            state: 'ENABLED',
          }]);
        },
      });
    }

    // SKC candidates (R14) — informational, needs manual setup
    for (const winner of result.skcCandidates) {
      changes.push({
        ruleId: 'R14',
        entityType: 'keyword',
        entityId: '',
        entityName: winner.searchTerm,
        action: 'promote_to_skc',
        oldValue: winner.campaignName,
        newValue: 'SKC campaign',
        reason: `Winner: ${winner.orders} orders, ACOS ${((winner.acos ?? 0) * 100).toFixed(1)}%`,
        apply: null,
      });
    }

    return changes;
  });
}

// ── Job: TACOS Check ──────────────────────────────────────────────────────

export async function runTacosCheckJob() {
  return runJob('tacos-check', async () => {
    const kwRows = await amazonClient.fetchKeywordReport(SOP_CONFIG.reportLookbackDays);
    const adSpend   = kwRows.reduce((s: number, r: any) => s + (r.spend   || 0), 0);
    const adRevenue = kwRows.reduce((s: number, r: any) => s + (r.sales   || 0), 0);
    const snapshot  = computeTacos(adSpend, adRevenue, adRevenue);

    const changes: ChangeRequest[] = [];

    // R25-R29: TACOS phase alerts (informational)
    if (snapshot.tacosStatus === 'critical') {
      changes.push({
        ruleId: 'R28',
        entityType: 'campaign',
        entityId: '',
        entityName: 'ALL',
        action: 'tacos_alert',
        oldValue: `${(snapshot.tacos * 100).toFixed(1)}%`,
        newValue: 'CRITICAL — pause scaling',
        reason: `TACOS at ${(snapshot.tacos * 100).toFixed(1)}% is critical. Pause scaling, return to optimize phase.`,
        apply: null,
      });
    }

    if (snapshot.suggestedPhase !== SOP_CONFIG.currentPhase) {
      changes.push({
        ruleId: 'R25',
        entityType: 'campaign',
        entityId: '',
        entityName: 'PPC_PHASE',
        action: 'phase_suggestion',
        oldValue: SOP_CONFIG.currentPhase,
        newValue: snapshot.suggestedPhase,
        reason: `TACOS data suggests phase "${snapshot.suggestedPhase}" but current is "${SOP_CONFIG.currentPhase}"`,
        apply: null,
      });
    }

    return changes;
  });
}

// ── Job: Full Weekly Maintenance ──────────────────────────────────────────

export async function runFullWeeklyJob() {
  console.log('Running full weekly maintenance (3 jobs in sequence)...');
  await runSearchTermHarvestJob();
  await runBidOptimizationJob();
  await runTacosCheckJob();
  console.log('Weekly maintenance complete.');
}

/** Manually trigger a job by name */
export async function triggerJob(jobName: string) {
  switch (jobName) {
    case 'bid-optimization': return runBidOptimizationJob();
    case 'search-term-harvest': return runSearchTermHarvestJob();
    case 'tacos-check': return runTacosCheckJob();
    case 'weekly-maintenance': return runFullWeeklyJob();
    default: throw new Error(`Unknown job: ${jobName}`);
  }
}
