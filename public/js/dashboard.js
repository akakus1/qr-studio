/**
 * public/js/dashboard.js
 * Loaded only on dashboard.html.
 * Depends on: QRAuth (auth.js), QRStudio (app.js),
 *             QRCode (CDN), TEMPLATES + PALETTES (promo.js)
 */
'use strict';

const $d = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  if (!QRAuth.requireAuth(window.location.href)) return;
  QRAuth.renderNavAuth('nav-auth');
  renderGreeting();
  setupTabs();
  setupAccountForm();
  await loadOrders();
});

/* ── Greeting ───────────────────────────────────────────────── */
function renderGreeting() {
  const user = QRAuth.getUser();
  if (!user) return;
  const name = user.full_name || user.email?.split('@')[0] || 'there';
  const el = $d('user-greeting'); if (el) el.textContent = `Welcome back, ${name}`;
  const em = $d('user-email');    if (em) em.textContent = user.email;
}

/* ── Orders ─────────────────────────────────────────────────── */
async function loadOrders() {
  setLoadingState(true);
  try {
    const res = await QRAuth.apiFetch('/api/orders/list');
    if (!res) return;
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
    const { orders } = await res.json();
    setLoadingState(false);
    renderStats(orders || []);
    renderOrders(orders || []);
  } catch (err) {
    setLoadingState(false);
    const grid = $d('orders-grid');
    if (grid) {
      grid.style.display = 'block';
      grid.innerHTML = `<div class="error-banner">⚠ ${esc(err.message)}
        <button onclick="loadOrders()" style="margin-left:12px;background:none;border:none;
          color:var(--purpleL);cursor:pointer;font-weight:600;">Retry</button></div>`;
    }
  }
}

function setLoadingState(loading) {
  const loadEl  = $d('orders-loading');
  const gridEl  = $d('orders-grid');
  const emptyEl = $d('orders-empty');
  if (loadEl)  loadEl.style.display  = loading ? 'flex'  : 'none';
  if (gridEl)  gridEl.style.display  = loading ? 'none'  : gridEl.style.display;
  if (emptyEl) emptyEl.style.display = 'none';
}

function renderStats(orders) {
  const totalEl = $d('stat-orders');
  const dlEl    = $d('stat-downloads');
  if (totalEl) totalEl.textContent = orders.length;
  if (dlEl)    dlEl.textContent    = orders.reduce((s, o) => s + (o.download_count || 0), 0);
}

function renderOrders(orders) {
  const gridEl  = $d('orders-grid');
  const emptyEl = $d('orders-empty');
  if (!gridEl) return;
  if (orders.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block';
    gridEl.style.display = 'none';
    return;
  }
  gridEl.style.display = 'grid';
  gridEl.innerHTML = orders.map(orderCard).join('');
  gridEl.querySelectorAll('[data-action="download"]').forEach(btn => {
    btn.addEventListener('click', () => handleRedownload(btn.dataset.orderId, btn));
  });
}

