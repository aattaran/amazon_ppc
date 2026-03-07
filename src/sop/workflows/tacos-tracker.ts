/**
 * TACOS Tracker
 * Computes Total ACOS (ad spend / total revenue) and determines the current PPC phase.
 * SOP Reference: Section 8 — TACOS Journey
 */

import { SOP_CONFIG, PpcPhase } from '../../config/sop.config';

export interface TacosSnapshot {
  adSpend: number;
  adRevenue: number;
  totalRevenue: number;    // adRevenue + organicRevenue
  organicRevenue: number;
  tacos: number;           // adSpend / totalRevenue
  acos: number;            // adSpend / adRevenue
  adDependencyPct: number; // adRevenue / totalRevenue
  suggestedPhase: PpcPhase;
  phaseRationale: string;
  tacosStatus: 'on-track' | 'above-target' | 'critical';
}

/**
 * Compute TACOS and determine the current PPC phase from raw metrics.
 *
 * @param adSpend    - Total ad spend over the period
 * @param adRevenue  - Revenue attributed to ads
 * @param totalRevenue - Total revenue (ads + organic). If unknown, pass adRevenue.
 */
export function computeTacos(
  adSpend: number,
  adRevenue: number,
  totalRevenue: number,
): TacosSnapshot {
  const organicRevenue = Math.max(0, totalRevenue - adRevenue);
  const tacos = totalRevenue > 0 ? adSpend / totalRevenue : 0;
  const acos = adRevenue > 0 ? adSpend / adRevenue : 0;
  const adDependencyPct = totalRevenue > 0 ? adRevenue / totalRevenue : 0;

  const suggestedPhase = derivePhase(tacos);
  const phaseRationale = buildRationale(tacos, suggestedPhase);
  const tacosStatus = classifyTacosStatus(tacos, SOP_CONFIG.currentPhase);

  return {
    adSpend,
    adRevenue,
    totalRevenue,
    organicRevenue,
    tacos,
    acos,
    adDependencyPct,
    suggestedPhase,
    phaseRationale,
    tacosStatus,
  };
}

function derivePhase(tacos: number): PpcPhase {
  if (tacos > SOP_CONFIG.tacos.growthMax) return 'launch';
  if (tacos > SOP_CONFIG.tacos.matureMax) return 'optimize';
  return 'scale';
}

function buildRationale(tacos: number, phase: PpcPhase): string {
  const pct = (tacos * 100).toFixed(1);
  switch (phase) {
    case 'launch':
      return `TACOS ${pct}% is above growth threshold (${(SOP_CONFIG.tacos.growthMax * 100).toFixed(0)}%). Still in launch mode — focus on velocity, not profitability.`;
    case 'optimize':
      return `TACOS ${pct}% is in growth range. Begin optimization: harvest negatives, adjust bids, review placements. Do NOT scale yet.`;
    case 'scale':
      return `TACOS ${pct}% is healthy (below ${(SOP_CONFIG.tacos.matureMax * 100).toFixed(0)}%). Organic is carrying weight. Ready to scale proven SKC campaigns.`;
  }
}

function classifyTacosStatus(tacos: number, currentPhase: PpcPhase): TacosSnapshot['tacosStatus'] {
  const target = SOP_CONFIG.tacos.target;
  const phaseMax = currentPhase === 'launch'
    ? SOP_CONFIG.tacos.launchMax
    : currentPhase === 'optimize'
      ? SOP_CONFIG.tacos.growthMax
      : SOP_CONFIG.tacos.matureMax;

  if (tacos <= target) return 'on-track';
  if (tacos <= phaseMax) return 'above-target';
  return 'critical';
}

export function printTacosReport(snap: TacosSnapshot): void {
  const fmt = (n: number) => `${(n * 100).toFixed(1)}%`;
  const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TACOS REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Ad Spend:        ${fmtUsd(snap.adSpend)}`);
  console.log(`  Ad Revenue:      ${fmtUsd(snap.adRevenue)}`);
  console.log(`  Organic Revenue: ${fmtUsd(snap.organicRevenue)}`);
  console.log(`  Total Revenue:   ${fmtUsd(snap.totalRevenue)}`);
  console.log('  ──────────────────────────────────────');
  console.log(`  ACOS:            ${fmt(snap.acos)}  (target: ${fmt(SOP_CONFIG.targetAcos)})`);
  console.log(`  TACOS:           ${fmt(snap.tacos)}  (target: ${fmt(SOP_CONFIG.tacos.target)})`);
  console.log(`  Ad Dependency:   ${fmt(snap.adDependencyPct)}`);
  console.log('  ──────────────────────────────────────');
  console.log(`  Status:          ${snap.tacosStatus.toUpperCase()}`);
  console.log(`  Current Phase:   ${SOP_CONFIG.currentPhase.toUpperCase()}`);
  console.log(`  Suggested Phase: ${snap.suggestedPhase.toUpperCase()}`);
  console.log(`  Rationale:       ${snap.phaseRationale}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (snap.suggestedPhase !== SOP_CONFIG.currentPhase) {
    console.warn(
      `⚠  Phase mismatch: PPC_PHASE is "${SOP_CONFIG.currentPhase}" but data suggests "${snap.suggestedPhase}". ` +
      `Consider updating PPC_PHASE in your .env.`,
    );
  }
}
