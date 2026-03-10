# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server with hot reload (ts-node-dev, port 3001)
npm run build        # Compile TS to dist/ + postbuild copies schema.sql and src/titan/ to dist/
npm start            # Run compiled dist/server.js
npm test             # Run Jest tests
npm run lint         # ESLint on src/**/*.ts
npm run server       # Run server via ts-node (no hot reload)
```

### SOP workflow scripts (ts-node --esm)

```bash
npm run launch-setup       # scripts/launch-setup.ts — initial campaign setup
npm run optimize           # scripts/optimize.ts — bid optimization pass
npm run scale              # scripts/scale.ts — scale winning campaigns
npm run harvest            # scripts/harvest-search-terms.ts — search term harvesting
npm run tacos-report       # scripts/tacos-report.ts — TACoS reporting
npm run weekly-maintenance # scripts/weekly-maintenance.ts — weekly maintenance tasks
```

### Standalone root-level JS scripts (run directly with `node`)

```bash
node detect-bleeders-daily.js          # Daily ACOS monitoring + bleeder flagging
node analyze-campaigns.js              # Analyze campaigns from bulk export XLSX
node generate-conservative-bulksheet.js # Generate Amazon-compatible XLSX for upload
node sync-now.js                       # Trigger Titan -> Google Sheets sync
node get-refresh-token.js              # Acquire Amazon LWA OAuth refresh token
```

## Architecture

Mixed JS/TypeScript codebase. Root-level `*.js` files are standalone analysis tools. Structured source lives in `src/`. TypeScript compiles to `dist/` via CommonJS (`module: "commonjs"`, target ES2020).

### Express API Server (`src/server.ts`, port 3001)

The main entry point. Bridges the web UI with Amazon Ads API. Exposes endpoints for:
- SOP workflows (bid optimization, search term harvesting, campaign building, TACoS tracking)
- Pending change approval/rejection (`pending_changes` table)
- Job execution history and audit log
- Scheduler trigger endpoints

The server imports Titan JS modules via `require()` and TS SOP modules via `import`.

### Titan Keyword Intelligence (`src/titan/`, all JS)

Primary data pipeline — all plain JavaScript, copied to `dist/titan/` at build time.

- `api/amazon-v3-client.js` — Amazon Ads API v3 client (SP campaigns, keywords, reporting)
- `api/resilient-poller.js` — Resilient async report poller
- `auth/token-manager.js` — LWA OAuth token manager with auto-refresh
- `database/keywords-db.js` — better-sqlite3 DB at `./data/titan-keywords.db`
- `scoring/opportunity-scorer.js` — 5-dimension keyword scorer (0-100)
- `scoring/tier-classifier.js` — Classifies keywords into tiers (TIER_1–TIER_4)
- `services/dataforseo-client.js` — DataForSEO API for keyword enrichment
- `merge/data-merger.js` — Merges Brand Analytics CSV data with API data
- `sync/sync-coordinator.js` — Bidirectional sync between SQLite DB and Google Sheets
- `sync/sheets-push.js` / `sheets-pull.js` — Google Sheets read/write via googleapis

### SOP Automation System (`src/sop/`)

Rule-based PPC optimization engine with phased workflows:

- `automation-rules.ts` — Rule definitions (R01–R12+) for bid/budget/keyword actions
- `phases/launch.ts`, `phases/optimize.ts`, `phases/scale.ts` — Lifecycle phases
- `workflows/bid-optimizer.ts` — Automated bid adjustments
- `workflows/campaign-builder.ts` — Campaign creation from templates
- `workflows/search-term-harvest.ts` — Convert search terms to keywords/negatives
- `workflows/tacos-tracker.ts` — Total ACOS tracking
- `workflows/weekly-maintenance.ts` — Scheduled maintenance tasks

Changes can be auto-applied or queued for human approval (controlled by `AUTO_APPLY` env var). The `pending_changes` PostgreSQL table holds queued changes.

### Database Layer (`src/database/`)

- `db.ts` — PostgreSQL connection pool (`DATABASE_URL` env var, falls back to error if unset)
- `schema.sql` — Tables: `job_runs`, `audit_log`, `pending_changes`
- The Titan subsystem uses a separate **SQLite** database (`data/titan-keywords.db` via better-sqlite3)

### Bleeder Detection (`src/detectors/bleeder-detector.ts`)

Scores campaigns 0-100 on ACOS, ROAS, CTR, CVR, CPC. Severity: CRITICAL / HIGH / MEDIUM / HEALTHY. Thresholds are env-configurable.

### Data Flow

```
Amazon Ads API (v3) ---> Titan DB (SQLite) ---> Google Sheets (approve/deny)
Brand Analytics CSV ---> data-merger        ---> Titan DB
DataForSEO API      ---> keyword-enricher   ---> Titan DB
SOP workflows       ---> PostgreSQL audit_log + pending_changes
```

The keyword pipeline has an approve/deny workflow: keywords push to Google Sheets for human review, approved keywords pull back for campaign application.

## Deployment

- **Docker**: `docker-compose.yml` runs app + PostgreSQL 16 + Redis 7
- **Railway**: `nixpacks.toml` configured for Railway deployment (build → prune → `node dist/server.js`)
- App port: 3001 (`PORT` env var)
- Node.js >= 20 required

## Amazon Ads API Notes

- **Always use v3 endpoints** — The codebase explicitly avoids v2. Endpoints: `/sp/campaigns/list`, `/sp/keywords/list`, etc. (POST with body, not GET).
- **Accept headers required** — e.g. `application/vnd.spCampaign.v3+json`
- **Reporting is async** — Request report → poll until COMPLETED → download gzipped JSON
- **Reports are gzipped** — Must handle `application/x-gzip` content type

## Environment Variables

Required in `.env` (see `.env.example`):

```
AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_REFRESH_TOKEN, AMAZON_PROFILE_ID
PRODUCT_ASIN=B0DTDZFMY7
DATABASE_URL=postgresql://...      # PostgreSQL connection
REDIS_URL=redis://...              # Redis for Bull queues
CRITICAL_ACOS_THRESHOLD=100
WARNING_ACOS_THRESHOLD=50
TARGET_ACOS=30
```

Google Sheets integration: `GOOGLE_SHEETS_SPREADSHEET_ID` + service account credentials file.

## Google Sheets Integration

Spreadsheet has two tabs:
- `PPC Campaigns` — header row 10, data from row 11
- `Keyword Performance` — header row 1, data from row 2

`Code.gs` (root) is a Google Apps Script project bound to the spreadsheet running the two-phase async reporting pipeline.
