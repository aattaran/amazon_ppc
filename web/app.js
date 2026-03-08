/* ── SOP Configuration ──────────────────────────────────────── */
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

/* ── Utilities ──────────────────────────────────────────────── */
const pct  = n => (n * 100).toFixed(1) + '%';
const usd  = n => '$' + Number(n).toFixed(2);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const escHtml = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

function colorClass(val, target, breakEven) {
  if (val <= target) return 'green';
  if (val <= breakEven) return 'yellow';
  return 'red';
}

/* ── API Fetch ──────────────────────────────────────────────── */
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

/* ── Loading / Error States ─────────────────────────────────── */
function showLoading(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '<div class="loading-overlay"><div class="spinner-lg"></div><span>Loading from Amazon...</span></div>';
}

function hideLoading(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const overlay = el.querySelector('.loading-overlay');
  if (overlay) overlay.remove();
}

function showError(id, msg, retryFn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `<div class="error-state">
    <div class="error-icon">!</div>
    <div class="error-msg">${escHtml(msg)}</div>
    ${retryFn ? '<button class="btn btn-secondary btn-sm error-retry">Retry</button>' : ''}
  </div>`;
  if (retryFn) el.querySelector('.error-retry').onclick = retryFn;
}

/* ── Toast Notifications ────────────────────────────────────── */
function showToast(msg, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span> ${escHtml(msg)}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ── Modal ───────────────────────────────────────────────────── */
function showModal(title, bodyHtml, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('confirmModal').classList.remove('hidden');
  document.getElementById('modalConfirmBtn').onclick = () => { closeModal(); onConfirm(); };
}
function closeModal() { document.getElementById('confirmModal').classList.add('hidden'); }

/* ── Sortable Table ─────────────────────────────────────────── */
const _sortState = {};

function renderSortableTable(containerId, columns, rows, options = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const stateKey = containerId;
  if (!_sortState[stateKey]) _sortState[stateKey] = { col: null, dir: 'desc' };
  const state = _sortState[stateKey];

  // Sort rows
  let sorted = [...rows];
  if (state.col !== null) {
    const colDef = columns[state.col];
    sorted.sort((a, b) => {
      let va = a[colDef.key], vb = b[colDef.key];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return state.dir === 'asc' ? -1 : 1;
      if (va > vb) return state.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Paginate
  const pageSize = options.pageSize || 200;
  const display = sorted.slice(0, pageSize);

  let html = '<table class="sortable-table"><thead><tr>';
  if (options.selectable) html += '<th class="checkbox-col"><input type="checkbox" class="select-all" /></th>';
  columns.forEach((col, i) => {
    const sortable = col.sortable !== false;
    const isActive = state.col === i;
    const arrow = isActive ? (state.dir === 'asc' ? ' ▲' : ' ▼') : '';
    html += `<th class="${sortable ? 'sortable' : ''} ${isActive ? 'sorted' : ''}" data-col="${i}">${col.label}${arrow}</th>`;
  });
  html += '</tr></thead><tbody>';

  if (display.length === 0) {
    html += `<tr><td colspan="${columns.length + (options.selectable ? 1 : 0)}" class="empty-cell">No data</td></tr>`;
  }

  display.forEach((row, ri) => {
    const rowCls = row._rowClass || '';
    html += `<tr class="${rowCls}" data-idx="${ri}">`;
    if (options.selectable) {
      html += `<td class="checkbox-col"><input type="checkbox" class="row-check" data-idx="${ri}" /></td>`;
    }
    columns.forEach(col => {
      const val = row[col.key];
      const formatted = col.formatter ? col.formatter(val, row) : (val ?? '—');
      html += `<td>${formatted}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  if (sorted.length > pageSize) {
    html += `<div class="table-truncated">Showing ${pageSize} of ${sorted.length} rows</div>`;
  }

  el.innerHTML = html;

  // Sort click handlers
  el.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const ci = parseInt(th.dataset.col);
      if (state.col === ci) {
        state.dir = state.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.col = ci;
        state.dir = 'desc';
      }
      renderSortableTable(containerId, columns, rows, options);
    });
  });

  // Checkbox handlers
  if (options.selectable) {
    const selectAll = el.querySelector('.select-all');
    if (selectAll) {
      selectAll.addEventListener('change', () => {
        el.querySelectorAll('.row-check').forEach(cb => { cb.checked = selectAll.checked; });
        if (options.onSelectionChange) options.onSelectionChange(getSelectedRows(containerId, display));
      });
    }
    el.querySelectorAll('.row-check').forEach(cb => {
      cb.addEventListener('change', () => {
        if (options.onSelectionChange) options.onSelectionChange(getSelectedRows(containerId, display));
      });
    });
  }

  // Store rows for later retrieval
  el._tableRows = display;
}

function getSelectedRows(containerId, rows) {
  const el = document.getElementById(containerId);
  const indices = [];
  el.querySelectorAll('.row-check:checked').forEach(cb => indices.push(parseInt(cb.dataset.idx)));
  return indices.map(i => rows[i]);
}

/* ── Tab Navigation ─────────────────────────────────────────── */
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('topbarTitle').textContent = btn.textContent.trim();
    if (window.innerWidth < 768) closeSidebar();

    // Auto-load data for each tab
    if (tab === 'dashboard')    loadDashboard();
    if (tab === 'campaigns')    loadCampaigns();
    if (tab === 'search-terms') loadSearchTerms();
    if (tab === 'pending')      loadPendingChanges();
    if (tab === 'activity')     { loadActivityLog(); loadJobRuns(); }
  });
});

/* ── Phase Selector ─────────────────────────────────────────── */
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

/* ── Mobile menu ────────────────────────────────────────────── */
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

/* ── Date ────────────────────────────────────────────────────── */
const dateEl = document.getElementById('topbarDate');
if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/* ── Connection Status ──────────────────────────────────────── */
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

/* ================================================================
   TAB 1: DASHBOARD
   ================================================================ */
let _dashCache = null;

async function loadDashboard() {
  const days = document.getElementById('dashPeriod')?.value || 30;

  // Load metrics
  const metricsEl = document.getElementById('dashMetrics');
  try {
    const data = await apiFetch(`/api/metrics?days=${days}`);
    _dashCache = data;

    const { adSpend, adRevenue, totalRevenue, snapshot } = data;
    const acos = adRevenue > 0 ? adSpend / adRevenue : 0;
    const tacos = totalRevenue > 0 ? adSpend / totalRevenue : 0;
    const organic = Math.max(0, totalRevenue - adRevenue);
    const dep = totalRevenue > 0 ? adRevenue / totalRevenue : 0;

    document.getElementById('val-spend').textContent = usd(adSpend);
    document.getElementById('sub-spend').textContent = `${days}-day total`;

    document.getElementById('val-revenue').textContent = usd(adRevenue);
    document.getElementById('sub-revenue').textContent = `ROAS: ${adSpend > 0 ? (adRevenue / adSpend).toFixed(1) + 'x' : '—'}`;

    const acosClass = colorClass(acos, SOP.targetAcos, SOP.breakEvenAcos);
    document.getElementById('val-acos').textContent = pct(acos);
    document.getElementById('val-acos').className = 'metric-value ' + acosClass;
    document.getElementById('mc-acos').className = 'metric-card ' + acosClass;
    const acosBar = document.getElementById('bar-acos');
    if (acosBar) { acosBar.style.width = clamp(acos / SOP.breakEvenAcos, 0, 1) * 100 + '%'; acosBar.style.background = `var(--${acosClass})`; }

    const tacosClass = colorClass(tacos, SOP.tacos.target, SOP.tacos.growthMax);
    document.getElementById('val-tacos').textContent = pct(tacos);
    document.getElementById('val-tacos').className = 'metric-value ' + tacosClass;
    document.getElementById('mc-tacos').className = 'metric-card ' + tacosClass;
    const tacosBar = document.getElementById('bar-tacos');
    if (tacosBar) { tacosBar.style.width = clamp(tacos / SOP.tacos.launchMax, 0, 1) * 100 + '%'; tacosBar.style.background = `var(--${tacosClass})`; }

    document.getElementById('val-organic').textContent = usd(organic);
    document.getElementById('sub-organic').textContent = organic > 0 ? `${pct(organic / totalRevenue)} of total` : 'No organic data';

    const depClass = dep < 0.5 ? 'green' : dep < 0.8 ? 'yellow' : 'red';
    document.getElementById('val-dep').textContent = pct(dep);
    document.getElementById('mc-dep').className = 'metric-card ' + depClass;
    const depBar = document.getElementById('bar-dep');
    if (depBar) { depBar.style.width = dep * 100 + '%'; depBar.style.background = `var(--${depClass})`; }

    // Highlight TACOS journey phase
    const suggestedPhase = tacos > SOP.tacos.growthMax ? 'launch' : tacos > SOP.tacos.matureMax ? 'optimize' : 'scale';
    ['launch', 'optimize', 'scale'].forEach(p => {
      const seg = document.getElementById('journey-' + p);
      if (seg) seg.classList.toggle('journey-active', p === suggestedPhase);
    });

  } catch (e) {
    document.getElementById('val-spend').textContent = '--';
    document.getElementById('sub-spend').textContent = e.message;
  }

  // Load campaign summary
  try {
    const { campaigns } = await apiFetch('/api/campaigns');
    const enabled = campaigns.filter(c => c.state === 'ENABLED').length;
    const paused = campaigns.filter(c => c.state === 'PAUSED').length;
    const totalBudget = campaigns.reduce((s, c) => s + (c.budget?.budget || 0), 0);

    document.getElementById('dashCampaignContent').innerHTML = `
      <div class="campaign-summary-grid">
        <div class="cs-item"><span class="cs-num">${campaigns.length}</span><span class="cs-label">Total Campaigns</span></div>
        <div class="cs-item"><span class="cs-num green">${enabled}</span><span class="cs-label">Enabled</span></div>
        <div class="cs-item"><span class="cs-num yellow">${paused}</span><span class="cs-label">Paused</span></div>
        <div class="cs-item"><span class="cs-num">${usd(totalBudget)}</span><span class="cs-label">Total Daily Budget</span></div>
      </div>`;
  } catch (e) {
    document.getElementById('dashCampaignContent').innerHTML = `<div class="error-inline">${escHtml(e.message)}</div>`;
  }
}

/* ================================================================
   TAB 2: CAMPAIGNS
   ================================================================ */
let _campaignsCache = null;

async function loadCampaigns() {
  const container = document.getElementById('campaignsContainer');
  showLoading('campaignsContainer');
  try {
    const { campaigns } = await apiFetch('/api/campaigns');
    _campaignsCache = campaigns;

    if (campaigns.length === 0) {
      container.innerHTML = '<div class="empty-state">No campaigns found. Create campaigns using the Campaign Builder tab.</div>';
      return;
    }

    const columns = [
      { key: 'name', label: 'Campaign Name', sortable: true },
      { key: '_type', label: 'Type', sortable: true, formatter: v => `<span class="type-badge type-${v}">${v}</span>` },
      { key: '_state', label: 'State', sortable: true, formatter: v => `<span class="state-badge state-${v}">${v}</span>` },
      { key: '_budget', label: 'Daily Budget', sortable: true, formatter: v => usd(v) },
      { key: '_bidding', label: 'Bidding', sortable: true },
    ];

    const rows = campaigns.map(c => ({
      name: c.name || '—',
      _type: c.targetingType === 'AUTO' ? 'Auto' : 'Manual',
      _state: c.state || 'UNKNOWN',
      _budget: c.budget?.budget || 0,
      _bidding: c.bidding?.strategy || c.dynamicBidding?.strategy || '—',
      _raw: c,
    }));

    renderSortableTable('campaignsContainer', columns, rows);
  } catch (e) {
    showError('campaignsContainer', 'Failed to load campaigns: ' + e.message, loadCampaigns);
  }
}

/* ================================================================
   TAB 3: SEARCH TERMS
   ================================================================ */
let _strCache = null;
let _strFilter = 'all';

async function loadSearchTerms() {
  const days = document.getElementById('strPeriod')?.value || 30;
  showLoading('strContainer');

  try {
    const data = await apiFetch(`/api/str-report?days=${days}`);
    _strCache = data;

    const { result } = data;
    const winners = result.winners || [];
    const bleeders = result.bleeders || [];
    const wastedSpend = bleeders.reduce((s, t) => s + (t.spend || 0), 0);
    const needsData = (data.rows || []).filter(r => {
      const cls = classifyTerm(r);
      return cls === 'needs_data';
    });

    document.getElementById('str-winners-count').textContent = winners.length;
    document.getElementById('str-bleeders-count').textContent = bleeders.length;
    document.getElementById('str-needs-count').textContent = needsData.length;
    document.getElementById('str-wasted').textContent = usd(wastedSpend);

    renderSTRTable();
  } catch (e) {
    showError('strContainer', 'Failed to load search terms: ' + e.message, loadSearchTerms);
  }
}

function classifyTerm(row) {
  const clicks = row.clicks || 0;
  const orders = row.orders || 0;
  const spend = row.spend || 0;
  const sales = row.sales || 0;
  const acos = sales > 0 ? spend / sales : (spend > 0 ? 999 : 0);

  if (orders >= 1 && acos <= SOP.targetAcos) return 'winner';
  if (clicks >= SOP.minClicksBeforeNeg && orders === 0) return 'bleeder';
  if (sales > 0 && acos > SOP.breakEvenAcos) return 'bleeder';
  if (clicks > 0) return 'needs_data';
  return 'no_spend';
}

function renderSTRTable() {
  if (!_strCache) return;
  // Reset bulk bar on re-render
  const bulkBar = document.getElementById('strBulkBar');
  if (bulkBar) bulkBar.classList.add('hidden');

  const rows = (_strCache.rows || []).map(r => {
    const cls = classifyTerm(r);
    const acos = r.sales > 0 ? r.spend / r.sales : null;
    return {
      searchTerm: r.searchTerm || r.query || '—',
      campaignName: r.campaignName || '—',
      clicks: r.clicks || 0,
      orders: r.orders || 0,
      spend: r.spend || 0,
      sales: r.sales || 0,
      _acos: acos,
      _cls: cls,
      _raw: r,
    };
  }).filter(r => {
    if (_strFilter === 'all') return true;
    return r._cls === _strFilter;
  });

  const columns = [
    { key: 'searchTerm', label: 'Search Term', sortable: true },
    { key: 'campaignName', label: 'Campaign', sortable: true },
    { key: 'clicks', label: 'Clicks', sortable: true },
    { key: 'orders', label: 'Orders', sortable: true },
    { key: 'spend', label: 'Spend', sortable: true, formatter: v => usd(v) },
    { key: 'sales', label: 'Sales', sortable: true, formatter: v => usd(v) },
    { key: '_acos', label: 'ACOS', sortable: true, formatter: v => v !== null ? pct(v) : '—' },
    { key: '_cls', label: 'Class', sortable: true, formatter: v => `<span class="cls-badge cls-${v}">${v.replace('_', ' ')}</span>` },
  ];

  renderSortableTable('strContainer', columns, rows, {
    selectable: true,
    onSelectionChange: (selected) => {
      const bar = document.getElementById('strBulkBar');
      if (selected.length > 0) {
        bar.classList.remove('hidden');
        document.getElementById('strSelectedCount').textContent = `${selected.length} selected`;
      } else {
        bar.classList.add('hidden');
      }
    }
  });
}

// Filter chip clicks
document.getElementById('strFilters')?.addEventListener('click', e => {
  const chip = e.target.closest('.filter-chip');
  if (!chip) return;
  document.querySelectorAll('#strFilters .filter-chip').forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  _strFilter = chip.dataset.filter;
  renderSTRTable();
});

// Negate selected search terms
async function negateSelected() {
  const selected = getSelectedRows('strContainer', document.getElementById('strContainer')._tableRows || []);
  const bleeders = selected.filter(r => r._cls === 'bleeder' || r._cls === 'needs_data');
  if (bleeders.length === 0) { showToast('No bleeders selected', 'info'); return; }

  const negatives = bleeders.map(r => ({
    campaignId: r._raw.campaignId || '',
    keywordText: r.searchTerm,
    matchType: 'NEGATIVE_EXACT',
  }));

  // Dry-run preview
  const preview = `
    <strong>${negatives.length} negative keywords to add</strong>
    <ul style="margin:10px 0;padding-left:20px">
      ${negatives.slice(0, 10).map(n => `<li>"${escHtml(n.keywordText)}"</li>`).join('')}
      ${negatives.length > 10 ? `<li>...and ${negatives.length - 10} more</li>` : ''}
    </ul>
    <p style="color:var(--red);margin-top:8px">This will add negative keywords to your Amazon campaigns.</p>`;

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

/* ================================================================
   TAB 4: AUTOMATION RUNNER
   ================================================================ */

async function runBidOptimization() {
  const resultsEl = document.getElementById('bidResults');
  resultsEl.classList.remove('hidden');
  resultsEl.innerHTML = '<div class="loading-overlay"><div class="spinner-lg"></div><span>Fetching keywords & running optimizer...</span></div>';

  try {
    // Fetch keywords
    const { keywords } = await apiFetch('/api/keywords');
    if (!keywords || keywords.length === 0) {
      resultsEl.innerHTML = '<div class="empty-state">No keywords found.</div>';
      return;
    }

    // Run preview
    const { decisions, summary } = await apiFetch('/api/bids/preview', {
      method: 'POST',
      body: JSON.stringify({ keywords }),
    });

    // Summary
    const counts = {
      raise: (summary.raise || []).length,
      lower: (summary.lower || []).length,
      negate: (summary.negate || []).length,
      isolate: (summary.isolate || []).length,
      noAction: (summary.noAction || []).length,
    };

    let html = `<div class="runner-summary">
      <span class="rs-item green">Raise: ${counts.raise}</span>
      <span class="rs-item yellow">Lower: ${counts.lower}</span>
      <span class="rs-item red">Negate: ${counts.negate}</span>
      <span class="rs-item">SKC: ${counts.isolate}</span>
      <span class="rs-item">No Action: ${counts.noAction}</span>
    </div>`;

    // Table of changes
    const changes = decisions.filter(d => !['no_action', 'needs_data'].includes(d.action?.type));
    if (changes.length > 0) {
      html += '<table class="sortable-table"><thead><tr><th>Keyword</th><th>Current Bid</th><th>Action</th><th>New Bid</th><th>Reason</th></tr></thead><tbody>';
      changes.slice(0, 100).forEach(d => {
        const actionCls = d.action?.type === 'raise_bid' ? 'green' : d.action?.type === 'lower_bid' ? 'yellow' : d.action?.type === 'no_action' || d.action?.type === 'needs_data' ? 'cls-no_spend' : 'red';
        html += `<tr>
          <td>${escHtml(d.keyword?.keyword || '—')}</td>
          <td>${usd(d.keyword?.currentBid || 0)}</td>
          <td><span class="cls-badge cls-${actionCls}">${d.action?.type || '—'}</span></td>
          <td>${d.action?.newBid ? usd(d.action.newBid) : '—'}</td>
          <td class="at-reason">${escHtml(d.action?.reason || '')}</td>
        </tr>`;
      });
      html += '</tbody></table>';

      // Apply button
      const updates = changes.filter(d => d.action?.newBid).map(d => ({
        keywordId: d.keyword?.keywordId,
        newBid: d.action.newBid,
      }));

      if (updates.length > 0) {
        html += `<div class="runner-apply-bar"><button class="btn btn-danger" id="applyBidsBtn">Apply ${updates.length} Bid Changes</button></div>`;
      }

      resultsEl.innerHTML = html;

      // Attach apply handler
      const applyBtn = document.getElementById('applyBidsBtn');
      if (applyBtn) {
        applyBtn.onclick = () => {
          showModal('Confirm Bid Changes', `<p>Apply <strong>${updates.length}</strong> bid changes to Amazon?</p><p style="color:var(--red)">This will modify live campaign bids.</p>`, async () => {
            try {
              const result = await apiFetch('/api/bids/apply', {
                method: 'POST',
                body: JSON.stringify({ updates, dryRun: false }),
              });
              showToast(`${result.count} bids updated`, 'success');
            } catch (e) { showToast('Error: ' + e.message, 'error'); }
          });
        };
      }
    } else {
      html += '<div class="empty-state">No bid changes recommended.</div>';
      resultsEl.innerHTML = html;
    }
  } catch (e) {
    resultsEl.innerHTML = `<div class="error-state"><div class="error-msg">${escHtml(e.message)}</div></div>`;
  }
}

async function runSTRHarvest() {
  const resultsEl = document.getElementById('harvestResults');
  resultsEl.classList.remove('hidden');
  resultsEl.innerHTML = '<div class="loading-overlay"><div class="spinner-lg"></div><span>Fetching search term report...</span></div>';

  try {
    const data = await apiFetch('/api/str-report?days=30');
    const { result } = data;
    const bleeders = result.bleeders || [];
    const winners = result.winners || [];
    const negRecs = result.negativeRecommendations || [];

    let html = `<div class="runner-summary">
      <span class="rs-item green">Winners: ${winners.length}</span>
      <span class="rs-item red">Bleeders: ${bleeders.length}</span>
      <span class="rs-item">Negative Recs: ${negRecs.length}</span>
    </div>`;

    if (bleeders.length > 0) {
      html += '<h4 style="margin:12px 0 8px">Bleeders (negate these)</h4>';
      html += '<table class="sortable-table"><thead><tr><th>Search Term</th><th>Clicks</th><th>Orders</th><th>Spend</th><th>ACOS</th></tr></thead><tbody>';
      bleeders.slice(0, 50).forEach(t => {
        const acos = t.sales > 0 ? pct(t.spend / t.sales) : '∞';
        html += `<tr><td>${escHtml(t.searchTerm || t.query || '—')}</td><td>${t.clicks}</td><td>${t.orders}</td><td>${usd(t.spend)}</td><td class="red">${acos}</td></tr>`;
      });
      html += '</tbody></table>';

      if (negRecs.length > 0) {
        html += `<div class="runner-apply-bar"><button class="btn btn-danger" id="applyNegativesBtn">Negate ${negRecs.length} Bleeders</button></div>`;
      }
    }

    if (winners.length > 0) {
      html += '<h4 style="margin:12px 0 8px">Winners (promote/monitor)</h4>';
      html += '<table class="sortable-table"><thead><tr><th>Search Term</th><th>Clicks</th><th>Orders</th><th>Sales</th><th>ACOS</th></tr></thead><tbody>';
      winners.slice(0, 20).forEach(t => {
        const acos = t.sales > 0 ? pct(t.spend / t.sales) : '—';
        html += `<tr><td>${escHtml(t.searchTerm || t.query || '—')}</td><td>${t.clicks}</td><td>${t.orders}</td><td>${usd(t.sales)}</td><td class="green">${acos}</td></tr>`;
      });
      html += '</tbody></table>';
    }

    resultsEl.innerHTML = html;

    // Negate handler
    const negBtn = document.getElementById('applyNegativesBtn');
    if (negBtn) {
      negBtn.onclick = () => {
        const negatives = negRecs.map(n => ({
          campaignId: n.campaignId || '',
          keywordText: n.searchTerm || n.keywordText,
          matchType: 'NEGATIVE_EXACT',
        }));
        showModal('Confirm Negatives', `<p>Add <strong>${negatives.length}</strong> negative keywords?</p>`, async () => {
          try {
            const result = await apiFetch('/api/negatives/apply', {
              method: 'POST',
              body: JSON.stringify({ negatives, dryRun: false }),
            });
            showToast(`${result.count} negatives applied`, 'success');
          } catch (e) { showToast('Error: ' + e.message, 'error'); }
        });
      };
    }
  } catch (e) {
    resultsEl.innerHTML = `<div class="error-state"><div class="error-msg">${escHtml(e.message)}</div></div>`;
  }
}

async function runTacosCheck() {
  const resultsEl = document.getElementById('tacosResults');
  resultsEl.classList.remove('hidden');
  resultsEl.innerHTML = '<div class="loading-overlay"><div class="spinner-lg"></div><span>Calculating TACOS...</span></div>';

  try {
    const data = await apiFetch('/api/metrics?days=30');
    const { adSpend, adRevenue, totalRevenue, snapshot } = data;
    const tacos = totalRevenue > 0 ? adSpend / totalRevenue : 0;
    const acos = adRevenue > 0 ? adSpend / adRevenue : 0;
    const suggestedPhase = tacos > SOP.tacos.growthMax ? 'launch' : tacos > SOP.tacos.matureMax ? 'optimize' : 'scale';

    const tacosClass = colorClass(tacos, SOP.tacos.target, SOP.tacos.growthMax);

    resultsEl.innerHTML = `
      <div class="tacos-result-card">
        <div class="tacos-big ${tacosClass}">${pct(tacos)}</div>
        <div class="tacos-label">TACOS (30-day)</div>
        <div class="runner-summary">
          <span class="rs-item">ACOS: ${pct(acos)}</span>
          <span class="rs-item">Ad Spend: ${usd(adSpend)}</span>
          <span class="rs-item">Revenue: ${usd(totalRevenue)}</span>
          <span class="rs-item">Phase: <strong>${suggestedPhase.toUpperCase()}</strong></span>
        </div>
        ${suggestedPhase !== currentPhase ? `<div class="alert-box" style="margin-top:12px">Phase mismatch: You're set to <strong>${currentPhase}</strong> but data suggests <strong>${suggestedPhase}</strong>.</div>` : ''}
      </div>`;
  } catch (e) {
    resultsEl.innerHTML = `<div class="error-state"><div class="error-msg">${escHtml(e.message)}</div></div>`;
  }
}

async function runWeeklyMaintenance() {
  const resultsEl = document.getElementById('weeklyResults');
  resultsEl.classList.remove('hidden');
  resultsEl.innerHTML = '<div class="loading-overlay"><div class="spinner-lg"></div><span>Running weekly maintenance job...</span></div>';

  try {
    await apiFetch('/api/jobs/weekly-maintenance/run', { method: 'POST' });
    resultsEl.innerHTML = `<div class="runner-summary"><span class="rs-item green">Job started successfully. Check Activity Log for results.</span></div>`;
    showToast('Weekly maintenance job started', 'success');
  } catch (e) {
    resultsEl.innerHTML = `<div class="error-state"><div class="error-msg">${escHtml(e.message)}</div></div>`;
  }
}

/* ================================================================
   TAB 5: CAMPAIGN BUILDER
   ================================================================ */
let builderStep = 1;

// Checklist validation
document.getElementById('builderChecklist')?.addEventListener('change', () => {
  const required = document.querySelectorAll('#builderChecklist .required-item input');
  const allChecked = [...required].every(cb => cb.checked);
  document.getElementById('builderNext1').disabled = !allChecked;
});

// Keyword counter
document.getElementById('bldr-keywords')?.addEventListener('input', () => {
  const lines = document.getElementById('bldr-keywords').value.split('\n').filter(l => l.trim());
  document.getElementById('bldr-kw-count').textContent = `${lines.length} keywords`;
});

function setBuilderStep(step) {
  builderStep = step;
  document.querySelectorAll('.builder-step').forEach(s => s.classList.remove('active'));
  document.getElementById('builder-step-' + step)?.classList.add('active');

  document.querySelectorAll('.wizard-step').forEach(s => {
    const sn = parseInt(s.dataset.step);
    s.classList.toggle('active', sn === step);
    s.classList.toggle('completed', sn < step);
  });
}

function builderNext() {
  setBuilderStep(builderStep + 1);
}

function builderPrev() {
  setBuilderStep(builderStep - 1);
}

async function builderPreview() {
  setBuilderStep(4);
  const content = document.getElementById('builderPreviewContent');
  content.innerHTML = '<div class="loading-overlay"><div class="spinner-lg"></div><span>Generating campaign preview...</span></div>';

  const productName = document.getElementById('bldr-product').value.trim() || 'PRODUCT';
  const dailyBudget = parseFloat(document.getElementById('bldr-budget').value) || 100;
  const targetKeywords = document.getElementById('bldr-keywords').value.split('\n').filter(l => l.trim());
  const competitorAsins = document.getElementById('bldr-asins').value.split('\n').filter(l => l.trim());
  const brandKeywords = document.getElementById('bldr-brand').value.split('\n').filter(l => l.trim());
  const skcKeyword = document.getElementById('bldr-skc').value.trim() || undefined;

  try {
    const data = await apiFetch('/api/campaigns/create', {
      method: 'POST',
      body: JSON.stringify({ productName, dailyBudget, targetKeywords, competitorAsins, brandKeywords, skcKeyword, dryRun: true }),
    });

    const campaigns = data.campaigns || [];
    let html = `<div class="builder-preview-grid">`;
    campaigns.forEach(c => {
      html += `<div class="builder-campaign-card">
        <div class="bcc-header">
          <span class="bcc-type">${c.matchType || c.type || '—'}</span>
          <strong>${escHtml(c.name || '—')}</strong>
        </div>
        <div class="bcc-body">
          <div class="bcc-row"><span>Budget:</span><span>${usd(c.dailyBudget || 0)}/day</span></div>
          <div class="bcc-row"><span>TOS Modifier:</span><span>${c.tosModifier ? '+' + pct(c.tosModifier) : '—'}</span></div>
          ${c.keywords ? `<div class="bcc-row"><span>Keywords:</span><span>${c.keywords.length}</span></div>` : ''}
          <div class="bcc-purpose">${escHtml(c.purpose || '')}</div>
        </div>
      </div>`;
    });
    html += `</div>`;
    html += `<div class="builder-total">Total Daily Budget: <strong>${usd(campaigns.reduce((s, c) => s + (c.dailyBudget || 0), 0))}</strong> across ${campaigns.length} campaigns</div>`;

    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<div class="error-state"><div class="error-msg">${escHtml(e.message)}</div></div>`;
  }
}

async function builderCreate() {
  const content = document.getElementById('builderCreateContent');
  setBuilderStep(5);
  content.innerHTML = '<div class="loading-overlay"><div class="spinner-lg"></div><span>Creating campaigns on Amazon...</span></div>';

  const productName = document.getElementById('bldr-product').value.trim() || 'PRODUCT';
  const dailyBudget = parseFloat(document.getElementById('bldr-budget').value) || 100;
  const targetKeywords = document.getElementById('bldr-keywords').value.split('\n').filter(l => l.trim());
  const competitorAsins = document.getElementById('bldr-asins').value.split('\n').filter(l => l.trim());
  const brandKeywords = document.getElementById('bldr-brand').value.split('\n').filter(l => l.trim());
  const skcKeyword = document.getElementById('bldr-skc').value.trim() || undefined;

  try {
    const data = await apiFetch('/api/campaigns/create', {
      method: 'POST',
      body: JSON.stringify({ productName, dailyBudget, targetKeywords, competitorAsins, brandKeywords, skcKeyword, dryRun: false }),
    });

    content.innerHTML = `<div class="success-state">
      <div class="success-icon">✓</div>
      <h3>Campaigns Created Successfully</h3>
      <p>${data.count ?? data.results?.length ?? 0} campaigns created on Amazon.</p>
    </div>`;
    showToast('Campaigns created!', 'success');
  } catch (e) {
    content.innerHTML = `<div class="error-state"><div class="error-msg">Failed: ${escHtml(e.message)}</div></div>`;
  }
}

function builderReset() {
  setBuilderStep(1);
  document.querySelectorAll('#builderChecklist input').forEach(cb => { cb.checked = false; });
  document.getElementById('builderNext1').disabled = true;
}

/* ================================================================
   TAB 6: PENDING CHANGES (kept from original)
   ================================================================ */

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
    showError('pendingContainer', 'Could not load pending changes: ' + e.message, loadPendingChanges);
  }
}

async function approvePending(id) {
  try {
    await apiFetch(`/api/pending/${id}/approve`, { method: 'POST' });
    showToast('Change approved', 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
  finally { loadPendingChanges(); }
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

/* ================================================================
   TAB 7: ACTIVITY LOG (kept from original)
   ================================================================ */

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
    container.innerHTML = '<div class="empty-state">Could not load activity log.</div>';
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
    container.innerHTML = '<div class="empty-state">Could not load job runs.</div>';
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

/* ================================================================
   SOP RULES REFERENCE (collapsible in Automation tab)
   ================================================================ */
const SOP_RULES = [
  { id:'R01', sec:'prelaunch', secNum:'2', secTitle:'Pre-Launch Readiness', secDesc:'Gates that must pass before any PPC spend.',
    name:'Minimum Reviews Gate', priority:'critical', auto:false,
    cond:'reviews < 15', action:'BLOCK scaling. Enroll in Amazon Vine until reviews >= 15.' },
  { id:'R02', sec:'prelaunch', name:'Target ACOS Calculation', priority:'critical', auto:false,
    cond:'targetAcos = (price - COGS - FBA - storage) / price', action:'Compute before launch.' },
  { id:'R03', sec:'prelaunch', name:'Keyword List Minimum', priority:'high', auto:false,
    cond:'keywordCount < 30', action:'Need 30-50 target keywords.' },
  { id:'R37', sec:'structure', secNum:'3', secTitle:'Campaign Structure', secDesc:'Structural invariants.',
    name:'One Match Type Per Ad Group', priority:'critical', auto:true,
    cond:'countDistinct(adGroup.matchTypes) > 1', action:'Split into separate ad groups.' },
  { id:'R38', sec:'structure', name:'One Product Per Ad Group', priority:'critical', auto:true,
    cond:'countDistinct(adGroup.products) > 1', action:'Split for product-level ACOS.' },
  { id:'R18', sec:'structure', name:'Negative Isolation', priority:'high', auto:true,
    cond:'keyword.matchType == EXACT', action:'Add as NEGATIVE EXACT in Auto/Phrase/Broad campaigns.' },
  { id:'R08', sec:'bids', secNum:'5.1', secTitle:'Bid Optimization', secDesc:'Weekly keyword-level decisions.',
    name:'No Impressions', priority:'high', auto:true,
    cond:'impressions == 0', action:'Raise bid 25%.' },
  { id:'R09', sec:'bids', name:'Impressions, No Clicks', priority:'high', auto:false,
    cond:'impressions >= 100 AND clicks == 0', action:'Review creative (images/title).' },
  { id:'R10', sec:'bids', name:'Clicks >= 10, No Sales', priority:'critical', auto:true,
    cond:'clicks >= 10 AND orders == 0', action:'Negate keyword.' },
  { id:'R12', sec:'bids', name:'ACOS > Break-Even', priority:'critical', auto:true,
    cond:'acos > 45%', action:'Lower bid 15%.' },
  { id:'R13', sec:'bids', name:'ACOS Between Target & BE', priority:'high', auto:true,
    cond:'30% < acos <= 45%', action:'Lower bid 7.5%.' },
  { id:'R14', sec:'bids', name:'Low ACOS + 3+ Orders', priority:'high', auto:false,
    cond:'acos <= 30% AND orders >= 3', action:'Isolate to SKC campaign.' },
  { id:'R15', sec:'bids', name:'Low ACOS, Few Orders', priority:'medium', auto:true,
    cond:'acos <= 30% AND orders < 3', action:'Raise bid 20%.' },
  { id:'R16', sec:'negatives', secNum:'5.2', secTitle:'Negative Keywords', secDesc:'Weekly STR harvest.',
    name:'High Clicks, Zero Sales', priority:'critical', auto:true,
    cond:'clicks >= 10 AND orders == 0', action:'Add NEGATIVE EXACT.' },
  { id:'R17', sec:'negatives', name:'ACOS > Break-Even', priority:'critical', auto:true,
    cond:'searchTerm.acos > 45%', action:'Add NEGATIVE EXACT.' },
  { id:'R25', sec:'tacos', secNum:'7.1', secTitle:'TACOS Phase', secDesc:'Phase classification.',
    name:'TACOS > 25%', priority:'medium', auto:true,
    cond:'tacos > 25%', action:'Phase = LAUNCH.' },
  { id:'R26', sec:'tacos', name:'TACOS 15-25%', priority:'medium', auto:true,
    cond:'15% < tacos <= 25%', action:'Phase = OPTIMIZE.' },
  { id:'R27', sec:'tacos', name:'TACOS <= 15%', priority:'medium', auto:true,
    cond:'tacos <= 15%', action:'Phase = SCALE.' },
];

function renderRules(filterSec) {
  const container = document.getElementById('rulesContainer');
  if (!container) return;

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
    html += `<div class="rules-section-block">
      <div class="rules-section-header"><div class="rules-section-num">${sec.num}</div><h3>${sec.title}</h3></div>
      ${sec.desc ? `<p class="rules-section-desc">${sec.desc}</p>` : ''}`;
    sec.rules.forEach(r => {
      html += `<div class="rule-card priority-${r.priority}">
        <div class="rule-id">${r.id}</div>
        <div class="rule-body">
          <div class="rule-name">${r.name} <span class="priority-tag">${r.priority}</span> ${r.auto ? '<span class="auto-tag">AUTO</span>' : ''}</div>
          <div class="rule-cond">${r.cond}</div>
          <div class="rule-action">${r.action}</div>
        </div>
      </div>`;
    });
    html += '</div>';
  });

  container.innerHTML = html;
}

// Init rules filter
(function() {
  const filterEl = document.getElementById('rulesFilter');
  if (!filterEl) return;
  const sections = ['all', 'prelaunch', 'structure', 'bids', 'negatives', 'tacos'];
  filterEl.innerHTML = sections.map(s =>
    `<button class="filter-chip ${s === 'all' ? 'active' : ''}" data-sec="${s}">${s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>`
  ).join('');
  filterEl.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    filterEl.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderRules(chip.dataset.sec);
  });
  renderRules('all');
})();

/* ================================================================
   INIT
   ================================================================ */
updatePhaseBadge();
loadDashboard();
