/**
 * public/js/app.js — QR Studio shared utilities
 * Loaded on every page. Exposes window.QRStudio.
 */
'use strict';

/* ── Translation engine ─────────────────────────────────────── */
const RTL_LANGS = ['ar'];
const SUPPORTED_LANGS = ['en', 'ar', 'fr', 'es', 'de', 'tr', 'zh'];

let _lang = (function() {
  const saved = localStorage.getItem('qrs_lang') || localStorage.getItem('qr_lang');
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(browser) ? browser : 'en';
})();

function t(key, table) {
  const entry = table[key];
  if (!entry) return key;
  return entry[_lang] || entry['en'] || key;
}

function setLang(newLang, table, wrapperId = 'main-wrapper') {
  _lang = newLang;
  localStorage.setItem('qrs_lang', _lang);

  const html = document.documentElement;
  html.setAttribute('lang', _lang);
  html.setAttribute('dir', RTL_LANGS.includes(_lang) ? 'rtl' : 'ltr');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n, table);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder, table);
  });
  if (table.page_title) document.title = t('page_title', table);

  const wrapper = document.getElementById(wrapperId);
  if (wrapper) {
    wrapper.classList.remove('lang-fade');
    void wrapper.offsetWidth;
    wrapper.classList.add('lang-fade');
  }
}

function getCurrentLang() { return _lang; }

/* ── Toast ──────────────────────────────────────────────────── */
let _toastTimer;
function showToast(msg, duration = 3200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ── Session (lightweight audit trail, generationId tracking) ─ */
function saveSession(data) {
  try {
    const current = JSON.parse(localStorage.getItem('qrs_session') || '{}');
    localStorage.setItem('qrs_session', JSON.stringify({ ...current, ...data, updatedAt: Date.now() }));
  } catch {}
}

/* ── QR value persistence (index.html → promo.html hand-off) ── */
function saveLastQR(value) {
  try { localStorage.setItem('qrs_last_qr', value); } catch {}
}

function getLastQR() {
  const p = new URLSearchParams(window.location.search);
  return p.get('qr') || localStorage.getItem('qrs_last_qr') || '';
}

/* ── Export ─────────────────────────────────────────────────── */
window.QRStudio = {
  t,
  setLang,
  getCurrentLang,
  showToast,
  saveSession,
  saveLastQR,
  getLastQR,
};
