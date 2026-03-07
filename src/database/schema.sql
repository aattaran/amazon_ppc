-- Amazon PPC Automation — PostgreSQL Schema
-- Run: psql $DATABASE_URL -f src/database/schema.sql

-- Job execution history
CREATE TABLE IF NOT EXISTS job_runs (
  id            SERIAL PRIMARY KEY,
  job_name      TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'running',  -- running, success, failed, partial
  changes_count INT DEFAULT 0,
  error         TEXT,
  summary       JSONB
);

-- Every automated change (applied or queued)
CREATE TABLE IF NOT EXISTS audit_log (
  id            SERIAL PRIMARY KEY,
  job_run_id    INT REFERENCES job_runs(id),
  rule_id       TEXT,              -- e.g. "R08", "R12"
  entity_type   TEXT NOT NULL,     -- keyword, campaign, negative
  entity_id     TEXT,              -- Amazon keyword/campaign ID
  entity_name   TEXT,              -- human-readable name
  action        TEXT NOT NULL,     -- raise_bid, lower_bid, negate, pause, etc.
  old_value     TEXT,
  new_value     TEXT,
  status        TEXT NOT NULL DEFAULT 'applied',  -- applied, queued, failed, skipped
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pending changes awaiting user approval (AUTO_APPLY=false)
CREATE TABLE IF NOT EXISTS pending_changes (
  id            SERIAL PRIMARY KEY,
  rule_id       TEXT,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT,
  entity_name   TEXT,
  action        TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  reason        TEXT,
  approved      BOOLEAN,           -- null=pending, true=approved, false=rejected
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_rule     ON audit_log(rule_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created  ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_job      ON audit_log(job_run_id);
CREATE INDEX IF NOT EXISTS idx_pending_approved   ON pending_changes(approved) WHERE approved IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_runs_status    ON job_runs(status);
