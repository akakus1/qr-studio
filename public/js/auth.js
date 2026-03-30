/**
 * public/js/auth.js — Client-side auth utilities
 * Exposes window.QRAuth. No Supabase SDK — uses REST directly.
 * Loaded in <head> on every page before any page script.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'qrs_auth';

  function save(s)  { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }
  function load()   { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } }
  function clear()  { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

  /* ── Token refresh ────────────────────────────────────────── */
  async function refreshSession(rt) {
    const url  = window.QR_SUPABASE_URL;
    const anon = window.QR_SUPABASE_ANON;
    if (!url || !anon || !rt) return null;
    try {
      const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anon },
        body:    JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.access_token) return null;
      const updated = { ...load(), access_token: data.access_token, refresh_token: data.refresh_token || rt };
      save(updated);
      return updated;
    } catch { return null; }
  }

  /* ── apiFetch — injects auth header, handles 401 refresh ──── */
  async function apiFetch(path, options = {}) {
    const session = load();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

    let res = await fetch(path, { ...options, headers });

    if (res.status === 401 && session?.refresh_token) {
      const refreshed = await refreshSession(session.refresh_token);
      if (refreshed) {
        headers['Authorization'] = `Bearer ${refreshed.access_token}`;
        res = await fetch(path, { ...options, headers });
      } else {
        clear();
        redirectToAuth(window.location.href);
        return null;
      }
    }
    return res;
  }

  /* ── Auth calls ───────────────────────────────────────────── */
  async function login(email, password) {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    save({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user });
    return data;
  }

  async function register(email, password, fullName) {
    const res  = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, full_name: fullName || '' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  }

  function logout() {
    clear();
    try { localStorage.removeItem('qrs_last_qr'); } catch {}
    try { localStorage.removeItem('qrs_session');  } catch {}
    window.location.href = '/index.html';
  }

  async function resetPassword(email) {
    const res  = await fetch('/api/auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Reset request failed');
    return data;
  }

  /* ── Accessors ────────────────────────────────────────────── */
  function getSession() { return load(); }
  function getUser()    { return load()?.user || null; }
  function getToken()   { return load()?.access_token || null; }
  function isLoggedIn() { const s = load(); return !!(s?.access_token && s?.user); }

  /* ── Guards ───────────────────────────────────────────────── */
  function redirectToAuth(returnTo) {
    window.location.href = '/auth.html' + (returnTo ? '?return=' + encodeURIComponent(returnTo) : '');
  }

  function requireAuth(returnTo) {
    if (!isLoggedIn()) { redirectToAuth(returnTo || window.location.href); return false; }
    return true;
  }

  /* ── Nav render ───────────────────────────────────────────── */
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g,
      c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function renderNavAuth(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const user = getUser();
    if (user) {
      el.innerHTML = `
        <a href="/dashboard.html" style="color:var(--purpleL);font-size:.8rem;font-weight:600;
           text-decoration:none;border:1px solid rgba(124,58,237,0.4);border-radius:9999px;
           padding:6px 14px;background:rgba(124,58,237,0.12);">Dashboard</a>
        <span style="font-size:.75rem;color:var(--tmuted);max-width:160px;overflow:hidden;
           text-overflow:ellipsis;white-space:nowrap;">${esc(user.email)}</span>
        <button onclick="QRAuth.logout()" style="font-size:.78rem;padding:5px 13px;cursor:pointer;
           background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
           border-radius:9999px;color:var(--tmuted);">Sign out</button>`;
    } else {
      el.innerHTML = `
        <a href="/auth.html" style="font-size:.82rem;padding:7px 18px;
           background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.4);
           border-radius:9999px;color:var(--purpleL);text-decoration:none;font-weight:600;">Sign in</a>`;
    }
  }

  window.QRAuth = {
    login, register, logout, resetPassword,
    getSession, getUser, getToken, isLoggedIn,
    requireAuth, redirectToAuth, renderNavAuth,
    apiFetch,
  };
})();
