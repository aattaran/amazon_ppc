/**
 * PPC SOP — Express API Server
 * Bridges the static web UI with the Amazon Ads API.
 * Run: npm run server
 * Port: 3001 (configurable via PORT env var)
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// JS modules (available via CJS require)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TokenManager    = require('./titan/auth/token-manager.js');
const AmazonV3Client  = require('./titan/api/amazon-v3-client.js');
const ResilientPoller = require('./titan/api/resilient-poller.js');

// SOP workflow functions
import { optimizeBids }        from './sop/workflows/bid-optimizer';
import { harvestSearchTerms }  from './sop/workflows/search-term-harvest';
import { buildLaunchCampaigns } from './sop/workflows/campaign-builder';
import { computeTacos }        from './sop/workflows/tacos-tracker';

// Database + Scheduler
import { initDatabase, getPendingChanges, approveChange, rejectChange, approveAllPending, getAuditLog, getJobRuns } from './database/db';
import { initScheduler, triggerJob } from './scheduler';

// ── Init Amazon client ────────────────────────────────────────
const tokenManager = new TokenManager({
  refreshToken: process.env.AMAZON_REFRESH_TOKEN,
  clientId:     process.env.AMAZON_CLIENT_ID,
  clientSecret: process.env.AMAZON_CLIENT_SECRET,
});

const amazonClient = new AmazonV3Client(tokenManager, {
  apiUrl:    'https://advertising-api.amazon.com',
  clientId:  process.env.AMAZON_CLIENT_ID,
  profileId: process.env.AMAZON_PROFILE_ID,
});

// ── App ───────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Async handler wrapper
const wrap = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, profileId: process.env.AMAZON_PROFILE_ID });
});

// ── GET /api/campaigns ────────────────────────────────────────
app.get('/api/campaigns', wrap(async (_req, res) => {
  const campaigns = await amazonClient.fetchCampaigns({ include: ['ENABLED', 'PAUSED'] });
  res.json({ campaigns });
}));

// ── GET /api/keywords ─────────────────────────────────────────
app.get('/api/keywords', wrap(async (_req, res) => {
  const keywords = await amazonClient.fetchKeywords({ include: ['ENABLED', 'PAUSED'] });
  res.json({ keywords });
}));

// ── GET /api/str-report ───────────────────────────────────────
// Fetches the Search Term Report, classifies terms, returns harvest result
app.get('/api/str-report', wrap(async (req, res) => {
  const lookbackDays = Number(req.query.days) || 30;
  const rows = await amazonClient.fetchSTRReport(lookbackDays);
  const result = harvestSearchTerms(rows);
  res.json({ rows, result });
}));

// ── GET /api/metrics ──────────────────────────────────────────
// Returns TACOS snapshot from the keyword report data
app.get('/api/metrics', wrap(async (req, res) => {
  const lookbackDays = Number(req.query.days) || 30;
  const kwRows = await amazonClient.fetchKeywordReport(lookbackDays);
  const adSpend   = kwRows.reduce((s: number, r: any) => s + (r.spend   || 0), 0);
  const adRevenue = kwRows.reduce((s: number, r: any) => s + (r.sales   || 0), 0);
  // totalRevenue = adRevenue if organic data unavailable
  const snapshot  = computeTacos(adSpend, adRevenue, adRevenue);
  res.json({ snapshot, adSpend, adRevenue, totalRevenue: adRevenue });
}));

// ── POST /api/bids/preview ────────────────────────────────────
// Runs the bid optimizer decision tree (dry-run, no API write)
app.post('/api/bids/preview', wrap(async (req, res) => {
  const { keywords } = req.body as { keywords: any[] };
  if (!Array.isArray(keywords) || keywords.length === 0) {
    res.status(400).json({ error: 'keywords array required' });
    return;
  }
  // Normalize Amazon API shape → KeywordMetrics shape
  const normalized = keywords.map((kw: any) => ({
    keywordId:    kw.keywordId   ?? kw.id ?? '',
    keyword:      kw.keyword     ?? kw.keywordText ?? '',
    matchType:    kw.matchType   ?? 'EXACT',
    campaignId:   kw.campaignId  ?? '',
    campaignName: kw.campaignName ?? '',
    impressions:  kw.impressions  ?? 0,
    clicks:       kw.clicks       ?? 0,
    spend:        kw.spend        ?? kw.cost        ?? 0,
    sales:        kw.sales        ?? kw.sales14d    ?? 0,
    orders:       kw.orders       ?? kw.purchases14d ?? 0,
    currentBid:   kw.currentBid   ?? kw.bid?.value  ?? 0,
  }));
  const { decisions, summary } = optimizeBids(normalized);
  res.json({ decisions, summary });
}));

// ── POST /api/bids/apply ──────────────────────────────────────
// Applies bid changes to Amazon (or dry-runs)
app.post('/api/bids/apply', wrap(async (req, res) => {
  const { updates, dryRun = true } = req.body as {
    updates: { keywordId: string; newBid: number }[];
    dryRun: boolean;
  };
  if (!Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ error: 'updates array required' });
    return;
  }
  const payload = updates.map(u => ({ keywordId: u.keywordId, bid: u.newBid }));
  if (dryRun) {
    res.json({ dryRun: true, wouldApply: payload, count: payload.length });
    return;
  }
  const results = await amazonClient.updateKeywordBids(payload);
  res.json({ dryRun: false, results, count: results.length });
}));

// ── POST /api/negatives/apply ─────────────────────────────────
// Creates negative keywords in Amazon (or dry-runs)
app.post('/api/negatives/apply', wrap(async (req, res) => {
  const { negatives, dryRun = true } = req.body as {
    negatives: { campaignId: string; adGroupId: string; keywordText: string; matchType: string }[];
    dryRun: boolean;
  };
  if (!Array.isArray(negatives) || negatives.length === 0) {
    res.status(400).json({ error: 'negatives array required' });
    return;
  }
  if (dryRun) {
    res.json({ dryRun: true, wouldApply: negatives, count: negatives.length });
    return;
  }
  const results = await amazonClient.createNegativeKeywords(negatives);
  res.json({ dryRun: false, results, count: results.length });
}));

// ── POST /api/campaigns/create ────────────────────────────────
// Creates the 6 SOP campaigns (or dry-runs)
app.post('/api/campaigns/create', wrap(async (req, res) => {
  const { productName, dailyBudget, targetKeywords = [], competitorAsins = [],
          brandKeywords = [], skcKeyword, dryRun = true } = req.body;

  const specs = buildLaunchCampaigns({
    productName, dailyBudget, targetKeywords, competitorAsins, brandKeywords, skcKeyword,
  });

  if (dryRun) {
    res.json({ dryRun: true, campaigns: specs, count: specs.length });
    return;
  }
  const results = await amazonClient.createCampaigns(specs);
  res.json({ dryRun: false, results, count: results.length });
}));

// ── Serve static web UI ───────────────────────────────────────
import path from 'path';
app.use(express.static(path.join(__dirname, '..', 'web')));
app.use('/docs', express.static(path.join(__dirname, '..', 'docs')));

// ── GET /api/pending — list pending changes ───────────────────
app.get('/api/pending', wrap(async (_req, res) => {
  const changes = await getPendingChanges();
  res.json({ changes });
}));

// ── POST /api/pending/approve-all ─────────────────────────────
// Must be registered BEFORE /:id routes to prevent Express matching 'approve-all' as an id
app.post('/api/pending/approve-all', wrap(async (_req, res) => {
  const count = await approveAllPending();
  res.json({ ok: true, approved: count });
}));

// ── POST /api/pending/:id/approve ─────────────────────────────
app.post('/api/pending/:id/approve', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const change = await approveChange(id);
  if (!change) { res.status(404).json({ error: 'Not found' }); return; }

  // Dispatch to Amazon based on stored action
  try {
    const { action, entity_type, entity_id, new_value } = change;
    if (action === 'raise_bid' || action === 'lower_bid') {
      await amazonClient.updateKeywordBids([{ keywordId: entity_id, bid: Number(new_value) }]);
    } else if (action === 'negate' && entity_id) {
      // entity_id holds the campaignId for keyword-level negatives
      await amazonClient.createNegativeKeywords([{
        campaignId: entity_id,
        keywordText: change.entity_name,
        matchType: 'NEGATIVE_EXACT',
        state: 'ENABLED',
      }]);
    }
    // informational-only actions (phase_suggestion, tacos_alert, isolate_skc) need no API call
  } catch (applyErr: any) {
    console.error(`Failed to apply change #${id} to Amazon:`, applyErr.message);
    res.status(502).json({ error: `Approved locally but Amazon API failed: ${applyErr.message}` });
    return;
  }

  res.json({ ok: true, change });
}));

// ── POST /api/pending/:id/reject ──────────────────────────────
app.post('/api/pending/:id/reject', wrap(async (req, res) => {
  const change = await rejectChange(Number(req.params.id));
  if (!change) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ ok: true, change });
}));

// ── GET /api/audit-log ────────────────────────────────────────
app.get('/api/audit-log', wrap(async (req, res) => {
  const limit  = Number(req.query.limit)  || 100;
  const offset = Number(req.query.offset) || 0;
  const entries = await getAuditLog(limit, offset);
  res.json({ entries });
}));

// ── GET /api/jobs — job run history ───────────────────────────
app.get('/api/jobs', wrap(async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const runs = await getJobRuns(limit);
  res.json({ runs });
}));

// ── POST /api/jobs/:name/run — manually trigger a job ─────────
app.post('/api/jobs/:name/run', wrap(async (req, res) => {
  const jobName = req.params.name;
  // Run in background so the API responds immediately
  triggerJob(jobName).catch(err => console.error(`Job ${jobName} error:`, err.message));
  res.json({ ok: true, message: `Job "${jobName}" started` });
}));

// ── Error handler ─────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err.message);
  res.status(500).json({ error: err.message });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001;

async function start() {
  // Initialize database (create tables if they don't exist)
  if (process.env.DATABASE_URL) {
    try {
      await initDatabase();
      console.log('PostgreSQL connected');
    } catch (err: any) {
      console.warn('Database init skipped:', err.message);
    }
  } else {
    console.warn('DATABASE_URL not set — audit log and scheduler disabled');
  }

  // Start cron scheduler
  if (process.env.DATABASE_URL) {
    initScheduler(amazonClient);
  }

  app.listen(PORT, () => {
    console.log(`PPC SOP Server running on http://localhost:${PORT}`);
    console.log(`Profile ID: ${process.env.AMAZON_PROFILE_ID}`);
    console.log(`AUTO_APPLY: ${process.env.AUTO_APPLY === 'true' ? 'ON — changes push to Amazon' : 'OFF — changes queued for approval'}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
