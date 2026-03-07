/* ── SOP Configuration (mirrors sop.config.ts defaults) ────── */
const SOP = {
  targetAcos:           0.30,
  breakEvenAcos:        0.45,
  acosBidReductionPct:  0.15,
  acosBidIncreasePct:   0.20,
  minClicksBeforeNeg:   10,
  minImpressionsCheck:  100,
  tosModifierLaunch:    0.75,
  tosModifierRanking:   1.00,
  launchNoTouchDays:    7,
  minReviewsScaling:    15,
  tacos: { launchMax: 0.40, growthMax: 0.25, matureMax: 0.15, target: 0.12 },
  budgetAllocation: { skc: 0.50, discovery: 0.25, competitor: 0.15, defensive: 0.10 },
};

let currentPhase = 'launch';
let strTerms = [];

/* ── Tab Navigation ──────────────────────────────────────── */
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('topbarTitle').textContent = btn.textContent.trim();
    if (window.innerWidth < 768) closeSidebar();
    // Auto-load data for tabs that require it
    if (tab === 'pending')  loadPendingChanges();
    if (tab === 'activity') loadActivityLog();
  });
});

/* ── Phase Selector ──────────────────────────────────────── */
document.querySelectorAll('.phase-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.phase-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPhase = btn.dataset.phase;
    updatePhaseBadge();
  });
});

function updatePhaseBadge() {
  const badge = document.getElementById('topbarPhaseBadge');
  badge.textContent = currentPhase.toUpperCase();
  badge.className = 'phase-badge ' + currentPhase;
}

/* ── Mobile menu ─────────────────────────────────────────── */
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }
document.addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth < 768 && sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) && e.target.id !== 'menuToggle') {
    closeSidebar();
  }
});

