# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server with hot reload (ts-node-dev, port 3001)
npm run build        # Compile TS to dist/ + postbuild copies schema.sql and src/titan/ to dist/
npm start            # Run compiled dist/server.js
npm test             # Jest (no config or test files yet)
npm run lint         # ESLint on src/**/*.ts

# Single test / pattern
npx jest path/to/test.ts
npx jest -t "pattern"
```

SOP workflow scripts: `npm run launch-setup`, `optimize`, `scale`, `harvest`, `tacos-report`, `weekly-maintenance` (all run via `ts-node --esm scripts/<name>.ts`).

Root-level `*.js` files are standalone analysis tools run with `node` (e.g., `node bulk-bid-reduce.js`, `node detect-bleeders-daily.js`).

## Architecture

Mixed JS/TypeScript. Structured source in `src/`, standalone analysis scripts at root. TypeScript compiles to `dist/` via CommonJS (target ES2020). Node.js >= 20 required.

### Key Subsystems

- **Express API** (`src/server.ts`, port 3001) — Bridges web UI with Amazon Ads API. Read endpoints for campaigns/keywords/reports, write endpoints for bids/negatives/campaigns (all writes support `dryRun: true`). Imports Titan JS via `require()` and SOP TS via `import`.
- **Titan** (`src/titan/`, all plain JS) — Keyword intelligence pipeline: Amazon v3 API client, SQLite DB (`data/titan-keywords.db` via better-sqlite3), keyword scoring/tiering, DataForSEO enrichment, bidirectional Google Sheets sync. Copied verbatim to `dist/titan/` at build time.
- **SOP** (`src/sop/`, TypeScript) — Rule-based optimization engine (rules R01–R12+) with phased workflows: bid optimizer, campaign builder, search term harvester, TACoS tracker, weekly maintenance.
- **Scheduler** (`src/scheduler/index.ts`) — Cron jobs enabled via env flags (`ENABLE_BID_OPTIMIZER`, `ENABLE_HARVEST`, `ENABLE_TACOS`, `ENABLE_WEEKLY`, `ENABLE_SKC_REVIEW`). Changes auto-applied or queued for human approval (`AUTO_APPLY` env var → `pending_changes` table).
- **Web UI** (`web/`) — Plain HTML/JS/CSS 7-tab SPA. `config.js` stores API base URL in localStorage (default `http://localhost:3001`).
- **Code.gs** (root) — Google Apps Script (NOT Node.js). Bound to PPC spreadsheet, runs two-phase async reporting pipeline.

### Dual Databases

- **PostgreSQL** — SOP audit log, pending changes, job runs (`src/database/schema.sql`)
- **SQLite** — Titan keyword intelligence (`data/titan-keywords.db`)

### Data Flow

```
Amazon Ads API (v3) ---> Titan DB (SQLite) ---> Google Sheets (approve/deny)
Brand Analytics CSV ---> data-merger        ---> Titan DB
DataForSEO API      ---> keyword-enricher   ---> Titan DB
SOP workflows       ---> PostgreSQL audit_log + pending_changes
```

Keywords push to Google Sheets for human review, approved keywords pull back for campaign application.

### Other Notable Areas

- `src/data/`, `src/reviews/` — Plain JS (not TypeScript)
- `src/detectors/bleeder-detector.ts` — Scores campaigns 0-100 on ACOS/ROAS/CTR/CVR/CPC
- `listings/` — Product listing plans per product (DBH, NMNH, ARK, H2 Tablet)
- `docs/` — SOP flow diagrams (HTML/PDF/PNG), dayparting CSVs

### Google Sheets Integration

Spreadsheet tabs: `PPC Campaigns` (header row 10, data from row 11), `Keyword Performance` (header row 1, data from row 2).

## Critical Gotchas

- **Amazon Ads API is v3 ONLY** — All list endpoints use POST with body, not GET. Accept headers required (e.g. `application/vnd.spCampaign.v3+json`).
- **Bid format** — Keyword bid updates use a plain float (`bid: 0.49`), NOT `{ value, currencyCode }`.
- **Reports are async + gzipped** — Request → poll until COMPLETED → download gzipped JSON.
- **No promotion creation API** — Only performance reports available. Create promotions manually in Seller Central.
- **Do NOT move winning keywords** between campaigns. Negate bleeders in source campaign instead.

## Deployment

- **Docker**: `docker-compose.yml` — app + PostgreSQL 16 + Redis 7
- **Railway**: `nixpacks.toml` — build → prune → `node dist/server.js`
- Port 3001 (`PORT` env var)

## Environment Variables

Required in `.env` (see `.env.example`):

```
AMAZON_CLIENT_ID, AMAZON_CLIENT_SECRET, AMAZON_REFRESH_TOKEN, AMAZON_PROFILE_ID
PRODUCT_ASIN=B0DTDZFMY7
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
TARGET_ACOS=30
GOOGLE_SHEETS_SPREADSHEET_ID=...  # + service account credentials file
```
