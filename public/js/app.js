/**
 * app.js — QR Studio shared utilities
 * Loaded on both index.html and promo.html.
 * Exports window.QRStudio with: translation engine, toast,
 * session helpers, download-token helpers, QR value persistence.
 */

/* ── Translation engine ─────────────────────────────────── */
let _lang = localStorage.getItem('qr_lang') || 'en';

function t(key, table) {
  const entry = table[key];
  if (!entry) return key;
  return entry[_lang] || entry['en'] || key;
}

function applyTranslations(table) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n, table);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder, table);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle, table);
  });
  if (table.page_title) document.title = t('page_title', table);
}

function setLang(newLang, table, wrapperId = 'main-wrapper') {
  _lang = newLang;
  localStorage.setItem('qr_lang', _lang);

  const html = document.documentElement;
  html.setAttribute('lang', _lang);
  html.setAttribute('dir', _lang === 'ar' ? 'rtl' : 'ltr');

  document.getElementById('btn-en')?.classList.toggle('active', _lang === 'en');
  document.getElementById('btn-ar')?.classList.toggle('active', _lang === 'ar');

  applyTranslations(table);

  const wrapper = document.getElementById(wrapperId);
  if (wrapper) {
    wrapper.classList.remove('lang-fade');
    void wrapper.offsetWidth;
    wrapper.classList.add('lang-fade');
  }
}

function getCurrentLang() { return _lang; }

/* ── Toast ──────────────────────────────────────────────── */
let _toastTimer;
function showToast(msg, duration = 3200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ── Download token (localStorage) ─────────────────────── */
const TOKEN_KEY = 'qrs_dl_token';
function saveDownloadToken(token) { localStorage.setItem(TOKEN_KEY, token); }
function getDownloadToken()       { return localStorage.getItem(TOKEN_KEY); }
function clearDownloadToken()     { localStorage.removeItem(TOKEN_KEY); }

async function verifyDownloadToken(token) {
  try {
    const res = await fetch(`/api/verify-payment?token=${encodeURIComponent(token)}`);
    return await res.json();
  } catch {
    return { valid: false, reason: 'network_error' };
  }
}

/* ── Session ────────────────────────────────────────────── */
const SESSION_KEY = 'qrs_session';
function saveSession(data) {
  const cur = getSession();
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...cur, ...data, updatedAt: Date.now() }));
}
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}'); }
  catch { return {}; }
}

/* ── QR persistence — passes value between pages ────────── */
function saveLastQR(value) { localStorage.setItem('qrs_last_qr', value); }
function getLastQR() {
  const p = new URLSearchParams(window.location.search);
  return p.get('qr') || localStorage.getItem('qrs_last_qr') || '';
}

/* ── Export ─────────────────────────────────────────────── */
window.QRStudio = {
  t, setLang, applyTranslations, getCurrentLang,
  showToast,
  saveDownloadToken, getDownloadToken, clearDownloadToken, verifyDownloadToken,
  saveSession, getSession,
  saveLastQR, getLastQR,
};
