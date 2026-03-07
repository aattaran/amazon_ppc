# Railway Deployment Context — Hand-off to Claude Code

## What was built this session

We converted a read-only PPC dashboard into a **fully automated PPC management platform** that pushes changes to Amazon Ads API on scheduled cron jobs. Everything is committed and pushed to `main` on GitHub (`aattaran/amazon_ppc`).

### New files created:
- `src/database/schema.sql` — PostgreSQL schema (audit_log, pending_changes, job_runs)
- `src/database/db.ts` — PostgreSQL connection pool + CRUD helpers
- `src/scheduler/index.ts` — Cron scheduler (daily bids 8am, STR harvest 8:30am, TACOS 9am, weekly Monday 6am)
- `src/scheduler/job-runner.ts` — Job wrapper with audit logging, bid cooldown (7-day), auto-apply vs queue mode
- `Dockerfile` + `docker-compose.yml` + `.dockerignore` — Container deployment
- `web/` updates — Added "Pending Changes" and "Activity Log" tabs to the dashboard

### Modified files:
- `src/titan/api/amazon-v3-client.js` — Added `updateCampaignBudgets()`, `updateCampaignStatus()`, `updateKeywordStatus()`, `updatePlacementModifiers()`
- `src/server.ts` — Added 7 new API endpoints (pending, approve, reject, audit-log, jobs, trigger), DB init, scheduler startup, static file serving
- `src/demo-bleeder-detector.ts` — Fixed TypeScript build error
- `package.json` — Added `engines`, `@types/node-cron`, `@types/pg`

## Current Railway State

- **Project:** `tranquil-strength` on Railway (production environment)
- **GitHub repo:** `aattaran/amazon_ppc` connected
- **Services deployed:**
  - `amazon_ppc` — Node.js app (just pushed, should be rebuilding now)
  - `Redis` — Online, with volume
  - **PostgreSQL — NOT ADDED YET** (needs to be added)
- **Last build:** Failed due to TypeScript error in `demo-bleeder-detector.ts` — NOW FIXED and pushed

## What needs to be done on Railway (in the browser)

### 1. Add PostgreSQL database
- Click **"+ Add"** (top right of project canvas) → **Database** → **PostgreSQL**
- Railway auto-provisions it and creates `DATABASE_URL`

### 2. Link DATABASE_URL to the app service
- Click `amazon_ppc` service → **Variables** tab
- Click **"+ New Variable"** → **"Add Reference"** → select the PostgreSQL `DATABASE_URL`
- Also reference `REDIS_URL` from the Redis service if not already linked

### 3. Add environment variables
In the `amazon_ppc` service → **Variables** tab, add:

```
AUTO_APPLY=false
AMAZON_CLIENT_ID=<from local .env>
AMAZON_CLIENT_SECRET=<from local .env>
AMAZON_REFRESH_TOKEN=<from local .env>
AMAZON_PROFILE_ID=<from local .env>
PRODUCT_ASIN=B0DTDZFMY7
TARGET_ACOS=30
BREAK_EVEN_ACOS=45
PPC_PHASE=launch
PORT=3001
```

### 4. Verify build settings
Click `amazon_ppc` service → **Settings** tab:
- **Build command:** `npm run build`
- **Start command:** `node dist/server.js`
- **Root directory:** `/` (default)

### 5. Generate a public domain
Click `amazon_ppc` service → **Settings** → **Networking** → **Generate Domain**
This gives a URL like `amazon-ppc-production-xxxx.up.railway.app`

### 6. Verify deployment
Once deployed, visit: `https://<your-domain>.up.railway.app/health`
Should return: `{"ok":true,"profileId":"..."}`

The full web dashboard will be at the root URL. The Pending Changes and Activity Log tabs will work once the database is connected.

## How the automation works once deployed

| Schedule | Job | What happens |
|----------|-----|-------------|
| Daily 6:00 AM ET | Bleeder Detection | Fetches keyword report, flags wasted spend |
| Daily 8:00 AM ET | Bid Optimization | Runs SOP decision tree, raises/lowers bids |
| Daily 8:30 AM ET | STR Harvest | Downloads search term report, negates bleeders |
| Daily 9:00 AM ET | TACOS Check | Computes TACOS, flags phase changes |
| Monday 6:00 AM ET | Weekly Maintenance | Runs all 3 jobs in sequence |

With `AUTO_APPLY=false`: changes are queued in the "Pending Changes" tab for manual approval.
With `AUTO_APPLY=true`: changes are pushed directly to Amazon Ads API.

## Important notes
- The app needs `DATABASE_URL` to enable the scheduler and audit log. Without it, it runs as a basic API server with no automation.
- All Amazon API credentials come from the `.env` file locally. They need to be manually added as Railway variables.
- The `$5.00 credit / 30 days` trial should be enough for the app + PostgreSQL + Redis.
