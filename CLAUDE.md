# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Run TypeScript dev server with hot reload (ts-node-dev)
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled dist/index.js
npm test           # Run Jest tests
npm run lint       # ESLint on src/**/*.ts
```

Most scripts are standalone and run directly:

```bash
node detect-bleeders-daily.js          # Daily ACOS monitoring + bleeder flagging
node analyze-campaigns.js              # Analyze campaigns from bulk export XLSX
node generate-conservative-bulksheet.js # Generate Amazon-compatible XLSX for upload
node sync-now.js                       # Trigger Titan -> Google Sheets sync
node get-refresh-token.js              # Acquire Amazon LWA OAuth refresh token
```

## Architecture

This is a **mixed JS/TypeScript** codebase. Root-level `*.js` scripts are standalone one-off analysis tools. Structured source code lives in `src/`.

### Core Systems

**`src/titan/`** - The primary keyword intelligence pipeline (all JS):
- `api/amazon-v3-client.js` - Amazon Ads API v3 client (SP campaigns, keywords, reporting). Uses v3-only endpoints and accept headers.
- `auth/token-manager.js` - LWA OAuth token manager with auto-refresh
- `database/keywords-db.js` - better-sqlite3 database at `./data/titan-keywords.db` storing keywords with scores, tiers, bids, and approval status
- `scoring/opportunity-scorer.js` - 5-dimension keyword scorer (0-100): search volume, competition, rank gap, intent signal, cost efficiency
- `scoring/tier-classifier.js` - Classifies scored keywords into tiers (TIER_1 through TIER_4)
- `services/dataforseo-client.js` - DataForSEO API for keyword enrichment
- `services/keyword-enricher.js` - Merges Amazon data + DataForSEO data
- `merge/data-merger.js` - Merges Brand Analytics CSV data with API data
- `sync/sync-coordinator.js` - Orchestrates bidirectional sync between SQLite DB and Google Sheets
- `sync/sheets-push.js` / `sync/sheets-pull.js` - Google Sheets read/write via googleapis
- `sync/atomic-writer.js` - Atomic file writes for safe data persistence
- `brand-analytics/csv-parser.js` - Parses Amazon Brand Analytics / SQP CSV exports

**`src/detectors/bleeder-detector.ts`** - Campaign bleeder detection: scores campaigns 0-100 on ACOS, ROAS, CTR, CVR, CPC. Severity levels: CRITICAL / HIGH / MEDIUM / HEALTHY. Thresholds are env-configurable.

**`src/services/amazon-ads-api.client.ts`** - TypeScript Amazon Ads API client (alternative to titan's JS client).

**`src/auth/amazon-oauth.service.ts`** - TypeScript OAuth service.

**`src/reviews/`** - Review request automation:
- `orders-fetcher.js` - Fetches orders via Amazon SP-API
- `review-request-service.js` - Sends review requests
- `database/review-database.js` - Tracks which orders have received review requests

**`src/analysis/smart-segmenter.js`** - Segments products by performance metrics.

### Data Flow

```
Amazon Ads API (v3) ---> Titan DB (SQLite) ---> Google Sheets (approve/deny)
Brand Analytics CSV ---> data-merger      ---> Titan DB
DataForSEO API      ---> keyword-enricher ---> Titan DB
```

The Search Term Intelligence pipeline has an approve/deny workflow: keywords are pushed to Google Sheets where humans review them, then approved keywords are pulled back and applied to campaigns.

### Key Files & Data

- **`data/titan-keywords.db`** - SQLite keyword database (better-sqlite3)
- **`data/products/products.json`** - Product definitions
- **`data/processed/`** - Cached metrics and segment data
- **`scripts-config.json`** - Script configuration
- **`.env`** - All credentials (never committed)

### Environment Variables

Required in `.env`:

```
AMAZON_CLIENT_ID
AMAZON_CLIENT_SECRET
AMAZON_REFRESH_TOKEN
AMAZON_PROFILE_ID
PRODUCT_ASIN=B0DTDZFMY7
CRITICAL_ACOS_THRESHOLD=100
WARNING_ACOS_THRESHOLD=50
TARGET_ACOS=30
```

Google Sheets integration uses `GOOGLE_SHEETS_SPREADSHEET_ID` and a service account credentials file.

### Amazon Ads API Notes

- **Always use v3 endpoints** - The codebase explicitly avoids v2. Endpoints are `/sp/campaigns/list`, `/sp/keywords/list`, etc. (POST with body, not GET).
- **Accept headers are required** - e.g. `application/vnd.spCampaign.v3+json`
- **Reports are gzipped** - Must call `response.getBlob().setContentType('application/x-gzip')` before ungzipping (known gotcha when using Google Apps Script).
- **Reporting is async** - Request report, poll until COMPLETED, then download gzipped JSON.

### Google Sheets Integration

The spreadsheet (`1zvQmjLxPLg-F_og7Ci1war5xaBpDeYMSoo65bVTrKHc`) has two tabs:
- `PPC Campaigns` - header row 10, data from row 11
- `Keyword Performance` - header row 1, data from row 2

There is also a Google Apps Script project (`Code.gs`) bound to this spreadsheet that runs the two-phase async reporting pipeline.