/* ── Date ────────────────────────────────────────────────── */
const dateEl = document.getElementById('topbarDate');
if (dateEl) {
  dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ── Utilities ───────────────────────────────────────────── */
const pct  = n => (n * 100).toFixed(1) + '%';
const usd  = n => '$' + n.toFixed(2);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round2 = n => Math.round(n * 100) / 100;

function colorClass(val, target, breakEven) {
  if (val <= target)     return 'green';
  if (val <= breakEven)  return 'yellow';
  return 'red';
}

/* ── DASHBOARD ───────────────────────────────────────────── */
function updateDashboard() {
  const spend    = parseFloat(document.getElementById('dash-spend').value)    || 0;
  const adRev    = parseFloat(document.getElementById('dash-adrev').value)    || 0;
  const totalRev = parseFloat(document.getElementById('dash-totalrev').value) || adRev;

  const acos   = adRev > 0    ? spend / adRev    : 0;
  const tacos  = totalRev > 0 ? spend / totalRev : 0;
  const organic = Math.max(0, totalRev - adRev);
  const dep    = totalRev > 0 ? adRev / totalRev : 0;

  // ACOS card
  const acosClass = colorClass(acos, SOP.targetAcos, SOP.breakEvenAcos);
  setMetricCard('mc-acos', 'val-acos', pct(acos), 'sub-acos',
    `Target: ${pct(SOP.targetAcos)}`, 'bar-acos', clamp(acos / SOP.breakEvenAcos, 0, 1), acosClass);

  // TACOS card
  const tacosClass = colorClass(tacos, SOP.tacos.target, SOP.tacos.growthMax);
  setMetricCard('mc-tacos', 'val-tacos', pct(tacos), 'sub-tacos',
    `Target: ${pct(SOP.tacos.target)}`, 'bar-tacos', clamp(tacos / SOP.tacos.launchMax, 0, 1), tacosClass);

  // Organic
  document.getElementById('val-organic').textContent = usd(organic);
  document.getElementById('sub-organic').textContent =
    organic > 0 ? `${pct(organic / totalRev)} of total revenue` : 'No organic yet';

  // Ad dependency
  const depClass = dep < 0.5 ? 'green' : dep < 0.8 ? 'yellow' : 'red';
  setMetricCard('mc-dep', 'val-dep', pct(dep), null, null,
    'bar-dep', dep, depClass);
}

function setMetricCard(cardId, valId, valText, subId, subText, barId, barPct, cls) {
  const card = document.getElementById(cardId);
  card.className = 'metric-card ' + cls;
  const valEl = document.getElementById(valId);
  valEl.textContent = valText;
  valEl.className = 'metric-value ' + cls;
  if (subId && subText) document.getElementById(subId).textContent = subText;
  const bar = document.getElementById(barId);
  if (bar) {
    bar.style.width = (barPct * 100).toFixed(1) + '%';
    bar.style.background = cls === 'green' ? 'var(--green)' : cls === 'yellow' ? 'var(--yellow)' : 'var(--red)';
  }
}

// Init dashboard
updateDashboard();

/* ── TACOS TRACKER ───────────────────────────────────────── */
function calcTacos() {
  const spend    = parseFloat(document.getElementById('t-spend').value)    || 0;
  const adRev    = parseFloat(document.getElementById('t-adrev').value)    || 0;
  const totalRev = parseFloat(document.getElementById('t-totalrev').value) || adRev;
  const phase    = document.getElementById('t-phase').value;

  const acos    = adRev > 0    ? spend / adRev    : 0;
  const tacos   = totalRev > 0 ? spend / totalRev : 0;
  const organic = Math.max(0, totalRev - adRev);
  const dep     = totalRev > 0 ? adRev / totalRev : 0;

  const suggestedPhase = tacos > SOP.tacos.growthMax ? 'launch'
    : tacos > SOP.tacos.matureMax ? 'optimize' : 'scale';

  const phaseMax = phase === 'launch' ? SOP.tacos.launchMax
    : phase === 'optimize' ? SOP.tacos.growthMax : SOP.tacos.matureMax;
  const status = tacos <= SOP.tacos.target ? 'on-track'
    : tacos <= phaseMax ? 'above-target' : 'critical';

  const rationale = {
    launch: `TACOS ${pct(tacos)} in launch mode. Focus on velocity, not profitability. Accept the spend.`,
    optimize: `TACOS ${pct(tacos)} in optimization range. Harvest negatives, tighten bids, no scaling yet.`,
    scale: `TACOS ${pct(tacos)} is healthy. Organic is carrying weight. Ready to scale proven SKC campaigns.`,
  }[suggestedPhase];

  const tacosOut = document.getElementById('tacos-output');
  const placeholder = document.querySelector('#tacos-result .result-placeholder');
  tacosOut.classList.remove('hidden');
  if (placeholder) placeholder.style.display = 'none';

  const tacosValEl = document.getElementById('t-tacos-val');
  tacosValEl.textContent = pct(tacos);
  tacosValEl.style.color = status === 'on-track' ? 'var(--green)' : status === 'above-target' ? 'var(--yellow)' : 'var(--red)';

  const statusBadge = document.getElementById('t-status-badge');
  statusBadge.textContent = status.replace('-', ' ').toUpperCase();
  statusBadge.className = 'status-badge-lg ' + {
    'on-track': 'status-on-track', 'above-target': 'status-above', 'critical': 'status-critical'
  }[status];

  document.getElementById('t-result-rows').innerHTML = [
    ['ACOS',            pct(acos),   colorClass(acos, SOP.targetAcos, SOP.breakEvenAcos)],
    ['TACOS',           pct(tacos),  colorClass(tacos, SOP.tacos.target, SOP.tacos.growthMax)],
    ['Organic Revenue', usd(organic), organic > 0 ? 'var(--green)' : 'var(--text-2)'],
    ['Ad Dependency',   pct(dep),    dep < 0.5 ? 'var(--green)' : dep < 0.8 ? 'var(--yellow)' : 'var(--red)'],
    ['Suggested Phase', suggestedPhase.toUpperCase(), suggestedPhase !== phase ? 'var(--yellow)' : 'var(--green)'],
  ].map(([label, val, color]) =>
    `<div class="result-row"><span class="rr-label">${label}</span><span class="rr-val" style="color:${color}">${val}</span></div>`
  ).join('');

  document.getElementById('t-rationale').textContent = rationale;
  if (suggestedPhase !== phase) {
    document.getElementById('t-rationale').textContent +=
      ` ⚠ Phase mismatch: you set "${phase}" but data suggests "${suggestedPhase}".`;
  }
}

/* ── CAMPAIGNS ───────────────────────────────────────────── */
const CAMPAIGN_DEFS = [
  {
    key: 'auto', cssClass: 'auto-card', type: 'Auto Discovery', match: 'AUTO',
    allocFn: (b) => round2(b * SOP.budgetAllocation.discovery * 0.5),
    tos: (b) => `TOS +${pct(SOP.tosModifierLaunch)}`, pp: '—',
    purpose: 'Harvest unknown search terms. Keep alive always — never pause.',
  },
  {
    key: 'exact', cssClass: 'exact-card', type: 'Exact Ranking', match: 'EXACT',
    allocFn: (b) => round2(b * SOP.budgetAllocation.skc * 0.4),
    tos: () => `TOS +${pct(SOP.tosModifierRanking)}`, pp: '—',
    purpose: 'Aggressive bids on top 20–30 target keywords. Win page 1.',
  },
  {
    key: 'phrase', cssClass: 'phrase-card', type: 'Phrase/Broad', match: 'PHRASE',
    allocFn: (b) => round2(b * SOP.budgetAllocation.discovery * 0.5),
    tos: () => `TOS +${pct(SOP.tosModifierLaunch * 0.5)}`, pp: '—',
    purpose: 'Mid-funnel discovery at lower CPC. Feed winners to exact/SKC.',
  },
  {
    key: 'competitor', cssClass: 'competitor-card', type: 'Competitor PT', match: 'TARGETING',
    allocFn: (b) => round2(b * SOP.budgetAllocation.competitor),
    tos: () => '—', pp: 'PP +50%',
    purpose: 'Appear on competitor product pages. Steal traffic from top ASINs.',
  },
  {
    key: 'defensive', cssClass: 'defensive-card', type: 'Brand Defense', match: 'EXACT',
    allocFn: (b) => round2(b * SOP.budgetAllocation.defensive),
    tos: () => '—', pp: '—',
    purpose: 'Protect branded search terms. Prevent competitors from intercepting.',
  },
  {
    key: 'skc', cssClass: 'skc-card', type: 'SKC (Single KW)', match: 'EXACT',
    allocFn: (b) => round2(b * SOP.budgetAllocation.skc * 0.6),
    tos: () => `TOS +${pct(SOP.tosModifierRanking)}`, pp: '—',
    purpose: 'Isolated campaign for one proven winner keyword. Max budget control.',
    note: 'Only create after keyword proves ACOS ≤ target with 3+ orders',
  },
];

function updateCampaignBudgets() { renderCampaigns(); }
function updateCampaignNames()   { renderCampaigns(); }

function renderCampaigns() {
  const budget  = parseFloat(document.getElementById('camp-budget').value) || 100;
  const product = (document.getElementById('camp-product').value || 'PRODUCT').toUpperCase().replace(/\s+/g, '-');
  const grid = document.getElementById('campaign-grid');

  const nameMap = {
    auto: `${product}-AUTO-DISCOVERY`,
    exact: `${product}-EXACT-RANKING`,
    phrase: `${product}-PHRASE-BROAD`,
    competitor: `${product}-PT-COMPETITOR`,
    defensive: `${product}-BRAND-DEFENSE`,
    skc: `${product}-SKC-[KEYWORD]`,
  };

  grid.innerHTML = CAMPAIGN_DEFS.map(def => {
    const b = def.allocFn(budget);
    const tos = typeof def.tos === 'function' ? def.tos() : def.tos;
    const pp = def.pp;
    return `
      <div class="campaign-card ${def.cssClass}">
        <div class="camp-header">
          <span class="camp-type">${def.type}</span>
          <span class="camp-match">${def.match}</span>
        </div>
        <div class="camp-name">${nameMap[def.key]}</div>
        <div class="camp-budget">${usd(b)}</div>
        <div class="camp-budget-label">/ day</div>
        <div class="camp-purpose">${def.purpose}</div>
        ${def.note ? `<div style="font-size:0.72rem;color:var(--yellow);margin-top:4px">⚠ ${def.note}</div>` : ''}
        <div class="camp-tos">
          ${tos !== '—' ? `<span class="tos-badge">${tos}</span>` : ''}
          ${pp !== '—'  ? `<span class="tos-badge" style="background:rgba(245,158,11,0.15);color:var(--yellow)">${pp}</span>` : ''}
        </div>
      </div>`;
  }).join('');

  drawDonut();
}

function drawDonut() {
  const canvas = document.getElementById('donut-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 100, cy = 100, r = 80, inner = 52;
  const slices = [
    { pct: SOP.budgetAllocation.skc,        color: '#10b981', label: 'SKC Campaigns' },
    { pct: SOP.budgetAllocation.discovery,  color: '#3b82f6', label: 'Discovery' },
    { pct: SOP.budgetAllocation.competitor, color: '#f59e0b', label: 'Competitor PT' },
    { pct: SOP.budgetAllocation.defensive,  color: '#ef4444', label: 'Brand Defense' },
  ];
  ctx.clearRect(0, 0, 200, 200);
  let angle = -Math.PI / 2;
  slices.forEach(s => {
    const sweep = s.pct * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    angle += sweep;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a2235';
  ctx.fill();
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 13px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('Scale', cx, cy - 2);
  ctx.font = '11px Inter';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Allocation', cx, cy + 14);

  const legend = document.getElementById('donut-legend');
  legend.innerHTML = slices.map(s =>
    `<div class="legend-item">
      <div class="legend-dot" style="background:${s.color}"></div>
      <span class="legend-label">${s.label}</span>
      <span class="legend-pct">${pct(s.pct)}</span>
    </div>`
  ).join('');
}

/* ── BID OPTIMIZER ───────────────────────────────────────── */
function runBidOptimizer() {
  const kw      = document.getElementById('b-kw').value || 'keyword';
  const bid     = parseFloat(document.getElementById('b-bid').value)    || 0;
  const impr    = parseInt(document.getElementById('b-impr').value)     || 0;
  const clicks  = parseInt(document.getElementById('b-clicks').value)   || 0;
  const orders  = parseInt(document.getElementById('b-orders').value)   || 0;
  const spend   = parseFloat(document.getElementById('b-spend').value)  || 0;
  const sales   = parseFloat(document.getElementById('b-sales').value)  || 0;

  const acos = sales > 0 ? spend / sales : Infinity;
  const steps = [];
  let action, newBid = null, badgeClass;

  if (impr === 0) {
    newBid = round2(bid * 1.25);
    action = `Raise Bid → ${usd(newBid)}`;
    badgeClass = 'action-raise-badge';
    steps.push({ text: 'No impressions — bid too low', state: 'active' });
  } else if (clicks === 0) {
    steps.push({ text: `${impr} impressions, 0 clicks`, state: 'active' });
    if (impr < SOP.minImpressionsCheck) {
      action = 'Needs More Data';
      badgeClass = 'action-data-badge';
      steps.push({ text: `Only ${impr} impressions — wait for ${SOP.minImpressionsCheck}`, state: 'active' });
    } else {
      action = 'Review Creative (not a bid issue)';
      badgeClass = 'action-noop-badge';
      steps.push({ text: 'Many impressions but 0 clicks — check main image & title', state: 'active' });
    }
  } else if (orders === 0) {
    steps.push({ text: `${impr} impressions ✓`, state: 'pass' });
    steps.push({ text: `${clicks} clicks`, state: 'active' });
    if (clicks >= SOP.minClicksBeforeNeg) {
      action = 'Negate Keyword';
      badgeClass = 'action-negate-badge';
      steps.push({ text: `${clicks} clicks, 0 orders ≥ threshold (${SOP.minClicksBeforeNeg}) — negate`, state: 'active' });
    } else {
      action = 'Needs Data';
      badgeClass = 'action-data-badge';
      steps.push({ text: `${clicks} clicks, 0 orders — wait for ${SOP.minClicksBeforeNeg - clicks} more clicks`, state: 'active' });
    }
  } else {
    steps.push({ text: 'Has impressions ✓', state: 'pass' });
    steps.push({ text: 'Has clicks ✓', state: 'pass' });
    steps.push({ text: `Has ${orders} order(s) ✓ — ACOS: ${pct(acos)}`, state: 'pass' });
    if (acos > SOP.breakEvenAcos) {
      newBid = round2(bid * (1 - SOP.acosBidReductionPct));
      action = `Lower Bid → ${usd(newBid)}`;
      badgeClass = 'action-lower-badge';
      steps.push({ text: `ACOS ${pct(acos)} > break-even ${pct(SOP.breakEvenAcos)} — lower ${pct(SOP.acosBidReductionPct)}`, state: 'active' });
    } else if (acos > SOP.targetAcos) {
      newBid = round2(bid * (1 - SOP.acosBidReductionPct * 0.5));
      action = `Lower Bid Gently → ${usd(newBid)}`;
      badgeClass = 'action-lower-badge';
      steps.push({ text: `ACOS ${pct(acos)} between target and break-even — gentle reduction`, state: 'active' });
    } else if (orders >= 3) {
      action = 'Isolate → SKC Campaign';
      badgeClass = 'action-skc-badge';
      steps.push({ text: `ACOS ${pct(acos)} ≤ target + ${orders} orders — isolate to SKC`, state: 'active' });
    } else {
      newBid = round2(bid * (1 + SOP.acosBidIncreasePct));
      action = `Raise Bid → ${usd(newBid)}`;
      badgeClass = 'action-raise-badge';
      steps.push({ text: `ACOS ${pct(acos)} ≤ target ${pct(SOP.targetAcos)} — scale up ${pct(SOP.acosBidIncreasePct)}`, state: 'active' });
    }
  }

  document.getElementById('bid-placeholder').classList.add('hidden');
  const result = document.getElementById('bid-result');
  result.classList.remove('hidden');
  document.getElementById('bid-action-badge').textContent = action;
  document.getElementById('bid-action-badge').className = 'bid-action-badge ' + badgeClass;
  document.getElementById('bid-reason').textContent =
    `Keyword: "${kw}" | Current bid: ${usd(bid)} | ACOS: ${acos === Infinity ? 'N/A (no sales)' : pct(acos)}`;
  document.getElementById('bid-new-amount').textContent =
    newBid ? `New bid: ${usd(newBid)}` : '';
  document.getElementById('decision-tree').innerHTML = steps.map(s =>
    `<div class="dt-step ${s.state}">
      <span class="dt-icon">${s.state === 'pass' ? '✓' : s.state === 'active' ? '→' : '·'}</span>
      <span>${s.text}</span>
    </div>`
  ).join('');
}

/* ── STR HARVEST ─────────────────────────────────────────── */
function classifyTerm(term) {
  const acos = term.sales > 0 ? term.spend / term.sales : null;
  if (term.spend === 0) return { cls: 'needsdata', badge: 'No Spend', rec: 'Monitor', acos };
  if (term.orders === 0) {
    if (term.clicks >= SOP.minClicksBeforeNeg)
      return { cls: 'bleeder', badge: 'Bleeder', rec: 'Add Negative Exact', acos };
    return { cls: 'needsdata', badge: 'Needs Data', rec: `Wait ${SOP.minClicksBeforeNeg - term.clicks} more clicks`, acos };
  }
  if (acos > SOP.breakEvenAcos) return { cls: 'bleeder', badge: 'Bleeder', rec: 'Add Negative Exact', acos };
  if (acos <= SOP.targetAcos && term.orders >= 2) return { cls: 'winner', badge: 'Winner ★', rec: 'Promote to SKC', acos };
  if (acos <= SOP.targetAcos) return { cls: 'winner', badge: 'Winner', rec: 'Monitor for SKC', acos };
  return { cls: 'needsdata', badge: 'Needs Data', rec: 'Lower bid, monitor', acos };
}

function addSearchTerm() {
  const term = document.getElementById('str-term').value.trim();
  if (!term) return;
  strTerms.push({
    term,
    clicks: parseInt(document.getElementById('str-clicks').value) || 0,
    orders: parseInt(document.getElementById('str-orders').value) || 0,
    spend:  parseFloat(document.getElementById('str-spend').value) || 0,
    sales:  parseFloat(document.getElementById('str-sales').value) || 0,
  });
  document.getElementById('str-term').value = '';
  renderSTR();
}

function loadSampleSTR() {
  strTerms = [
    { term: 'collagen face serum',       clicks: 42, orders: 5, spend: 52.10, sales: 189.75 },
    { term: 'anti aging skin care',      clicks: 18, orders: 2, spend: 22.80, sales: 75.90  },
    { term: 'moisturizer for dry skin',  clicks: 31, orders: 0, spend: 38.75, sales: 0      },
    { term: 'vitamin c serum organic',   clicks: 7,  orders: 1, spend: 8.40,  sales: 31.95  },
    { term: 'eye cream wrinkles',        clicks: 12, orders: 0, spend: 14.40, sales: 0      },
    { term: 'best face oil',             clicks: 55, orders: 0, spend: 66.00, sales: 0      },
    { term: 'hyaluronic acid cream',     clicks: 9,  orders: 3, spend: 10.80, sales: 115.00 },
    { term: 'retinol serum women 50',    clicks: 3,  orders: 0, spend: 3.60,  sales: 0      },
  ];
  renderSTR();
}

function renderSTR() {
  const list = document.getElementById('str-list');
  const summary = document.getElementById('str-summary');
  if (!strTerms.length) { list.innerHTML = ''; summary.classList.add('hidden'); return; }

  const classified = strTerms.map(t => ({ ...t, ...classifyTerm(t) }));
  const winners  = classified.filter(t => t.cls === 'winner');
  const bleeders = classified.filter(t => t.cls === 'bleeder');
  const data     = classified.filter(t => t.cls === 'needsdata');
  const wasted   = bleeders.reduce((s, t) => s + t.spend, 0);

  summary.classList.remove('hidden');
  summary.innerHTML = `
    <div class="str-summary-item winner-sum"><div class="str-sum-val">${winners.length}</div><div class="str-sum-label">Winners</div></div>
    <div class="str-summary-item bleeder-sum"><div class="str-sum-val">${bleeders.length}</div><div class="str-sum-label">Bleeders</div></div>
    <div class="str-summary-item data-sum"><div class="str-sum-val">${data.length}</div><div class="str-sum-label">Needs Data</div></div>
    <div class="str-summary-item waste-sum"><div class="str-sum-val">${usd(wasted)}</div><div class="str-sum-label">Wasted Spend</div></div>`;

  list.innerHTML = `<div class="str-header">
    <span>Search Term</span><span>Clicks</span><span>Orders</span>
    <span>Spend</span><span>ACOS</span><span>Classification</span>
  </div>` + classified.map(t =>
    `<div class="str-item ${t.cls}">
      <span class="str-term-text">${t.term}</span>
      <span class="str-num">${t.clicks}</span>
      <span class="str-num">${t.orders}</span>
      <span class="str-num">${usd(t.spend)}</span>
      <span class="str-num">${t.acos !== null ? pct(t.acos) : '—'}</span>
      <div>
        <span class="str-class-badge badge-${t.cls === 'needsdata' ? 'data' : t.cls}">${t.badge}</span>
        <div class="str-rec">${t.rec}</div>
      </div>
    </div>`
  ).join('');
}

/* ── LAUNCH CHECKLIST ─────────────────────────────────────── */
function updateLaunchStatus() {
  const required = ['chk-images','chk-copy','chk-backend','chk-price','chk-inventory'];
  const optional = ['chk-aplus','chk-reviews'];
  const reqPassed = required.filter(id => document.getElementById(id).checked).length;
  const allReqOk  = reqPassed === required.length;

  const icon = document.getElementById('launch-icon');
  const text = document.getElementById('launch-status-text');
  const sub  = document.getElementById('launch-status-sub');
  const display = document.getElementById('launch-status-display');

  if (allReqOk) {
    icon.textContent = '✅';
    text.textContent = 'Ready to Launch!';
    text.style.color = 'var(--green)';
    sub.textContent  = 'All required items passed. Create your campaigns.';
    display.style.background = 'rgba(16,185,129,0.08)';
  } else {
    const remaining = required.length - reqPassed;
    icon.textContent = remaining > 2 ? '🚫' : '⚠️';
    text.textContent = `${remaining} blocker${remaining !== 1 ? 's' : ''} remaining`;
    text.style.color = remaining > 2 ? 'var(--red)' : 'var(--yellow)';
    sub.textContent  = 'Resolve all required items before launching campaigns.';
    display.style.background = '';
  }
}

function updateNoTouch() {
  const launchDate = document.getElementById('launch-date').value;
  if (!launchDate) return;
  const launch = new Date(launchDate);
  const today  = new Date();
  const days   = Math.floor((today - launch) / 86400000);
  const noTouchDays = SOP.launchNoTouchDays;
  const result = document.getElementById('no-touch-result');

  if (days < 0) {
    result.textContent = 'Launch date is in the future.';
    result.className = 'no-touch-result';
  } else if (days < noTouchDays) {
    result.textContent = `Day ${days} of ${noTouchDays}. DO NOT adjust bids yet. ${noTouchDays - days} day(s) remaining in no-touch window.`;
    result.className = 'no-touch-result wait';
  } else {
    result.textContent = `No-touch window complete (${days} days live). Ready for first bid review.`;
    result.className = 'no-touch-result ok';
  }
}

/* ── WEEKLY CHECKLIST ─────────────────────────────────────── */
function updateWeeklyProgress() {
  const all  = document.querySelectorAll('.weekly-chk');
  const done = document.querySelectorAll('.weekly-chk:checked').length;
  const pct  = all.length > 0 ? (done / all.length) * 100 : 0;
  document.getElementById('weekly-progress').style.width = pct.toFixed(0) + '%';
  document.getElementById('weekly-progress-label').textContent = `${done} / ${all.length} tasks`;
}

function resetWeekly() {
  document.querySelectorAll('.weekly-chk').forEach(c => c.checked = false);
  updateWeeklyProgress();
}

document.querySelectorAll('.weekly-chk').forEach(c => c.addEventListener('change', updateWeeklyProgress));
updateWeeklyProgress();

/* ── AUTOMATION RULES ─────────────────────────────────────── */
const SOP_RULES = [
  // Section 2 — Pre-Launch
  { id:'R01', sec:'prelaunch', secNum:'2', secTitle:'Pre-Launch Readiness', secDesc:'Gates that must pass before any PPC spend.',
    name:'Minimum Reviews Gate', priority:'critical', auto:false,
    cond:'<span class="rc-kw">reviews</span> <span class="rc-op">&lt;</span> <span class="rc-val">15</span>',
    action:'BLOCK scaling. Enroll in Amazon Vine until reviews &ge; 15.',
    desc:'Shoppers don\'t trust products with few reviews. Running ads to a listing with under 15 reviews means you\'re paying for clicks that won\'t convert. Get to 15 reviews first (Vine, Request a Review, inserts) before spending real money on ads.' },
  { id:'R02', sec:'prelaunch',
    name:'Target ACOS Calculation', priority:'critical', auto:false,
    cond:'<span class="rc-kw">targetAcos</span> <span class="rc-op">=</span> (<span class="rc-kw">price</span> <span class="rc-op">-</span> <span class="rc-kw">COGS</span> <span class="rc-op">-</span> <span class="rc-kw">FBA_fees</span> <span class="rc-op">-</span> <span class="rc-kw">storage</span>) <span class="rc-op">/</span> <span class="rc-kw">price</span>',
    action:'Compute before launch. Set TARGET_ACOS in .env.',
    desc:'Your target ACOS is the maximum percentage of ad revenue you can spend on ads and still make a profit. Subtract all your costs (product cost, FBA fees, storage) from your selling price, then divide by the price. For example: a $30 product with $15 in costs has a target ACOS of 50%. Every ad dollar spent above this number loses you money.' },
  { id:'R03', sec:'prelaunch',
    name:'Keyword List Minimum', priority:'high', auto:false,
    cond:'<span class="rc-kw">keywordCount</span> <span class="rc-op">&lt;</span> <span class="rc-val">30</span>',
    action:'WARN: Need 30-50 target keywords. Use Helium10 or DataForSEO.',
    desc:'Launching with too few keywords limits your discovery potential. You need at least 30 keywords covering different intents: exact product matches ("stainless steel travel mug 20oz"), category terms ("travel mug"), and long-tail phrases. More keywords = more chances for the algorithm to find what converts.' },

  // Section 3 — Structure
  { id:'R37', sec:'structure', secNum:'3', secTitle:'Campaign Structure', secDesc:'Structural invariants. Violations break optimization.',
    name:'One Match Type Per Ad Group', priority:'critical', auto:true,
    cond:'<span class="rc-kw">countDistinct</span>(<span class="rc-kw">adGroup.matchTypes</span>) <span class="rc-op">&gt;</span> <span class="rc-val">1</span>',
    action:'VIOLATION: Split into separate ad groups per match type.',
    desc:'If you put Exact, Phrase, and Broad keywords in the same ad group, Amazon distributes your budget across all of them and you can\'t tell which match type is performing. Exact keywords need higher bids (they\'re precise), while Broad needs lower bids (they\'re experimental). Separate ad groups let you set the right bid for each.' },
  { id:'R38', sec:'structure',
    name:'One Product Per Ad Group', priority:'critical', auto:true,
    cond:'<span class="rc-kw">countDistinct</span>(<span class="rc-kw">adGroup.products</span>) <span class="rc-op">&gt;</span> <span class="rc-val">1</span>',
    action:'VIOLATION: Split for product-level ACOS analysis.',
    desc:'When multiple products share an ad group, you can\'t see which product is profitable and which is bleeding money. Amazon shows combined metrics. You need one product per ad group so you can calculate ACOS per product and make smart bid decisions.' },
  { id:'R39', sec:'structure',
    name:'Never Move Winning Keywords', priority:'high', auto:false,
    cond:'<span class="rc-kw">keyword.isWinner</span> <span class="rc-and">AND</span> <span class="rc-kw">keyword.isBeingMoved</span>',
    action:'BLOCK: Winners lose history in new campaigns. Move losers instead.',
    desc:'Amazon\'s algorithm builds a performance history for each keyword in each campaign. When you move a winning keyword to a new campaign, it starts fresh with zero history &mdash; and often performs worse. Instead, keep the winner where it is and move the underperformers out. The winner keeps its momentum.' },
  { id:'R18', sec:'structure',
    name:'Cross-Campaign Negative Isolation', priority:'high', auto:true,
    cond:'<span class="rc-kw">keyword.matchType</span> <span class="rc-op">==</span> <span class="rc-val">EXACT</span>',
    action:'Add as NEGATIVE EXACT in all Auto, Phrase, and Broad campaigns.',
    desc:'If you\'re bidding on "travel mug" in your Exact campaign, your Auto and Broad campaigns might also trigger for that same search term. Now you\'re competing against yourself and paying twice. By adding "travel mug" as a negative in Auto/Broad, you ensure only your Exact campaign (where you have precise bid control) handles that term.' },

  // Section 4 — Launch
  { id:'R04', sec:'launch', secNum:'4', secTitle:'Launch Phase (Weeks 1-4)', secDesc:'First 4 weeks. Priority: velocity over profitability.',
    name:'7-Day No-Touch Window', priority:'critical', auto:true,
    cond:'<span class="rc-kw">daysSinceLaunch</span> <span class="rc-op">&lt;</span> <span class="rc-val">7</span>',
    action:'BLOCK all bid/budget changes. Algorithm needs 7 days of data.',
    desc:'Amazon\'s ad algorithm is learning about your product in the first week. It\'s testing which shoppers click, which search terms match, and when people buy. If you change bids during this period, you reset the learning process. Wait 7 full days before touching anything &mdash; even if ACOS looks terrible. The data is not statistically significant yet.' },
  { id:'R05', sec:'launch',
    name:'Auto Campaign Initial CPC', priority:'medium', auto:false,
    cond:'<span class="rc-kw">campaign.type</span> <span class="rc-op">==</span> <span class="rc-val">AUTO</span> <span class="rc-and">AND</span> <span class="rc-kw">phase</span> <span class="rc-op">==</span> <span class="rc-val">LAUNCH</span>',
    action:'Set CPC = $0.50&ndash;$0.75. Daily budget = $20&ndash;$50.',
    desc:'Auto campaigns let Amazon decide which search terms to show your ad for. Start with a moderate bid ($0.50-$0.75) so you get enough impressions to collect data without overpaying. The $20-$50 daily budget ensures the campaign runs all day and doesn\'t run out by noon, which would miss afternoon/evening shoppers.' },
  { id:'R06', sec:'launch',
    name:'TOS Modifier on Ranking Campaigns', priority:'high', auto:true,
    cond:'<span class="rc-kw">campaign.type</span> <span class="rc-op">==</span> <span class="rc-val">RANKING</span> <span class="rc-and">AND</span> <span class="rc-kw">phase</span> <span class="rc-op">==</span> <span class="rc-val">LAUNCH</span>',
    action:'Set Top of Search placement modifier = 50&ndash;100%.',
    desc:'Top of Search (first row of results) gets the highest click-through rates and conversion rates. During launch, you want maximum visibility to build sales velocity and earn organic rank. A 50-100% placement modifier means you\'re willing to pay 50-100% more per click specifically for those top positions. It\'s expensive but it\'s the fastest way to rank.' },
  { id:'R07', sec:'launch',
    name:'High ACOS Normal During Launch', priority:'medium', auto:true,
    cond:'<span class="rc-kw">phase</span> <span class="rc-op">==</span> <span class="rc-val">LAUNCH</span> <span class="rc-and">AND</span> <span class="rc-kw">acos</span> <span class="rc-op">&gt;</span> <span class="rc-val">45%</span>',
    action:'NO ACTION &mdash; rank investment. Do NOT reduce bids during launch.',
    desc:'During launch, your ACOS will likely be 50-100%+ and that\'s expected. You\'re not trying to be profitable yet &mdash; you\'re trying to generate enough sales velocity to climb Amazon\'s organic rankings. Think of it as an investment: every PPC sale counts toward your organic rank. Once you rank organically, those sales are free. Don\'t panic-lower bids at launch.' },

  // Section 5.1 — Bid Optimization
  { id:'R08', sec:'bids', secNum:'5.1', secTitle:'Bid Optimization', secDesc:'Weekly keyword-level decisions. Evaluate top-to-bottom: first match wins.',
    name:'No Impressions &mdash; Raise Bid', priority:'high', auto:true,
    cond:'<span class="rc-kw">impressions</span> <span class="rc-op">==</span> <span class="rc-val">0</span>',
    action:'Raise bid 25%. <code>newBid = currentBid * 1.25</code>',
    desc:'Zero impressions means Amazon isn\'t showing your ad at all. Your bid is too low to win any ad auctions for this keyword. Raise it by 25% and check again next week. If it still gets nothing, the keyword might also be irrelevant to your product &mdash; Amazon won\'t show ads it thinks won\'t convert.' },
  { id:'R09', sec:'bids',
    name:'Impressions, No Clicks &mdash; Creative Issue', priority:'high', auto:false,
    cond:'<span class="rc-kw">impressions</span> <span class="rc-op">&ge;</span> <span class="rc-val">100</span> <span class="rc-and">AND</span> <span class="rc-kw">clicks</span> <span class="rc-op">==</span> <span class="rc-val">0</span>',
    action:'Do NOT adjust bid. Review main image and title. Creative problem.',
    desc:'Your ad is being shown (100+ impressions) but nobody is clicking. This is NOT a bid problem &mdash; changing the bid won\'t help. Shoppers see your main image, title, price, and star rating in search results. If none of those make them click, you need a better main image (the #1 driver of clicks), a more compelling title, or your price might be too high compared to competitors.' },
  { id:'R10', sec:'bids',
    name:'Clicks, No Sales &mdash; Negate', priority:'critical', auto:true,
    cond:'<span class="rc-kw">clicks</span> <span class="rc-op">&ge;</span> <span class="rc-val">10</span> <span class="rc-and">AND</span> <span class="rc-kw">orders</span> <span class="rc-op">==</span> <span class="rc-val">0</span>',
    action:'Add as NEGATIVE EXACT. Pause keyword. Wasted spend.',
    desc:'You\'ve paid for 10+ clicks and gotten zero sales. That\'s a clear signal: people searching this keyword are not your customers. Maybe the intent doesn\'t match (someone searching "free travel mug" won\'t buy), or your listing isn\'t what they expected. Add it as a negative keyword so you stop paying for these useless clicks. 10 clicks is the minimum threshold for statistical confidence.' },
  { id:'R11', sec:'bids',
    name:'Clicks, No Sales &mdash; Needs Data', priority:'low', auto:true,
    cond:'<span class="rc-kw">clicks</span> <span class="rc-op">&gt;</span> <span class="rc-val">0</span> <span class="rc-and">AND</span> <span class="rc-kw">clicks</span> <span class="rc-op">&lt;</span> <span class="rc-val">10</span> <span class="rc-and">AND</span> <span class="rc-kw">orders</span> <span class="rc-op">==</span> <span class="rc-val">0</span>',
    action:'WAIT &mdash; need 10 clicks minimum before negating.',
    desc:'You have some clicks but fewer than 10, and no sales yet. This isn\'t enough data to decide. A typical Amazon conversion rate is 10-15%, so you might need 7-10 clicks before getting a sale. Negating too early could kill a keyword that just needs more traffic. Wait until you hit 10 clicks, then decide.' },
  { id:'R12', sec:'bids',
    name:'ACOS Above Break-Even &mdash; Lower Bid', priority:'critical', auto:true,
    cond:'<span class="rc-kw">acos</span> <span class="rc-op">&gt;</span> <span class="rc-val">45%</span>',
    action:'Lower bid 15%. <code>newBid = currentBid * 0.85</code>',
    desc:'This keyword is making sales but you\'re spending more on ads than you make in profit (ACOS above your 45% break-even). Every sale from this keyword loses you money. Lower the bid by 15% to pay less per click. You\'ll get fewer impressions but each click will be cheaper, bringing ACOS closer to profitable territory. Don\'t slash it too aggressively or you\'ll lose the keyword entirely.' },
  { id:'R13', sec:'bids',
    name:'ACOS Between Target &amp; Break-Even', priority:'high', auto:true,
    cond:'<span class="rc-val">30%</span> <span class="rc-op">&lt;</span> <span class="rc-kw">acos</span> <span class="rc-op">&le;</span> <span class="rc-val">45%</span>',
    action:'Lower bid 7.5% (gentle). <code>newBid = currentBid * 0.925</code>',
    desc:'This keyword is converting but not as profitably as you want. ACOS is above your 30% target but below the 45% break-even, meaning you\'re still making some profit per sale &mdash; just less than ideal. A gentle 7.5% bid reduction nudges it toward your target without risking losing the keyword position entirely. Small moves, check again next week.' },
  { id:'R14', sec:'bids',
    name:'Low ACOS, Strong Performer &mdash; SKC', priority:'high', auto:false,
    cond:'<span class="rc-kw">acos</span> <span class="rc-op">&le;</span> <span class="rc-val">30%</span> <span class="rc-and">AND</span> <span class="rc-kw">orders</span> <span class="rc-op">&ge;</span> <span class="rc-val">3</span>',
    action:'Isolate into SKC campaign. Increase budget. Move losers, not winners.',
    desc:'This is your best keyword: low ACOS (profitable) and 3+ orders (proven, not a fluke). It deserves its own Single Keyword Campaign (SKC) with its own dedicated budget so it never competes with other keywords for daily budget. An SKC lets you set the exact bid and budget for this one star performer. Important: don\'t move it out of the original campaign &mdash; create a new SKC and move the losers out instead.' },
  { id:'R15', sec:'bids',
    name:'Low ACOS, Few Orders &mdash; Scale', priority:'medium', auto:true,
    cond:'<span class="rc-kw">acos</span> <span class="rc-op">&le;</span> <span class="rc-val">30%</span> <span class="rc-and">AND</span> <span class="rc-kw">orders</span> <span class="rc-op">&lt;</span> <span class="rc-val">3</span>',
    action:'Raise bid 20%. <code>newBid = currentBid * 1.20</code>',
    desc:'This keyword is profitable (low ACOS) but only has 1-2 orders &mdash; it\'s promising but not yet proven. Raise the bid 20% to win more auctions and get more traffic. More clicks at this good ACOS = more profitable sales. If it keeps converting well after 3+ orders, it graduates to an SKC campaign (R14).' },

  // Section 5.2 — Negatives
  { id:'R16', sec:'negatives', secNum:'5.2', secTitle:'Negative Keywords', secDesc:'Weekly harvest from Search Term Report. Negate waste immediately.',
    name:'High Clicks, Zero Sales', priority:'critical', auto:true,
    cond:'<span class="rc-kw">clicks</span> <span class="rc-op">&ge;</span> <span class="rc-val">10</span> <span class="rc-and">AND</span> <span class="rc-kw">orders</span> <span class="rc-op">==</span> <span class="rc-val">0</span>',
    action:'Add as NEGATIVE EXACT in source campaign.',
    desc:'A search term that got 10+ clicks without a single sale is draining your budget. Every click costs money. By adding it as a "negative exact" keyword, you tell Amazon: never show my ad for this exact search term again. This is the single most impactful weekly optimization &mdash; it stops waste immediately.' },
  { id:'R17', sec:'negatives',
    name:'ACOS Above Break-Even', priority:'critical', auto:true,
    cond:'<span class="rc-kw">searchTerm.acos</span> <span class="rc-op">&gt;</span> <span class="rc-val">45%</span>',
    action:'Add search term as NEGATIVE EXACT &mdash; losing money per sale.',
    desc:'This search term is generating sales, but the ACOS is above your break-even (45%). That means you lose money on every sale from this term. Even though sales look good on paper, you\'re paying more in ads than you earn in profit. Negate it to stop the bleed, unless it\'s driving significant organic rank improvement.' },

  // Section 5.3 — Placement
  { id:'R19', sec:'placement', secNum:'5.3', secTitle:'Placement Optimization', secDesc:'Top of Search vs. Rest of Search vs. Product Pages &mdash; evaluate each separately.',
    name:'TOS Outperforming', priority:'medium', auto:false,
    cond:'<span class="rc-kw">tos.acos</span> <span class="rc-op">&lt;</span> <span class="rc-kw">rest.acos</span> <span class="rc-and">AND</span> <span class="rc-kw">tos.conversions</span> <span class="rc-op">&gt;</span> <span class="rc-val">0</span>',
    action:'Increase TOS placement modifier (up to 100%).',
    desc:'Your ads convert better at the top of search results than elsewhere. This makes sense &mdash; shoppers who see you first are more likely to buy. Increase your TOS placement modifier to bid more aggressively for those top spots. You\'re essentially saying: "I\'ll pay extra for the best real estate because it\'s worth it for me."' },
  { id:'R20', sec:'placement',
    name:'Product Pages Converting &mdash; Don\'t Pause', priority:'high', auto:false,
    cond:'<span class="rc-kw">productPages.orders</span> <span class="rc-op">&gt;</span> <span class="rc-val">0</span> <span class="rc-and">AND</span> <span class="rc-kw">overall.acos</span> <span class="rc-op">&gt;</span> <span class="rc-kw">targetAcos</span>',
    action:'Do NOT pause. Adjust placement modifiers, not base bid.',
    desc:'A keyword might look bad overall (high ACOS) but when you break it down by placement, it\'s actually converting well on product detail pages (when your ad shows on competitor listings). The high overall ACOS is dragged up by poor performance in other placements. Don\'t pause the keyword &mdash; instead, reduce bids for underperforming placements and keep the product page placement running.' },

  // Section 5.4 — Dayparting
  { id:'R21', sec:'dayparting', secNum:'5.4', secTitle:'Dayparting', secDesc:'Schedule bids to match when shoppers actually buy.',
    name:'Overnight Bid Reduction', priority:'medium', auto:true,
    cond:'<span class="rc-kw">hour</span> <span class="rc-op">&ge;</span> <span class="rc-val">0</span> <span class="rc-and">AND</span> <span class="rc-kw">hour</span> <span class="rc-op">&lt;</span> <span class="rc-val">6</span>',
    action:'Reduce bids during 12am&ndash;6am to prevent overnight waste.',
    desc:'Very few people buy between midnight and 6am, but your ads still run and still get clicks from late-night browsers who rarely convert. By reducing bids during these hours, you save budget for peak buying times (morning commute, lunch break, evening). Some sellers see 20-30% budget waste from overnight clicks.' },

  // Section 6 — Scaling
  { id:'R22', sec:'scaling', secNum:'6', secTitle:'Scaling Phase', secDesc:'Only enter scaling when TACOS is healthy and you have proven keywords. Never mix scaling with optimization.',
    name:'TACOS Gate for Scaling', priority:'critical', auto:true,
    cond:'<span class="rc-kw">phase</span> <span class="rc-op">==</span> <span class="rc-val">SCALE</span> <span class="rc-and">AND</span> <span class="rc-kw">tacos</span> <span class="rc-op">&gt;</span> <span class="rc-val">15%</span>',
    action:'BLOCK scaling. Return to optimization phase.',
    desc:'TACOS (Total ACOS) measures ad spend against ALL revenue including organic. If TACOS is above 15%, your organic sales aren\'t strong enough to support scaling &mdash; you\'re still too ad-dependent. Scaling now would just burn more money. Go back to optimization: harvest negatives, tighten bids, improve your listing. Scale only when organic is carrying its weight.' },
  { id:'R23', sec:'scaling',
    name:'Budget Allocation at Scale', priority:'high', auto:false,
    cond:'<span class="rc-kw">phase</span> <span class="rc-op">==</span> <span class="rc-val">SCALE</span>',
    action:'__ALLOC__',
    desc:'At scale, distribute your total PPC budget using the 50/25/15/10 split. Half goes to proven SKC campaigns (your winners &mdash; they\'re reliable). A quarter funds discovery (Auto + Broad + Phrase) to keep finding new keywords. 15% targets competitor product pages to steal their traffic. 10% defends your brand name so competitors can\'t intercept shoppers searching for you.' },
  { id:'R24', sec:'scaling',
    name:'Vine Enrollment Gate', priority:'medium', auto:false,
    cond:'<span class="rc-kw">reviews</span> <span class="rc-op">&lt;</span> <span class="rc-val">30</span>',
    action:'Enroll in Amazon Vine before aggressive scaling.',
    desc:'Scaling means pouring more money into ads, which means more eyeballs on your listing. If your listing only has 15-29 reviews, the conversion rate won\'t be good enough to make that extra spend profitable. Amazon Vine gives you up to 30 free reviews from trusted reviewers. Get to 30+ reviews before cranking up the budget.' },

  // Section 7 — Maintenance
  { id:'R35', sec:'maintenance', secNum:'7', secTitle:'Weekly Maintenance', secDesc:'Every Monday morning. Guard rails to prevent over-optimization and budget waste.',
    name:'Budget Cap Warning', priority:'high', auto:true,
    cond:'<span class="rc-kw">campaignSpend</span> <span class="rc-op">&ge;</span> <span class="rc-kw">dailyBudget</span> <span class="rc-op">*</span> <span class="rc-val">0.90</span>',
    action:'WARN: Hitting budget cap. Missing peak hours. Increase or reallocate.',
    desc:'If a campaign spent 90%+ of its daily budget, it probably ran out of money before the day ended. That means your ads stopped showing during peak evening hours when many shoppers buy. Either increase the budget on this campaign or steal budget from a lower-performing campaign. Running out of budget by 3pm is one of the most common PPC mistakes.' },
  { id:'R36', sec:'maintenance',
    name:'Min Days Between Bid Changes', priority:'high', auto:true,
    cond:'<span class="rc-kw">daysSinceLastBidChange</span> <span class="rc-op">&lt;</span> <span class="rc-val">7</span>',
    action:'BLOCK bid change. Algorithm needs 7+ days per change.',
    desc:'Amazon\'s algorithm adjusts its behavior every time you change a bid. If you change bids every 2-3 days, the algorithm never stabilizes and you\'re making decisions on incomplete data. Wait at least 7 days between bid changes so you get a full week of data (including weekday/weekend variation) before making the next adjustment.' },

  // Section 7.1 — TACOS
  { id:'R25', sec:'tacos', secNum:'7.1', secTitle:'TACOS Phase Classification', secDesc:'TACOS (Total ACOS) = ad spend / total revenue. It tells you how dependent you are on ads. Lower = more organic sales.',
    name:'TACOS &mdash; Launch Phase', priority:'medium', auto:true,
    cond:'<span class="rc-kw">tacos</span> <span class="rc-op">&gt;</span> <span class="rc-val">25%</span>',
    action:'Phase = LAUNCH. Expected 25-40%. Focus on velocity.',
    desc:'TACOS above 25% means most of your revenue comes from ads and organic sales are minimal. This is normal for months 1-2. You\'re still building rank. Don\'t try to be profitable &mdash; focus on sales velocity. The goal is to generate enough sales for Amazon to start ranking you organically. Expect TACOS of 25-40% during this phase.' },
  { id:'R26', sec:'tacos',
    name:'TACOS &mdash; Growth Phase', priority:'medium', auto:true,
    cond:'<span class="rc-val">15%</span> <span class="rc-op">&lt;</span> <span class="rc-kw">tacos</span> <span class="rc-op">&le;</span> <span class="rc-val">25%</span>',
    action:'Phase = OPTIMIZE. Harvest negatives, adjust bids. Do NOT scale.',
    desc:'TACOS between 15-25% means organic sales are growing but ads are still doing most of the heavy lifting. This is the optimization phase (months 3-4): harvest negative keywords, tighten bids on underperformers, review placement reports. Do NOT scale yet &mdash; you\'d be throwing more money at an inefficient setup. Get the engine tuned before pressing the gas.' },
  { id:'R27', sec:'tacos',
    name:'TACOS &mdash; Mature Phase', priority:'medium', auto:true,
    cond:'<span class="rc-kw">tacos</span> <span class="rc-op">&le;</span> <span class="rc-val">15%</span>',
    action:'Phase = SCALE. Organic carrying weight. Scale proven SKCs.',
    desc:'TACOS at or below 15% means organic sales are strong &mdash; ads are just supplementing natural demand. This is the goal state. You\'re ready to scale: increase budgets on proven SKC campaigns, test broader keywords, launch competitor targeting. Organic revenue gives you a safety net, so higher ad spend is lower risk.' },
  { id:'R28', sec:'tacos',
    name:'TACOS Trend Worsening', priority:'critical', auto:false,
    cond:'<span class="rc-kw">tacos</span>[w] <span class="rc-op">&gt;</span> <span class="rc-kw">tacos</span>[w-1] <span class="rc-op">&gt;</span> <span class="rc-kw">tacos</span>[w-2]',
    action:'PAUSE scaling. Return to optimization. 2 weeks rising = regression.',
    desc:'If TACOS has gone up for two consecutive weeks, something is wrong. Either organic sales are dropping (competitor outranking you), or your ad efficiency is declining (wasted spend on bad keywords). Stop scaling immediately &mdash; you\'re pouring gas on a fire. Go back to optimization: audit negatives, review search terms, check if a competitor launched or if your organic rank dropped.' },
  { id:'R29', sec:'tacos',
    name:'TACOS Trend Improving', priority:'low', auto:true,
    cond:'<span class="rc-kw">tacos</span>[w] <span class="rc-op">&lt;</span> <span class="rc-kw">tacos</span>[w-1]',
    action:'Stay in current phase. Strategy is working.',
    desc:'TACOS is going down week over week &mdash; organic sales are growing faster than ad spend. Your strategy is working. Don\'t change anything. Keep the current bids, budgets, and approach. Unnecessary changes could disrupt what\'s clearly working. Revisit next week.' },

  // Section 9 — Funnel
  { id:'R30', sec:'funnel', secNum:'9', secTitle:'Funnel Diagnostic', secDesc:'When sales stall, use these rules to identify exactly which stage of the buyer journey is broken.',
    name:'No Impressions', priority:'high', auto:false,
    cond:'<span class="rc-kw">impressions</span> <span class="rc-op">==</span> <span class="rc-val">0</span>',
    action:'FIX: Bid too low or keyword irrelevant. Raise bid or swap keyword.',
    desc:'Your ad isn\'t even entering the auction. Either your bid is too low to compete, or Amazon doesn\'t think your product is relevant to this keyword. Try raising the bid first. If that doesn\'t work, the keyword might be too far outside your product category &mdash; swap it for something more closely related to what you sell.' },
  { id:'R31', sec:'funnel',
    name:'Impressions, No Clicks', priority:'high', auto:false,
    cond:'<span class="rc-kw">impressions</span> <span class="rc-op">&gt;</span> <span class="rc-val">0</span> <span class="rc-and">AND</span> <span class="rc-kw">clicks</span> <span class="rc-op">==</span> <span class="rc-val">0</span>',
    action:'FIX: Bad main image or title. CTR problem.',
    desc:'Shoppers see your ad in search results but don\'t click. They\'re choosing competitors instead. In search results, shoppers see: (1) your main image, (2) title, (3) price, (4) star rating. Fix these in order of impact. The main image is the #1 reason people click or skip. Make it pop against a white background, show the product clearly, and show scale.' },
  { id:'R32', sec:'funnel',
    name:'Clicks, No Sales', priority:'high', auto:false,
    cond:'<span class="rc-kw">clicks</span> <span class="rc-op">&gt;</span> <span class="rc-val">0</span> <span class="rc-and">AND</span> <span class="rc-kw">orders</span> <span class="rc-op">==</span> <span class="rc-val">0</span>',
    action:'FIX: Listing quality &mdash; images, bullets, price, reviews, A+ content.',
    desc:'People click your ad, land on your listing, and leave without buying. Your listing isn\'t convincing them. Check: Are your images professional and showing all angles/uses? Do your bullet points answer common questions? Is your price competitive (check top 3 competitors)? Do you have enough reviews (15+ minimum)? Is your A+ content telling a story? Fix the listing before spending more on ads.' },
  { id:'R33', sec:'funnel',
    name:'Good ACOS, No Organic Lift', priority:'medium', auto:false,
    cond:'<span class="rc-kw">acos</span> <span class="rc-op">&le;</span> <span class="rc-val">30%</span> <span class="rc-and">AND</span> <span class="rc-kw">organicRank</span> <span class="rc-val">NOT improving</span>',
    action:'FIX: Not enough velocity. Increase budget. External traffic.',
    desc:'Your ads are profitable but your organic ranking isn\'t improving. This means your sales volume isn\'t high enough to move the needle. Amazon ranks products based on sales velocity relative to competitors. Increase your daily budget to drive more sales, and consider adding external traffic (TikTok, Instagram, Google) which Amazon rewards with a ranking boost because it brings new customers to the platform.' },
  { id:'R34', sec:'funnel',
    name:'Good PPC, Organic Declining', priority:'high', auto:false,
    cond:'<span class="rc-kw">ppc.sales</span> <span class="rc-op">&gt;</span> <span class="rc-val">0</span> <span class="rc-and">AND</span> <span class="rc-kw">organicRank</span> <span class="rc-val">declining</span>',
    action:'FIX: Competitor outranking. Increase TOS modifier. External traffic.',
    desc:'Your PPC is working fine but your organic rank is slipping. A competitor is likely outpacing your sales velocity or has launched an aggressive campaign. Fight back: increase your Top of Search modifier to win more visible placements, drive external traffic to boost your ranking signal, and check if a new competitor entered with a lower price or better reviews. Organic rank is a moving target &mdash; competitors are always trying to take your spot.' },
];

function renderRules(filterSec) {
  const container = document.getElementById('rulesContainer');
  if (!container) return;

  // Group by section
  const sections = [];
  const seen = new Set();
  const rules = filterSec === 'all' ? SOP_RULES : SOP_RULES.filter(r => r.sec === filterSec);

  rules.forEach(r => {
    if (r.secNum && !seen.has(r.sec)) {
      seen.add(r.sec);
      sections.push({ key: r.sec, num: r.secNum, title: r.secTitle, desc: r.secDesc, rules: [] });
    }
    const sec = sections.find(s => s.key === r.sec);
    if (sec) sec.rules.push(r);
  });

  let html = '';
  sections.forEach(sec => {
    html += `<div class="rules-section-block rsec-${sec.key}">`;
    html += `<div class="rules-section-header">
      <div class="rules-section-num">${sec.num}</div>
      <h3>${sec.title}</h3>
    </div>`;
    if (sec.desc) html += `<p class="rules-section-desc">${sec.desc}</p>`;

    // Special visuals before rules
    if (sec.key === 'bids') {
      html += `<div class="rules-tree-box"><h4>Decision Tree</h4><div class="rules-tree">` +
        `<span class="rt-node">Keyword Data</span>\n` +
        `<span class="rt-branch">  \u251C\u2500</span> <span class="rt-cond">impressions == 0?</span>\n` +
        `<span class="rt-branch">  \u2502  \u2514\u2500</span> YES \u2192 <span class="rt-raise">R08: Raise bid 25%</span>\n` +
        `<span class="rt-branch">  \u251C\u2500</span> <span class="rt-cond">clicks == 0?</span>\n` +
        `<span class="rt-branch">  \u2502  \u251C\u2500</span> impr \u2265 100 \u2192 <span class="rt-wait">R09: Review image & title</span>\n` +
        `<span class="rt-branch">  \u2502  \u2514\u2500</span> impr < 100 \u2192 <span class="rt-wait">Needs more data</span>\n` +
        `<span class="rt-branch">  \u251C\u2500</span> <span class="rt-cond">orders == 0?</span>\n` +
        `<span class="rt-branch">  \u2502  \u251C\u2500</span> clicks \u2265 10 \u2192 <span class="rt-negate">R10: NEGATE</span>\n` +
        `<span class="rt-branch">  \u2502  \u2514\u2500</span> clicks < 10 \u2192 <span class="rt-wait">R11: Wait for data</span>\n` +
        `<span class="rt-branch">  \u2514\u2500</span> <span class="rt-cond">Has sales \u2192 evaluate ACOS</span>\n` +
        `<span class="rt-branch">     \u251C\u2500</span> acos > 45% \u2192 <span class="rt-lower">R12: Lower bid 15%</span>\n` +
        `<span class="rt-branch">     \u251C\u2500</span> 30% < acos \u2264 45% \u2192 <span class="rt-lower">R13: Lower bid 7.5%</span>\n` +
        `<span class="rt-branch">     \u251C\u2500</span> acos \u2264 30% & orders \u2265 3 \u2192 <span class="rt-skc">R14: Isolate to SKC</span>\n` +
        `<span class="rt-branch">     \u2514\u2500</span> acos \u2264 30% & orders < 3 \u2192 <span class="rt-raise">R15: Raise bid 20%</span>` +
        `</div></div>`;
    }

    if (sec.key === 'tacos') {
      html += `<div class="rules-tacos-journey">
        <div class="rules-tacos-step rt-launch"><div class="rts-label">Launch</div><div class="rts-range">&gt; 25%</div><div class="rts-months">Month 1-2</div></div>
        <div class="rules-tacos-step rt-growth"><div class="rts-label">Growth</div><div class="rts-range">15-25%</div><div class="rts-months">Month 3-4</div></div>
        <div class="rules-tacos-step rt-momentum"><div class="rts-label">Momentum</div><div class="rts-range">10-15%</div><div class="rts-months">Month 5-6</div></div>
        <div class="rules-tacos-step rt-mature"><div class="rts-label">Mature</div><div class="rts-range">8-12%</div><div class="rts-months">Month 6+</div></div>
      </div>`;
    }

    if (sec.key === 'funnel') {
      html += `<div class="rules-funnel">
        <div class="rules-funnel-stage"><div class="rf-label">Impression</div><div class="rf-fix">R30: bid/keyword</div></div>
        <div class="rules-funnel-stage"><div class="rf-label">Click</div><div class="rf-fix">R31: image/title</div></div>
        <div class="rules-funnel-stage"><div class="rf-label">Add to Cart</div><div class="rf-fix">R32: listing</div></div>
        <div class="rules-funnel-stage"><div class="rf-label">Purchase</div><div class="rf-fix">R32: price/reviews</div></div>
        <div class="rules-funnel-stage"><div class="rf-label">Organic Rank</div><div class="rf-fix">R33-34: budget</div></div>
      </div>`;
    }

    sec.rules.forEach(r => {
      const actionHtml = r.action === '__ALLOC__'
        ? `<div class="rules-alloc-bar">
            <div class="rules-alloc-seg seg-skc">50%</div>
            <div class="rules-alloc-seg seg-discovery">25%</div>
            <div class="rules-alloc-seg seg-competitor">15%</div>
            <div class="rules-alloc-seg seg-defensive">10%</div>
          </div>
          <div class="rules-alloc-legend">
            <span><span class="rules-alloc-dot" style="background:var(--blue)"></span> SKC 50%</span>
            <span><span class="rules-alloc-dot" style="background:var(--purple)"></span> Discovery 25%</span>
            <span><span class="rules-alloc-dot" style="background:var(--yellow)"></span> Competitor 15%</span>
            <span><span class="rules-alloc-dot" style="background:var(--red)"></span> Defensive 10%</span>
          </div>`
        : `<div class="rule-action-text">${r.action}</div>`;

      html += `<div class="rule-card">
        <div class="rule-id-strip p-${r.priority}">${r.id}</div>
        <div class="rule-body">
          <div class="rule-title-row">
            <span class="rule-name">${r.name}</span>
            <span class="rule-badge rb-${r.priority}">${r.priority}</span>
            <span class="rule-badge ${r.auto ? 'rb-auto' : 'rb-manual'}">${r.auto ? 'Auto' : 'Manual'}</span>
          </div>
          <div class="rule-condition">${r.cond}</div>
          ${actionHtml}
          ${r.desc ? `<div class="rule-desc">${r.desc}</div>` : ''}
        </div>
      </div>`;
    });

    html += '</div>';
  });

  container.innerHTML = html;
}

function initRulesFilter() {
  const filter = document.getElementById('rulesFilter');
  if (!filter) return;

  const secs = [];
  const seen = new Set();
  SOP_RULES.forEach(r => {
    if (r.secNum && !seen.has(r.sec)) {
      seen.add(r.sec);
      secs.push({ key: r.sec, label: r.secTitle });
    }
  });

  filter.innerHTML = `<button class="rules-filter-btn active" data-sec="all">All</button>` +
    secs.map(s => `<button class="rules-filter-btn" data-sec="${s.key}">${s.label}</button>`).join('');

  filter.querySelectorAll('.rules-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filter.querySelectorAll('.rules-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderRules(btn.dataset.sec);
    });
  });
}

initRulesFilter();
renderRules('all');

/* ── RULE FLOWS TAB ──────────────────────────────────────── */

const FLOW_DATA = [
  {
    title: 'Flow 1 — Pre-Launch Readiness', color: '#f59e0b', rules: 'R01  R02  R03',
    steps: [
      { r:'', label:'New Product', type:'start' },
      { r:'R01', label:'Reviews ≥ 15?', type:'decision', yes:'R02', no:'BLOCK — Enroll in Vine. Wait.' },
      { r:'R02', label:'Calculate break-even ACOS', type:'action', detail:'(price − COGS − FBA − storage) / price' },
      { r:'R03', label:'Keyword list ≥ 30?', type:'decision', yes:'Launch PPC', no:'Research: Helium10 / Cerebro' },
      { r:'', label:'Ready to Launch PPC', type:'end' },
    ]
  },
  {
    title: 'Flow 2 — Launch Phase (Weeks 1–4)', color: '#3b82f6', rules: 'R04  R05  R06  R07',
    steps: [
      { r:'', label:'Launch Day', type:'start' },
      { r:'R04', label:'Wait 7 days — NO changes allowed', type:'action' },
      { r:'R05', label:'Set Auto campaign CPC = $0.50–$0.75', type:'action' },
      { r:'R06', label:'Set TOS modifier 50–100% on Ranking campaigns', type:'action' },
      { r:'', label:'Week 2: Pull Search Term Report', type:'info' },
      { r:'R07', label:'ACOS > break-even during launch?', type:'decision', yes:'NORMAL — rank investment. Keep running.', no:'Scale harder — increase bids' },
      { r:'', label:'Month 2: Begin Optimization', type:'end' },
    ]
  },
  {
    title: 'Flow 3 — Bid Optimization Decision Tree', color: '#ef4444', rules: 'R08  R09  R10  R11  R12  R13  R14  R15',
    steps: [
      { r:'', label:'Review Keyword', type:'start' },
      { r:'', label:'Has impressions?', type:'decision',
        no:'R08 — Raise bid 25%',
        yes:'Next: check clicks' },
      { r:'', label:'Has clicks?', type:'decision',
        no:'R09 — Fix main image & title (if ≥100 impr)\nR11 — Wait for data (if <100 impr)',
        yes:'Next: check orders' },
      { r:'', label:'Has orders?', type:'decision',
        no:'R10 — NEGATE: add negative exact (if ≥10 clicks)\nR11 — Wait for data (if <10 clicks)',
        yes:'Next: evaluate ACOS' },
      { r:'', label:'ACOS vs Thresholds', type:'decision',
        branches: [
          'R12 — ACOS > 45%: Lower bid 15%',
          'R13 — 30% < ACOS ≤ 45%: Lower bid 7.5%',
          'R14 — ACOS ≤ 30%, ≥3 orders: Isolate → SKC',
          'R15 — ACOS ≤ 30%, <3 orders: Raise bid 20%',
        ]
      },
    ]
  },
  {
    title: 'Flow 4 — Negative Keyword Harvest', color: '#dc2626', rules: 'R16  R17  R18',
    steps: [
      { r:'', label:'Pull Search Term Report', type:'start' },
      { r:'R16', label:'clicks ≥ 10 AND orders == 0?', type:'decision', yes:'Add as NEGATIVE EXACT', no:'Check ACOS' },
      { r:'R17', label:'ACOS > 45% break-even?', type:'decision', yes:'Add as NEGATIVE EXACT', no:'Check if winner' },
      { r:'R14', label:'ACOS ≤ 30% AND orders ≥ 2?', type:'decision', yes:'Promote to SKC campaign', no:'Monitor — needs data' },
      { r:'R18', label:'Winner in Exact campaign? → Negate in Auto/Phrase/Broad', type:'action' },
      { r:'', label:'Apply negatives weekly', type:'end' },
    ]
  },
  {
    title: 'Flow 5 — Placement & Dayparting', color: '#8b5cf6', rules: 'R19  R20  R21',
    steps: [
      { r:'', label:'Review Placement Report', type:'start' },
      { r:'R19', label:'TOS ACOS < Rest of Search ACOS?', type:'decision', yes:'Increase TOS modifier', no:'Keep current' },
      { r:'R20', label:'Product pages converting well?', type:'decision', yes:'Do NOT pause — product pages working', no:'Reduce product page bids' },
      { r:'R21', label:'Midnight–6am: high spend, low conversion?', type:'decision', yes:'Reduce bids overnight', no:'Keep 24/7 bids' },
      { r:'', label:'Placement optimized', type:'end' },
    ]
  },
  {
    title: 'Flow 6 — Scaling Phase & Budget', color: '#10b981', rules: 'R22  R23  R24',
    steps: [
      { r:'', label:'Enter Scaling Phase', type:'start' },
      { r:'R22', label:'TACOS > threshold for current phase?', type:'decision', yes:'BLOCK — return to optimize first', no:'Proceed to allocate' },
      { r:'R23', label:'Allocate total PPC budget', type:'action',
        branches: ['50% → Proven SKC campaigns', '25% → Discovery (Auto + Broad + Phrase)', '15% → Competitor ASIN targeting', '10% → Defensive brand campaigns'] },
      { r:'R24', label:'Reviews < 30?', type:'decision', yes:'Enroll in Vine', no:'Continue scaling' },
      { r:'', label:'Full Scaling Mode', type:'end' },
    ]
  },
  {
    title: 'Flow 7 — TACOS Phase Classification', color: '#6366f1', rules: 'R25  R26  R27  R28  R29',
    steps: [
      { r:'', label:'Calculate TACOS = adSpend / totalRevenue', type:'start' },
      { r:'R25', label:'TACOS > 25%?', type:'decision', yes:'Phase = LAUNCH (month 1–2)', no:'Check next' },
      { r:'R26', label:'15% < TACOS ≤ 25%?', type:'decision', yes:'Phase = OPTIMIZE (month 3–4)', no:'Check next' },
      { r:'R27', label:'TACOS ≤ 15%', type:'action', detail:'Phase = SCALE / MATURE (month 5+)' },
      { r:'R28', label:'TACOS trend worsening (2 weeks)?', type:'decision', yes:'PAUSE scaling → return to optimize', no:'Stay current' },
      { r:'R29', label:'TACOS trend improving → Stay in current phase', type:'action' },
    ]
  },
  {
    title: 'Flow 8 — Funnel Diagnostic', color: '#06b6d4', rules: 'R30  R31  R32  R33  R34',
    steps: [
      { r:'', label:'Sales stalled — diagnose the funnel', type:'start' },
      { r:'R30', label:'No impressions?', type:'decision', yes:'FIX: Raise bid or swap keyword', no:'Next stage' },
      { r:'R31', label:'Impressions but no clicks?', type:'decision', yes:'FIX: Main image, title, price', no:'Next stage' },
      { r:'R32', label:'Clicks but no orders?', type:'decision', yes:'FIX: Listing quality, price, reviews', no:'Next stage' },
      { r:'R33', label:'Good ACOS but organic not improving?', type:'decision', yes:'FIX: Increase budget + external traffic', no:'Next stage' },
      { r:'R34', label:'Good PPC but organic declining?', type:'decision', yes:'FIX: Increase TOS modifier + external traffic', no:'Healthy funnel' },
      { r:'', label:'Healthy Funnel', type:'end' },
    ]
  },
  {
    title: 'Flow 9 — Weekly Maintenance Checklist', color: '#f97316', rules: 'R35  R36  R19  R20',
    steps: [
      { r:'', label:'Monday Morning', type:'start' },
      { r:'', label:'Step 1: Pull Search Term Report → R16-R17', type:'action' },
      { r:'', label:'Step 2: Negate bleeders, promote winners → R14', type:'action' },
      { r:'', label:'Step 3: Adjust bids per decision tree → R08-R15', type:'action' },
      { r:'R36', label:'Enforce: min 7 days between bid changes', type:'info' },
      { r:'R19', label:'Check placement report: TOS vs Rest', type:'action' },
      { r:'R35', label:'Budget ≥ 90% daily cap? → Increase or reallocate', type:'decision', yes:'Increase budget', no:'OK' },
      { r:'', label:'Step 7: Calculate TACOS → R25-R29', type:'action' },
      { r:'', label:'Done — see you next Monday', type:'end' },
    ]
  }
];

function renderFlows() {
  const container = document.getElementById('flowsContainer');
  if (!container) return;

  container.innerHTML = FLOW_DATA.map(flow => {
    const stepsHtml = flow.steps.map((s, i) => {
      const rBadge = s.r ? `<span class="fs-rule">${s.r}</span>` : '';
      const typeCls = `fs-${s.type}`;
      let extra = '';

      if (s.branches) {
        extra = `<div class="fs-branches">${s.branches.map(b =>
          `<div class="fs-branch-item">${b}</div>`).join('')}</div>`;
      }
      if (s.yes || s.no) {
        extra += `<div class="fs-yn">`;
        if (s.yes) extra += `<div class="fs-yes"><span class="fs-yn-tag">YES</span> ${s.yes}</div>`;
        if (s.no) extra += `<div class="fs-no"><span class="fs-yn-tag">NO</span> ${s.no}</div>`;
        extra += `</div>`;
      }
      if (s.detail) {
        extra += `<div class="fs-detail">${s.detail}</div>`;
      }

      const arrow = i < flow.steps.length - 1 ? '<div class="fs-arrow">▼</div>' : '';

      return `<div class="flow-step ${typeCls}">${rBadge}<div class="fs-label">${s.label}</div>${extra}</div>${arrow}`;
    }).join('');

    return `<div class="flow-card">
      <div class="flow-hdr" style="border-left-color:${flow.color}">
        <h3>${flow.title}</h3>
        <div class="flow-rule-pills">${flow.rules.split('  ').map(r =>
          `<span class="flow-pill">${r}</span>`).join('')}</div>
      </div>
      <div class="flow-steps">${stepsHtml}</div>
    </div>`;
  }).join('');
}

renderFlows();

/* ── SOP DIAGRAMS TAB ──────────────────────────────────────── */

const SOP_DIAGRAMS = [
  {
    tag: 'Flow 1',
    title: 'Pre-Launch Readiness Check',
    img: 'https://mermaid.ink/img/Zmxvd2NoYXJ0IFRECiAgICBBKFtTdGFydDogTmV3IFByb2R1Y3RdKSAtLT4gQntMaXN0aW5nIE9wdGltaXplZD99CiAgICBCIC0tIE5vIC0tPiBCMVtGaXg6IFRpdGxlIEJ1bGxldHMgQmFja2VuZCBLV3MgSW1hZ2VzXQogICAgQjEgLS0+IEIKICAgIEIgLS0gWWVzIC0tPiBDe1Jldmlld3MgPj0gMTU/fQogICAgQyAtLSBObyAtLT4gQzFbRW5yb2xsIGluIFZpbmUgb3IgUnVuIGdpdmVhd2F5c10KICAgIEMxIC0tPiBDCiAgICBDIC0tIFllcyAtLT4gRHtNYXJnaW4gQ2FsY3VsYXRlZD99CiAgICBEIC0tIE5vIC0tPiBEMVtQcmljZSBtaW51cyBDT0dTIG1pbnVzIEZCQSBtaW51cyBTdG9yYWdlID0gTWFyZ2luXQogICAgRDEgLS0+IEQyW1NldCBUYXJnZXQgQUNPUyBhbmQgQnJlYWstZXZlbiBBQ09TXQogICAgRDIgLS0+IEQKICAgIEQgLS0gWWVzIC0tPiBFe0tleXdvcmQgTGlzdCBSZWFkeSAzMC01MCBLV3M/fQogICAgRSAtLSBObyAtLT4gRTFbVXNlIEhlbGl1bTEwIG9yIERhdGFGb3JTRU9dCiAgICBFMSAtLT4gRQogICAgRSAtLSBZZXMgLS0+IEYoW1JlYWR5IHRvIExhdW5jaCBQUENdKQogICAgc3R5bGUgQSBmaWxsOiNmZjk5MDAsY29sb3I6I2ZmZixzdHJva2U6bm9uZQogICAgc3R5bGUgRiBmaWxsOiMwMGIzMDAsY29sb3I6I2ZmZixzdHJva2U6bm9uZQ==?type=png',
  },
  {
    tag: 'Flow 2',
    title: 'Campaign Structure Architecture',
    img: 'https://mermaid.ink/img/Zmxvd2NoYXJ0IExSCiAgICBzdWJncmFwaCBESVNDT1ZFUllbRGlzY292ZXJ5IExheWVyXQogICAgICAgIEExW0F1dG8gQ2FtcGFpZ24gTG93IGJpZCBIYXJ2ZXN0IHRlcm1zXQogICAgICAgIEEyW0Jyb2FkIGFuZCBQaHJhc2UgTWlkLWZ1bm5lbCBkaXNjb3ZlcnldCiAgICBlbmQKICAgIHN1YmdyYXBoIFJBTktJTkdbUmFua2luZyBMYXllcl0KICAgICAgICBCMVtSYW5raW5nIENhbXBhaWduIEV4YWN0IFRvcCA1LTEwIEtXcyBIaWdoIFRPUyBtb2RpZmllcl0KICAgICAgICBCMltTaW5nbGUgS2V5d29yZCBDYW1wYWlnbnMgU0tDIE9uZSBLVyBwZXIgY2FtcGFpZ25dCiAgICBlbmQKICAgIHN1YmdyYXBoIFRBUkdFVElOR1tUYXJnZXRpbmcgTGF5ZXJdCiAgICAgICAgQzFbUHJvZHVjdCBUYXJnZXRpbmcgQ29tcGV0aXRvciBBU0lOc10KICAgICAgICBDMltEZWZlbnNpdmUgQnJhbmQgT3duIGJyYW5kIG5hbWVdCiAgICBlbmQKICAgIEExIC0tIFdlZWtseSBoYXJ2ZXN0IHdpbm5pbmcgc2VhcmNoIHRlcm1zIC0tPiBCMgogICAgQTIgLS0gV2lubmluZyBLV3MgcHJvbW90ZSB0byBTS0MgLS0+IEIyCiAgICBCMSAtLSBQcm92ZW4gdG9wIEtXIGlzb2xhdGVkIGZvciBzY2FsZSAtLT4gQjIKICAgIHN0eWxlIEExIGZpbGw6I2ZmOTkwMCxjb2xvcjojZmZmLHN0cm9rZTpub25lCiAgICBzdHlsZSBCMSBmaWxsOiMwMDc3YjYsY29sb3I6I2ZmZixzdHJva2U6bm9uZQogICAgc3R5bGUgQzEgZmlsbDojMDBiMzAwLGNvbG9yOiNmZmYsc3Ryb2tlOm5vbmUKICAgIHN0eWxlIEMyIGZpbGw6IzAwYjMwMCxjb2xvcjojZmZmLHN0cm9rZTpub25l?type=png',
  },
  {
    tag: 'Flow 3',
    title: 'Launch Phase — Weeks 1-4',
    img: 'https://mermaid.ink/img/Zmxvd2NoYXJ0IFRECiAgICBBKFtMYXVuY2ggRGF5XSkgLS0+IEJbU2V0IHVwIDQgY2FtcGFpZ25zIEF1dG8gRXhhY3QgUGhyYXNlIFBUXQogICAgQiAtLT4gQ1tTZXQgVE9TIG1vZGlmaWVyIDUwLTEwMCUgb24gUmFua2luZyBjYW1wYWlnbl0KICAgIEMgLS0+IERbV2FpdCA3IGRheXMgZG8gTk9UIGNoYW5nZSBhbnl0aGluZ10KICAgIEQgLS0+IEV7V2VlayAyIFB1bGwgU2VhcmNoIFRlcm0gUmVwb3J0fQogICAgRSAtLT4gRltXaW5uZXJzIENsaWNrcyBhbmQgU2FsZXMgYW5kIExvdyBBQ09TXQogICAgRSAtLT4gR1tCbGVlZGVycyBTcGVuZCBhbmQgMCBTYWxlc10KICAgIEYgLS0+IEYxW1Byb21vdGUgdG8gU0tDIGNhbXBhaWduXQogICAgRyAtLT4gRzFbQWRkIGFzIE5lZ2F0aXZlIEV4YWN0IGltbWVkaWF0ZWx5XQogICAgRjEgLS0+IEh7V2Vla3MgMy00IFNDQUxJTkcgcGhhc2V9CiAgICBHMSAtLT4gSAogICAgSCAtLT4gSVtJbmNyZWFzZSBidWRnZXRzIG9uIGNvbnZlcnRpbmcgY2FtcGFpZ25zXQogICAgSSAtLT4gS3tBQ09TIGFib3ZlIGJyZWFrLWV2ZW4/fQogICAgSyAtLSBZZXMgLS0+IEsxW05vcm1hbCB0aGlzIGlzIHJhbmsgaW52ZXN0bWVudF0KICAgIEsgLS0gTm8gLS0+IEsyW1NjYWxlIGhhcmRlciBpbmNyZWFzZSBiaWRzXQogICAgSzEgLS0+IEwoW01vbnRoIDIgQmVnaW4gT3B0aW1pemF0aW9uIFBoYXNlXSkKICAgIEsyIC0tPiBMCiAgICBzdHlsZSBBIGZpbGw6I2ZmOTkwMCxjb2xvcjojZmZmLHN0cm9rZTpub25lCiAgICBzdHlsZSBMIGZpbGw6IzAwNzdiNixjb2xvcjojZmZmLHN0cm9rZTpub25lCiAgICBzdHlsZSBLMSBmaWxsOiNlZWZmZjAsc3Ryb2tlOiMwMGIzMDA=?type=png',
  },
  {
    tag: 'Flow 4',
    title: 'Bid Optimization Decision Tree',
    img: 'https://mermaid.ink/img/Zmxvd2NoYXJ0IFRECiAgICBBKFtSZXZpZXcgS2V5d29yZF0pIC0tPiBCe0ltcHJlc3Npb25zP30KICAgIEIgLS0gTm9uZSAtLT4gQjFbUmFpc2UgYmlkIDIwLTMwJV0KICAgIEIgLS0gWWVzIC0tPiBDe0NsaWNrcz99CiAgICBDIC0tIE5vbmUgLS0+IEMxe0tleXdvcmQgcmVsZXZhbnQ/fQogICAgQzEgLS0gTm8gLS0+IEMyW1BhdXNlIG9yIFN3YXAgZm9yIGJldHRlciBLV10KICAgIEMxIC0tIFllcyAtLT4gQzNbQ2hlY2sgbWFpbiBpbWFnZSBhbmQgdGl0bGVdCiAgICBDIC0tIFllcyAtLT4gRHtTYWxlcz99CiAgICBEIC0tIE5vbmUgMTArIGNsaWNrcyAtLT4gRDFbUGF1c2UgYW5kIEFkZCBhcyBOZWdhdGl2ZV0KICAgIEQgLS0gTm9uZSBsZXNzIDEwIGNsaWNrcyAtLT4gRDJbV2FpdCBuZWVkIG1vcmUgZGF0YV0KICAgIEQgLS0gWWVzIC0tPiBFe0FDT1MgdnMgVGFyZ2V0P30KICAgIEUgLS0gSGlnaCBBQ09TIGZldyBzYWxlcyAtLT4gRTFbTG93ZXIgYmlkIDEwLTIwJV0KICAgIEUgLS0gSGlnaCBBQ09TIGdvb2Qgc2FsZXMgLS0+IEUye0RyaXZpbmcgb3JnYW5pYyByYW5rP30KICAgIEUyIC0tIFllcyAtLT4gRTNbS2VlcCBydW5uaW5nIHJhbmsgaW52ZXN0bWVudF0KICAgIEUyIC0tIE5vIC0tPiBFNFtMb3dlciBiaWQgMTAtMjAlXQogICAgRSAtLSBBdCB0YXJnZXQgLS0+IEU1W0xlYXZlIGl0IGFsb25lXQogICAgRSAtLSBMb3cgQUNPUyBnb29kIHNhbGVzIC0tPiBFNltJc29sYXRlIHRvIFNLQyBJbmNyZWFzZSBidWRnZXRdCiAgICBzdHlsZSBBIGZpbGw6I2ZmOTkwMCxjb2xvcjojZmZmLHN0cm9rZTpub25lCiAgICBzdHlsZSBEMSBmaWxsOiNmZmVhZWEsc3Ryb2tlOiNjYzAwMDAKICAgIHN0eWxlIEUzIGZpbGw6I2VlZmZmMCxzdHJva2U6IzAwYjMwMAogICAgc3R5bGUgRTYgZmlsbDojZWVmOGZmLHN0cm9rZTojMDA3N2I2?type=png',
  },
  {
    tag: 'Flow 5',
    title: 'Sales Funnel Diagnostic',
    img: 'https://mermaid.ink/img/Zmxvd2NoYXJ0IExSCiAgICBBKFtLZXl3b3JkIFNlYXJjaGVkXSkgLS0+IEJ7SW1wcmVzc2lvbnM/fQogICAgQiAtLSBObyAtLT4gQjFbRklYIFJhaXNlIGJpZCBDaGVjayBrZXl3b3JkIHJlbGV2YW5jZV0KICAgIEIgLS0gWWVzIC0tPiBDe0NsaWNrcz99CiAgICBDIC0tIE5vIC0tPiBDMVtGSVggV2VhayBtYWluIGltYWdlIEJhZCB0aXRsZSBIaWdoIHByaWNlXQogICAgQyAtLSBZZXMgLS0+IER7QWRkIHRvIENhcnQ/fQogICAgRCAtLSBObyAtLT4gRDFbRklYIExpc3RpbmcgcXVhbGl0eSBJbWFnZXMgQnVsbGV0cyBSZXZpZXdzXQogICAgRCAtLSBZZXMgLS0+IEV7UHVyY2hhc2U/fQogICAgRSAtLSBObyAtLT4gRTFbRklYIFByaWNlIFNoaXBwaW5nIHNwZWVkIFJldHVybiBwb2xpY3ldCiAgICBFIC0tIFllcyAtLT4gRntPcmdhbmljIHJhbmsgaW1wcm92aW5nP30KICAgIEYgLS0gTm8gLS0+IEYxW0ZJWCBJbmNyZWFzZSBidWRnZXQgRXh0ZXJuYWwgdHJhZmZpYyBTb2NpYWwgbWVkaWFdCiAgICBGIC0tIFllcyAtLT4gRyhbSGVhbHRoeSBGdW5uZWxdKQogICAgc3R5bGUgQSBmaWxsOiNmZjk5MDAsY29sb3I6I2ZmZixzdHJva2U6bm9uZQogICAgc3R5bGUgRyBmaWxsOiMwMGIzMDAsY29sb3I6I2ZmZixzdHJva2U6bm9uZQogICAgc3R5bGUgQjEgZmlsbDojZmZlYWVhLHN0cm9rZTojY2MwMDAwCiAgICBzdHlsZSBDMSBmaWxsOiNmZmVhZWEsc3Ryb2tlOiNjYzAwMDAKICAgIHN0eWxlIEQxIGZpbGw6I2ZmZWFlYSxzdHJva2U6I2NjMDAwMAogICAgc3R5bGUgRTEgZmlsbDojZmZlYWVhLHN0cm9rZTojY2MwMDAwCiAgICBzdHlsZSBGMSBmaWxsOiNmZmYzZDYsc3Ryb2tlOiNmZjk5MDA=?type=png',
  },
  {
    tag: 'Flow 6',
    title: 'Scaling Phase — Budget Allocation',
    img: 'https://mermaid.ink/img/Zmxvd2NoYXJ0IFRECiAgICBBKFtTdGFydCBTY2FsaW5nXSkgLS0+IEJ7VEFDT1MgaGVhbHRoeT99CiAgICBCIC0tIE5vIC0tPiBCMVtGaXggb3B0aW1pemF0aW9uIGZpcnN0XQogICAgQiAtLSBZZXMgLS0+IENbVG90YWwgTW9udGhseSBQUEMgQnVkZ2V0XQogICAgQyAtLT4gRFs1MHBjdCBQcm92ZW4gU0tDIENhbXBhaWduc10KICAgIEMgLS0+IEVbMjVwY3QgRGlzY292ZXJ5IEF1dG8gQnJvYWQgUGhyYXNlXQogICAgQyAtLT4gRlsxNXBjdCBDb21wZXRpdG9yIEFTSU4gVGFyZ2V0aW5nXQogICAgQyAtLT4gR1sxMHBjdCBEZWZlbnNpdmUgQnJhbmQgQ2FtcGFpZ25zXQogICAgRCAtLT4gSFtJbmNyZWFzZSBiaWRzIG9uIHRvcCA1IFNLQyBrZXl3b3Jkc10KICAgIEUgLS0+IElbSGFydmVzdCBuZXcgdGVybXMgd2Vla2x5IGZyb20gQXV0b10KICAgIEYgLS0+IEpbVGFyZ2V0IHRvcCAzLTUgY29tcGV0aXRvciBBU0lOc10KICAgIEcgLS0+IEtbUHJvdGVjdCBicmFuZGVkIHNlYXJjaCB0cmFmZmljXQogICAgSCAmIEkgJiBKICYgSyAtLT4gTHtFeHRlcm5hbCBUcmFmZmljP30KICAgIEwgLS0gTm90IHlldCAtLT4gTVtMYXVuY2ggVGlrVG9rIEluc3RhZ3JhbSBGYWNlYm9vayBWaW5lXQogICAgTCAtLSBSdW5uaW5nIC0tPiBOKFtGdWxsIFNjYWxpbmcgTW9kZV0pCiAgICBNIC0tPiBOCiAgICBzdHlsZSBBIGZpbGw6I2ZmOTkwMCxjb2xvcjojZmZmLHN0cm9rZTpub25lCiAgICBzdHlsZSBOIGZpbGw6IzAwYjMwMCxjb2xvcjojZmZmLHN0cm9rZTpub25lCiAgICBzdHlsZSBCMSBmaWxsOiNmZmVhZWEsc3Ryb2tlOiNjYzAwMDA=?type=png',
  },
  {
    tag: 'Flow 7',
    title: 'Weekly Maintenance Cycle',
    img: 'https://mermaid.ink/img/Zmxvd2NoYXJ0IExSCiAgICBBKFtNb25kYXkgTW9ybmluZ10pIC0tPiBCW1B1bGwgU2VhcmNoIFRlcm0gUmVwb3J0XQogICAgQiAtLT4gQ1tBZGQgYmxlZWRlcnMgYXMgTmVnYXRpdmUgRXhhY3RdCiAgICBDIC0tPiBEW1Byb21vdGUgd2lubmVycyB0byBTS0NdCiAgICBEIC0tPiBFW1JldmlldyB0b3AgMjAgS1dzIEFkanVzdCBiaWRzXQogICAgRSAtLT4gRltDaGVjayBwbGFjZW1lbnQgcmVwb3J0IFRPUyB2cyBQcm9kdWN0IFBhZ2VzXQogICAgRiAtLT4gR1tSZXZpZXcgYnVkZ2V0IHV0aWxpemF0aW9uXQogICAgRyAtLT4gSHtDYW1wYWlnbnMgaGl0dGluZyBidWRnZXQgY2FwP30KICAgIEggLS0gWWVzIC0tPiBIMVtJbmNyZWFzZSBidWRnZXQgb3Igc2hpZnQgZnJvbSBsb3cgcGVyZm9ybWVyc10KICAgIEggLS0gTm8gLS0+IElbQ2hlY2sgb3JnYW5pYyByYW5rIGZvciB0b3AgNSBLV3NdCiAgICBIMSAtLT4gSQogICAgSSAtLT4gSltDYWxjdWxhdGUgVEFDT1MgZm9yIHRoZSB3ZWVrXQogICAgSiAtLT4gS3tUQUNPUyB0cmVuZD99CiAgICBLIC0tIEltcHJvdmluZyAtLT4gSzFbU3RheSBpbiBjdXJyZW50IHBoYXNlXQogICAgSyAtLSBXb3JzZW5pbmcgLS0+IEsyW1BhdXNlIHNjYWxpbmcgUmV0dXJuIHRvIG9wdGltaXphdGlvbl0KICAgIEsgLS0gU3RhYmxlIC0tPiBLM1tDb250aW51ZSBjdXJyZW50IHBoYXNlXQogICAgSzEgJiBLMiAmIEszIC0tPiBMKFtEb25lIFNlZSB5b3UgbmV4dCBNb25kYXldKQogICAgc3R5bGUgQSBmaWxsOiNmZjk5MDAsY29sb3I6I2ZmZixzdHJva2U6bm9uZQogICAgc3R5bGUgTCBmaWxsOiMwMGIzMDAsY29sb3I6I2ZmZixzdHJva2U6bm9uZQogICAgc3R5bGUgSzIgZmlsbDojZmZlYWVhLHN0cm9rZTojY2MwMDAw?type=png',
  },
  {
    tag: 'Flow 8',
    title: 'TACOS Journey — Launch to Organic',
    img: 'https://mermaid.ink/img/Zmxvd2NoYXJ0IExSCiAgICBBKFtNb250aCAxLTIgTGF1bmNoIFRBQ09TIDI1LTQwJV0pIC0tPiBCKFtNb250aCAzLTQgR3Jvd3RoIFRBQ09TIDE1LTI1JV0pCiAgICBCIC0tPiBDKFtNb250aCA1LTYgTW9tZW50dW0gVEFDT1MgMTAtMTUlXSkKICAgIEMgLS0+IEQoW01vbnRoIDYrIE1hdHVyZSBUQUNPUyA4LTEyJV0pCiAgICBEIC0tPiBFKFtPcmdhbmljIExlYWRlcl0pCiAgICBzdHlsZSBBIGZpbGw6I2ZmNDQ0NCxjb2xvcjojZmZmLHN0cm9rZTpub25lCiAgICBzdHlsZSBCIGZpbGw6I2ZmOTkwMCxjb2xvcjojZmZmLHN0cm9rZTpub25lCiAgICBzdHlsZSBDIGZpbGw6IzAwNzdiNixjb2xvcjojZmZmLHN0cm9rZTpub25lCiAgICBzdHlsZSBEIGZpbGw6IzAwYjMwMCxjb2xvcjojZmZmLHN0cm9rZTpub25lCiAgICBzdHlsZSBFIGZpbGw6IzAwNWYwMCxjb2xvcjojZmZmLHN0cm9rZTpub25l?type=png',
  },
];

function renderDiagrams() {
  const container = document.getElementById('diagramsContainer');
  if (!container) return;

  container.innerHTML = SOP_DIAGRAMS.map(d => `
    <div class="diagram-card">
      <div class="diagram-hdr">
        <span class="diagram-tag">${d.tag}</span>
        <h3>${d.title}</h3>
      </div>
      <div class="diagram-img-wrap">
        <img src="${d.img}" alt="${d.title}" loading="lazy" />
      </div>
    </div>
  `).join('');
}

renderDiagrams();

/* ── PENDING CHANGES TAB ─────────────────────────────────── */

async function loadPendingChanges() {
  const container = document.getElementById('pendingContainer');
  if (!container) return;
  try {
    const data = await apiFetch('/api/pending');
    const changes = data.changes || [];
    document.getElementById('pendingCount').textContent = `${changes.length} pending`;

    if (changes.length === 0) {
      container.innerHTML = '<div class="empty-state">No pending changes. All clear.</div>';
      return;
    }

    container.innerHTML = changes.map(c => `
      <div class="pending-card" data-id="${c.id}">
        <div class="pending-rule">${c.rule_id || '—'}</div>
        <div class="pending-body">
          <div class="pending-name">${escHtml(c.entity_name || c.entity_id || '—')}</div>
          <div class="pending-action">${escHtml(c.action)}: ${escHtml(c.old_value || '—')} → ${escHtml(c.new_value || '—')}</div>
          <div class="pending-reason">${escHtml(c.reason || '')}</div>
          <div class="pending-time">${new Date(c.created_at).toLocaleString()}</div>
        </div>
        <div class="pending-btns">
          <button class="btn btn-primary btn-sm" onclick="approvePending(${c.id})">Approve</button>
          <button class="btn btn-secondary btn-sm" onclick="rejectPending(${c.id})">Reject</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Could not load pending changes. Is the backend running?</div>`;
  }
}

function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

async function approvePending(id) {
  try {
    await apiFetch(`/api/pending/${id}/approve`, { method: 'POST' });
    showToast('Change approved', 'success');
    loadPendingChanges();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function rejectPending(id) {
  try {
    await apiFetch(`/api/pending/${id}/reject`, { method: 'POST' });
    showToast('Change rejected', 'info');
    loadPendingChanges();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function approveAllPending() {
  try {
    const data = await apiFetch('/api/pending/approve-all', { method: 'POST' });
    showToast(`${data.approved} changes approved`, 'success');
    loadPendingChanges();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

/* ── ACTIVITY LOG TAB ────────────────────────────────────── */

async function loadActivityLog() {
  const container = document.getElementById('activityContainer');
  if (!container) return;
  try {
    const data = await apiFetch('/api/audit-log?limit=200');
    const entries = data.entries || [];
    const filter = document.getElementById('activityFilter')?.value;
    const filtered = filter ? entries.filter(e => e.status === filter) : entries;

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">No activity entries found.</div>';
      return;
    }

    container.innerHTML = `<table class="activity-table">
      <thead><tr><th>Time</th><th>Rule</th><th>Entity</th><th>Action</th><th>Change</th><th>Status</th><th>Reason</th></tr></thead>
      <tbody>${filtered.map(e => `<tr class="activity-row status-${e.status}">
        <td class="at-time">${new Date(e.created_at).toLocaleString()}</td>
        <td class="at-rule">${e.rule_id || '—'}</td>
        <td class="at-entity">${escHtml(e.entity_name || e.entity_id || '—')}</td>
        <td class="at-action">${e.action}</td>
        <td class="at-change">${e.old_value ? escHtml(e.old_value) + ' → ' : ''}${escHtml(e.new_value || '—')}</td>
        <td><span class="status-badge sb-${e.status}">${e.status}</span></td>
        <td class="at-reason">${escHtml(e.reason || '')}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Could not load activity log. Is the backend running?</div>`;
  }
}

async function loadJobRuns() {
  const container = document.getElementById('jobRunsContainer');
  if (!container) return;
  try {
    const data = await apiFetch('/api/jobs?limit=20');
    const runs = data.runs || [];

    if (runs.length === 0) {
      container.innerHTML = '<div class="empty-state">No job runs recorded.</div>';
      return;
    }

    container.innerHTML = `<table class="activity-table">
      <thead><tr><th>Job</th><th>Started</th><th>Duration</th><th>Status</th><th>Changes</th></tr></thead>
      <tbody>${runs.map(r => {
        const dur = r.finished_at ? Math.round((new Date(r.finished_at) - new Date(r.started_at)) / 1000) + 's' : 'running...';
        return `<tr class="activity-row status-${r.status}">
          <td>${r.job_name}</td>
          <td class="at-time">${new Date(r.started_at).toLocaleString()}</td>
          <td>${dur}</td>
          <td><span class="status-badge sb-${r.status}">${r.status}</span></td>
          <td>${r.changes_count}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  } catch (e) {
    container.innerHTML = `<div class="empty-state">Could not load job runs.</div>`;
  }
}

function triggerJobPrompt() {
  const jobs = ['bid-optimization', 'search-term-harvest', 'tacos-check', 'weekly-maintenance'];
  const job = prompt('Which job to run?\n\n' + jobs.map((j,i) => `${i+1}. ${j}`).join('\n') + '\n\nEnter number or name:');
  if (!job) return;
  const name = jobs[parseInt(job)-1] || job.trim();
  apiFetch(`/api/jobs/${name}/run`, { method: 'POST' })
    .then(() => showToast(`Job "${name}" started`, 'success'))
    .catch(e => showToast('Error: ' + e.message, 'error'));
}

/* ── INIT ─────────────────────────────────────────────────── */
renderCampaigns();
updateLaunchStatus();
updatePhaseBadge();

/* ── API INTEGRATION ─────────────────────────────────────── */

// Init config bar
document.getElementById('apiBaseInput').value = API_BASE;
function saveApiBase() { setApiBase(document.getElementById('apiBaseInput').value); }

// Connection status
async function updateConnectionStatus() {
  const online = await checkApiConnection();
  const dot   = document.getElementById('connDot');
  const label = document.getElementById('connLabel');
  dot.className   = 'conn-dot ' + (online ? 'online' : 'offline');
  label.textContent = online ? 'Connected' : 'Offline';
  label.style.color = online ? 'var(--green)' : 'var(--text-3)';
}
updateConnectionStatus();
setInterval(updateConnectionStatus, 15000);

// Toast notifications
function showToast(msg, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Modal
let _modalCallback = null;
function showModal(title, bodyHtml, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('confirmModal').classList.remove('hidden');
  _modalCallback = onConfirm;
  document.getElementById('modalConfirmBtn').onclick = () => { closeModal(); onConfirm(); };
}
function closeModal() { document.getElementById('confirmModal').classList.add('hidden'); }

// Generic API fetch helper
async function apiFetch(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ── Load Dashboard from Amazon ────────────────────────────────
async function loadDashboardFromAmazon() {
  const btn = document.getElementById('loadDashboardBtn');
  btn.innerHTML = '<span class="spinner"></span>Loading...';
  btn.disabled = true;
  try {
    const data = await apiFetch('/api/metrics');
    const s = data.snapshot;
    document.getElementById('dash-spend').value    = data.adSpend.toFixed(2);
    document.getElementById('dash-adrev').value    = data.adRevenue.toFixed(2);
    document.getElementById('dash-totalrev').value = data.totalRevenue.toFixed(2);
    // Sync TACOS tab too
    document.getElementById('t-spend').value    = data.adSpend.toFixed(2);
    document.getElementById('t-adrev').value    = data.adRevenue.toFixed(2);
    document.getElementById('t-totalrev').value = data.totalRevenue.toFixed(2);
    updateDashboard();
    showToast('Live metrics loaded from Amazon', 'success');
  } catch (e) {
    showToast('Failed to load: ' + e.message, 'error');
  } finally {
    btn.innerHTML = '⬇ Load from Amazon';
    btn.disabled = false;
  }
}

// ── Load Keywords for Bid Optimizer ──────────────────────────
let _liveKeywords = [];
async function loadKeywordsForOptimizer() {
  showToast('Fetching keyword report from Amazon (may take 1-2 min)...', 'info');
  try {
    const { keywords } = await apiFetch('/api/keywords');
    _liveKeywords = keywords;
    if (keywords.length === 0) { showToast('No keywords found', 'error'); return; }
    // Populate first keyword into the form
    const kw = keywords[0];
    document.getElementById('b-kw').value     = kw.keyword || kw.keywordText || '';
    document.getElementById('b-bid').value    = (kw.bid?.value || 1.00).toString();
    document.getElementById('b-impr').value   = (kw.impressions || 0).toString();
    document.getElementById('b-clicks').value = (kw.clicks || 0).toString();
    document.getElementById('b-orders').value = (kw.purchases14d || 0).toString();
    document.getElementById('b-spend').value  = (kw.cost || 0).toFixed(2);
    document.getElementById('b-sales').value  = (kw.sales14d || 0).toFixed(2);
    document.getElementById('pushBidsBtn').style.display = 'block';
    showToast(`Loaded ${keywords.length} keywords. Showing first keyword.`, 'success');
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// ── Push Bid Changes to Amazon ────────────────────────────────
async function pushBidsToAmazon() {
  try {
    // First get a preview
    const previewData = await apiFetch('/api/bids/preview', {
      method: 'POST',
      body: JSON.stringify({ keywords: _liveKeywords.slice(0, 50) }),
    });
    const toChange = [...previewData.summary.raise, ...previewData.summary.lower, ...previewData.summary.negate];
    if (toChange.length === 0) { showToast('No bid changes recommended', 'info'); return; }

    const updates = toChange
      .filter(d => d.action.newBid)
      .map(d => ({ keywordId: d.keyword.keywordId, newBid: d.action.newBid }));

    const preview = `
      <strong>${updates.length} bid changes queued</strong>
      <ul style="margin:10px 0;padding-left:20px">
        ${updates.slice(0, 10).map(u => `<li>Keyword ${u.keywordId} → $${u.newBid}</li>`).join('')}
        ${updates.length > 10 ? `<li>...and ${updates.length - 10} more</li>` : ''}
      </ul>
      <p style="color:var(--red);margin-top:8px">⚠ This will write changes to your Amazon campaigns.</p>`;

    showModal('Confirm Bid Updates', preview, async () => {
      try {
        const result = await apiFetch('/api/bids/apply', {
          method: 'POST',
          body: JSON.stringify({ updates, dryRun: false }),
        });
        showToast(`${result.count} bids updated successfully`, 'success');
      } catch (e) { showToast('Error: ' + e.message, 'error'); }
    });
  } catch (e) { showToast('Failed: ' + e.message, 'error'); }
}

// ── Load STR from Amazon ──────────────────────────────────────
let _liveNegatives = [];
async function loadSTRFromAmazon() {
  showToast('Fetching Search Term Report from Amazon (may take 2-3 min)...', 'info');
  try {
    const data = await apiFetch('/api/str-report?days=30');
    strTerms = data.rows.map((r) => ({
      term:   r.searchTerm,
      clicks: r.clicks,
      orders: r.orders,
      spend:  r.spend,
      sales:  r.sales,
    }));
    _liveNegatives = data.result?.negativeRecommendations || [];
    renderSTR();
    if (_liveNegatives.length > 0) {
      document.getElementById('pushNegativesBtn').style.display = 'inline-block';
    }
    showToast(`Loaded ${strTerms.length} search terms from Amazon`, 'success');
  } catch (e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

// ── Push Negatives to Amazon ──────────────────────────────────
async function pushNegativesToAmazon() {
  if (_liveNegatives.length === 0) { showToast('No negatives to push', 'info'); return; }

  const negatives = _liveNegatives.map(n => ({
    campaignId:  n.campaignId,
    adGroupId:   '',   // will be resolved server-side if blank
    keywordText: n.searchTerm,
    matchType:   'NEGATIVE_EXACT',
  }));

  const preview = `
    <strong>${negatives.length} negative keywords to add</strong>
    <ul style="margin:10px 0;padding-left:20px">
      ${negatives.slice(0, 10).map(n => `<li>"${n.keywordText}" → ${n.campaignId}</li>`).join('')}
      ${negatives.length > 10 ? `<li>...and ${negatives.length - 10} more</li>` : ''}
    </ul>
    <p style="color:var(--red);margin-top:8px">⚠ This will add negative keywords to your Amazon campaigns.</p>`;

  showModal('Confirm Negative Keywords', preview, async () => {
    try {
      const result = await apiFetch('/api/negatives/apply', {
        method: 'POST',
        body: JSON.stringify({ negatives, dryRun: false }),
      });
      showToast(`${result.count} negative keywords applied`, 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
}
