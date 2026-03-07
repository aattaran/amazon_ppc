/**
 * Job Runner — Wraps SOP workflows with audit logging, cooldown checks,
 * and auto-apply vs queue-for-approval logic.
 */

import {
  startJobRun, finishJobRun, logChange, queueChange,
  isOnCooldown, AuditEntry, PendingChange,
} from '../database/db';
import { SOP_CONFIG } from '../config/sop.config';

const AUTO_APPLY = process.env.AUTO_APPLY === 'true';
const BID_COOLDOWN_DAYS = parseInt(process.env.MIN_DAYS_BETWEEN_BID_CHANGES ?? '7', 10);

export interface ChangeRequest {
  ruleId: string;
  entityType: 'keyword' | 'campaign' | 'negative';
  entityId: string;
  entityName: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
  /** Function that applies the change to Amazon. Null = informational only. */
  apply: (() => Promise<void>) | null;
}

export interface JobResult {
  jobRunId: number;
  applied: number;
  queued: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Executes a named job: wraps it in a job_runs record,
 * processes each change request through the approval pipeline.
 */
export async function runJob(
  jobName: string,
  produceChanges: () => Promise<ChangeRequest[]>,
): Promise<JobResult> {
  const jobRunId = await startJobRun(jobName);
  const result: JobResult = { jobRunId, applied: 0, queued: 0, skipped: 0, failed: 0, errors: [] };

  try {
    const changes = await produceChanges();
    console.log(`  [${jobName}] ${changes.length} change(s) produced`);

    for (const change of changes) {
      try {
        // Check bid cooldown (R36: no bid changes more frequently than every 7 days)
        if ((change.action === 'raise_bid' || change.action === 'lower_bid') && change.entityId) {
          const onCooldown = await isOnCooldown(change.entityId, BID_COOLDOWN_DAYS);
          if (onCooldown) {
            await logChange({
              jobRunId, ruleId: change.ruleId, entityType: change.entityType,
              entityId: change.entityId, entityName: change.entityName,
              action: change.action, oldValue: change.oldValue, newValue: change.newValue,
              status: 'skipped', reason: `Cooldown: last bid change < ${BID_COOLDOWN_DAYS} days ago`,
            });
            result.skipped++;
            continue;
          }
        }

        if (AUTO_APPLY && change.apply) {
          // Auto-apply: execute immediately and log
          await change.apply();
          await logChange({
            jobRunId, ruleId: change.ruleId, entityType: change.entityType,
            entityId: change.entityId, entityName: change.entityName,
            action: change.action, oldValue: change.oldValue, newValue: change.newValue,
            status: 'applied', reason: change.reason,
          });
          result.applied++;
        } else if (change.apply) {
          // Queue for approval
          await queueChange({
            ruleId: change.ruleId, entityType: change.entityType,
            entityId: change.entityId, entityName: change.entityName,
            action: change.action, oldValue: change.oldValue, newValue: change.newValue,
            reason: change.reason,
          });
          await logChange({
            jobRunId, ruleId: change.ruleId, entityType: change.entityType,
            entityId: change.entityId, entityName: change.entityName,
            action: change.action, oldValue: change.oldValue, newValue: change.newValue,
            status: 'queued', reason: change.reason,
          });
          result.queued++;
        } else {
          // Informational only (no apply function)
          await logChange({
            jobRunId, ruleId: change.ruleId, entityType: change.entityType,
            entityId: change.entityId, entityName: change.entityName,
            action: change.action, oldValue: change.oldValue, newValue: change.newValue,
            status: 'skipped', reason: change.reason + ' (informational — no auto-apply)',
          });
          result.skipped++;
        }
      } catch (err: any) {
        await logChange({
          jobRunId, ruleId: change.ruleId, entityType: change.entityType,
          entityId: change.entityId, entityName: change.entityName,
          action: change.action, oldValue: change.oldValue, newValue: change.newValue,
          status: 'failed', reason: `Error: ${err.message}`,
        });
        result.failed++;
        result.errors.push(`${change.ruleId}/${change.entityId}: ${err.message}`);
      }
    }

    const status = result.failed > 0 ? (result.applied > 0 ? 'partial' : 'failed') : 'success';
    await finishJobRun(jobRunId, status, result.applied + result.queued, {
      applied: result.applied, queued: result.queued,
      skipped: result.skipped, failed: result.failed,
    });

    console.log(`  [${jobName}] Done — applied: ${result.applied}, queued: ${result.queued}, skipped: ${result.skipped}, failed: ${result.failed}`);
  } catch (err: any) {
    await finishJobRun(jobRunId, 'failed', 0, {}, err.message);
    result.errors.push(err.message);
    console.error(`  [${jobName}] FAILED: ${err.message}`);
  }

  return result;
}
