/**
 * PostgreSQL Database Layer
 * Manages audit log, pending changes, and job run history.
 * Falls back to in-memory storage if DATABASE_URL is not set.
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

// ── Connection Pool ─────────────────────────────────────────────────────────

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Set it in .env to use PostgreSQL.');
    }
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

/** Run schema.sql to initialize tables */
export async function initDatabase(): Promise<void> {
  const db = getPool();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  await db.query(sql);
  console.log('Database schema initialized');
}

// ── Job Runs ────────────────────────────────────────────────────────────────

export async function startJobRun(jobName: string): Promise<number> {
  const db = getPool();
  const { rows } = await db.query(
    `INSERT INTO job_runs (job_name, started_at) VALUES ($1, NOW()) RETURNING id`,
    [jobName],
  );
  return rows[0].id;
}

export async function finishJobRun(
  jobId: number,
  status: 'success' | 'failed' | 'partial',
  changesCount: number,
  summary: Record<string, unknown>,
  error?: string,
): Promise<void> {
  const db = getPool();
  await db.query(
    `UPDATE job_runs SET finished_at = NOW(), status = $1, changes_count = $2, summary = $3, error = $4
     WHERE id = $5`,
    [status, changesCount, JSON.stringify(summary), error ?? null, jobId],
  );
}

export async function getJobRuns(limit = 50): Promise<any[]> {
  const db = getPool();
  const { rows } = await db.query(
    `SELECT * FROM job_runs ORDER BY started_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

// ── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditEntry {
  jobRunId: number | null;
  ruleId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  status: 'applied' | 'queued' | 'failed' | 'skipped';
  reason: string;
}

export async function logChange(entry: AuditEntry): Promise<number> {
  const db = getPool();
  const { rows } = await db.query(
    `INSERT INTO audit_log (job_run_id, rule_id, entity_type, entity_id, entity_name, action, old_value, new_value, status, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [entry.jobRunId, entry.ruleId, entry.entityType, entry.entityId, entry.entityName,
     entry.action, entry.oldValue, entry.newValue, entry.status, entry.reason],
  );
  return rows[0].id;
}

export async function getAuditLog(limit = 100, offset = 0): Promise<any[]> {
  const db = getPool();
  const { rows } = await db.query(
    `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return rows;
}

// ── Pending Changes ─────────────────────────────────────────────────────────

export interface PendingChange {
  ruleId: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
}

export async function queueChange(change: PendingChange): Promise<number> {
  const db = getPool();
  const { rows } = await db.query(
    `INSERT INTO pending_changes (rule_id, entity_type, entity_id, entity_name, action, old_value, new_value, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [change.ruleId, change.entityType, change.entityId, change.entityName,
     change.action, change.oldValue, change.newValue, change.reason],
  );
  return rows[0].id;
}

export async function getPendingChanges(): Promise<any[]> {
  const db = getPool();
  const { rows } = await db.query(
    `SELECT * FROM pending_changes WHERE approved IS NULL ORDER BY created_at DESC`,
  );
  return rows;
}

export async function approveChange(id: number): Promise<any> {
  const db = getPool();
  const { rows } = await db.query(
    `UPDATE pending_changes SET approved = true, approved_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0];
}

export async function rejectChange(id: number): Promise<any> {
  const db = getPool();
  const { rows } = await db.query(
    `UPDATE pending_changes SET approved = false, approved_at = NOW() WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0];
}

export async function approveAllPending(): Promise<number> {
  const db = getPool();
  const { rowCount } = await db.query(
    `UPDATE pending_changes SET approved = true, approved_at = NOW() WHERE approved IS NULL`,
  );
  return rowCount ?? 0;
}

// ── Bid Cooldown Check ──────────────────────────────────────────────────────

/** Returns true if the keyword had a bid change within the cooldown period */
export async function isOnCooldown(keywordId: string, cooldownDays: number): Promise<boolean> {
  const db = getPool();
  const { rows } = await db.query(
    `SELECT 1 FROM audit_log
     WHERE entity_id = $1 AND action IN ('raise_bid','lower_bid') AND status = 'applied'
       AND created_at > NOW() - INTERVAL '1 day' * $2
     LIMIT 1`,
    [keywordId, cooldownDays],
  );
  return rows.length > 0;
}