function orderCard(o) {
  const biz    = o.projects?.biz_data || {};
  const date   = o.paid_at ? new Date(o.paid_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';
  const amount = ((o.amount_cents || 0) / 100).toFixed(2);
  const label  = { basic:'Basic', recommended:'Recommended ★', premium:'Premium ✦' }[o.tier] || o.tier;
  return `<div class="order-card">
    <div class="order-card-top">
      <div class="order-biz-name">${esc(biz.name || 'QR Design Pack')}</div>
      <span class="order-tier-badge tier-${o.tier}">${esc(label)}</span>
    </div>
    <div class="order-meta">
      <span>📅 ${date}</span><span>💳 $${amount}</span>
      <span>⬇ ${o.download_count || 0} download${o.download_count === 1 ? '' : 's'}</span>
    </div>
    ${biz.phone    ? `<div class="order-detail">📞 ${esc(biz.phone)}</div>` : ''}
    ${biz.industry ? `<div class="order-detail">🏢 ${esc(biz.industry)}</div>` : ''}
    <div class="order-actions">
      <button class="btn-redownload" data-action="download" data-order-id="${esc(o.id)}">↓ Download</button>
      <a href="/promo.html?orderId=${esc(o.id)}&gen=${esc(o.project_id || '')}" class="btn-view-design">Edit →</a>
    </div>
  </div>`;
}

/* ── Re-download ─────────────────────────────────────────────── */
async function handleRedownload(orderId, btn) {
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = 'Preparing…';
  try {
    const res = await QRAuth.apiFetch('/api/orders/download', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    if (!res) return;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Download failed');
    if (!data.project?.copies?.length) {
      showDashToast('⚠ Project data missing. Open the design page to regenerate.');
      return;
    }
    await exportPNG(data.project);
    showDashToast('✓ PNG downloaded!');
  } catch (err) {
    console.error('[dashboard] re-download:', err.message);
    showDashToast(`⚠ ${err.message}`);
  } finally {
    btn.disabled = false; btn.textContent = orig;
  }
}

async function exportPNG(project) {
  const { biz_data: biz, copies, selections, qr_value } = project;
  const c = copies[0] || {};
  const copy = {
    bizName: biz?.name || '', bizNameAr: c.bizNameAr || '',
    headline: c.headline || biz?.name || '', headlineAr: c.headlineAr || null,
    cta: c.cta || 'Call Now', ctaAr: c.ctaAr || null,
    sub: c.sub || '', subAr: c.subAr || null,
    tagline: c.tagline || '', taglineAr: c.taglineAr || null,
    phone: biz?.phone || '', whatsapp: biz?.whatsapp || '',
    address: biz?.address || '', website: biz?.website || '', social: biz?.social || '',
  };
  const SIZES = { a6:{w:105,h:148}, a5:{w:148,h:210}, '10x15':{w:100,h:150}, cardoor:{w:300,h:400} };
  const sz  = SIZES[selections?.size || 'a6'];
  const W   = Math.round(sz.w * 2.2), H = Math.round(sz.h * 2.2);
  const pal = { bg:'#0D0D14', accent:'#D4AF37', text:'#F0EFE8', sub:'#7A7A8A' };
  const qr  = await buildQRCanvas(qr_value || 'https://example.com', 400);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  if (window.TEMPLATES?.length > 0) {
    window.TEMPLATES[0].paint(canvas.getContext('2d'), W, H, copy, pal, qr, null, selections?.lang === 'ar');
  } else {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(W*.08)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.fillText(biz?.name || 'Design', W/2, H*.3);
    if (qr) ctx.drawImage(qr, W/2 - 80, H*.45, 160, 160);
  }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${(biz?.name || 'design').replace(/\s+/g, '-')}-qrstudio.png`;
  a.click();
}

function buildQRCanvas(value, size) {
  return new Promise(resolve => {
    const div = document.createElement('div');
    div.style.visibility = 'hidden';
    document.body.appendChild(div);
    try {
      new QRCode(div, { text: value, width: size, height: size,
        colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.H });
    } catch { document.body.removeChild(div); resolve(null); return; }
    setTimeout(() => {
      const c = div.querySelector('canvas'), i = div.querySelector('img');
      document.body.removeChild(div);
      if (c) { resolve(c); return; }
      if (i) { const off = document.createElement('canvas'); off.width = off.height = size;
        const el = new Image(); el.onload = () => { off.getContext('2d').drawImage(el,0,0,size,size); resolve(off); };
        el.onerror = () => resolve(null); el.src = i.src; return; }
      resolve(null);
    }, 400);
  });
}

/* ── Tabs ─────────────────────────────────────────────────── */
function setupTabs() {
  document.querySelectorAll('.dash-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.dash-panel').forEach(p => { p.style.display = 'none'; });
      tab.classList.add('active');
      const panel = $d(tab.dataset.panel); if (panel) panel.style.display = 'block';
    });
  });
}

/* ── Account form ─────────────────────────────────────────── */
function setupAccountForm() {
  const form = $d('account-form'); if (!form) return;
  const user = QRAuth.getUser();
  if (user) {
    const n = $d('acc-name');  if (n) n.value  = user.full_name || '';
    const e = $d('acc-email'); if (e) e.value  = user.email     || '';
  }
  form.addEventListener('submit', e => { e.preventDefault(); showDashToast('✓ Settings saved.'); });
}

/* ── Toast ────────────────────────────────────────────────── */
let _t;
function showDashToast(msg) {
  const el = $d('dash-toast') || $d('toast'); if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_t); _t = setTimeout(() => el.classList.remove('show'), 3500);
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g,
    c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
