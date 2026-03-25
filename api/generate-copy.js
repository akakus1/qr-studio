/**
 * /api/generate-copy.js — Vercel Serverless Function
 * ─────────────────────────────────────────────────────────────
 * Receives business data from the frontend, calls Claude API
 * server-side (API key never in browser), returns 8 copy
 * variations as JSON.
 *
 * Required env vars (Vercel dashboard):
 *   ANTHROPIC_API_KEY
 *   ALLOWED_ORIGIN  (optional, defaults to *)
 * ─────────────────────────────────────────────────────────────
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL  = 'claude-sonnet-4-20250514';
const MAX_TOKENS    = 2000;

/* ── Rate limiting (in-memory, resets on cold start) ─────── */
const rlMap = new Map();
const RL_WINDOW = 60_000; // 1 min
const RL_MAX    = 10;

function isRateLimited(ip) {
  const now = Date.now();
  const e   = rlMap.get(ip) || { count: 0, start: now };
  if (now - e.start > RL_WINDOW) { rlMap.set(ip, { count: 1, start: now }); return false; }
  e.count++;
  rlMap.set(ip, e);
  return e.count > RL_MAX;
}

/* ── Input sanitiser ─────────────────────────────────────── */
function sanitise(v, max = 200) {
  if (!v) return '';
  return String(v).replace(/<[^>]*>/g, '').replace(/[<>"'`]/g, '').trim().slice(0, max);
}

/* ── Validation ──────────────────────────────────────────── */
function validate(b) {
  const errs = [];
  if (!b.name     || !b.name.trim())     errs.push('name required');
  if (!b.industry || !b.industry.trim()) errs.push('industry required');
  if (!b.phone    || !b.phone.trim())    errs.push('phone required');
  const allowed = {
    goal:  ['calls','whatsapp','bookings','website'],
    style: ['modern','bold','luxury','minimal'],
    lang:  ['en','ar','both'],
    size:  ['a6','a5','10x15','cardoor'],
  };
  Object.entries(allowed).forEach(([k, vals]) => {
    if (!vals.includes(b[k])) errs.push(`invalid ${k}`);
  });
  return errs;
}

/* ── Prompt builder ──────────────────────────────────────── */
function buildPrompt(b) {
  return `You are a professional marketing copywriter for small business print promotions.

Business:
- Name: ${b.name}
- Industry: ${b.industry}
- Phone: ${b.phone}
- WhatsApp: ${b.whatsapp || 'N/A'}
- Website: ${b.website || 'N/A'}
- Address: ${b.address || 'N/A'}
- Social: ${b.social || 'N/A'}
- Tagline provided: ${b.tagline || 'none'}

Campaign goal: ${b.goal}
Design style: ${b.style}
Language: ${b.lang}

Generate exactly 8 unique copy variations. Each must feel distinct — vary angle, tone, and CTA.
Rules:
- headline: max 6 words, punchy
- cta: max 5 words, action-oriented
- sub: one supporting sentence, max 12 words
- tagline: short brand tagline (use provided tagline if given)
- If lang is "ar" or "both": include authentic Arabic (not transliteration)
- If lang is "en" only: set all *Ar fields to null

Respond ONLY with a raw JSON array — no markdown, no explanation:
[
  {
    "id": 1,
    "headline": "...",
    "headlineAr": "...or null",
    "cta": "...",
    "ctaAr": "...or null",
    "sub": "...",
    "subAr": "...or null",
    "tagline": "...",
    "taglineAr": "...or null",
    "bizNameAr": "...or null"
  }
]`;
}

/* ── Main handler ────────────────────────────────────────── */
module.exports = async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin',  origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  /* Rate limit */
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip))
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });

  /* API key */
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  /* Parse body */
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  /* Sanitise */
  const biz = {
    name:     sanitise(body.name,     100),
    industry: sanitise(body.industry,  50),
    phone:    sanitise(body.phone,     30),
    whatsapp: sanitise(body.whatsapp,  30),
    website:  sanitise(body.website,  100),
    address:  sanitise(body.address,  150),
    social:   sanitise(body.social,    80),
    tagline:  sanitise(body.tagline,  120),
    goal:     sanitise(body.goal,      20),
    style:    sanitise(body.style,     20),
    lang:     sanitise(body.lang,      10),
    size:     sanitise(body.size,      20),
  };

  const errors = validate(biz);
  if (errors.length > 0)
    return res.status(400).json({ error: 'Validation failed', details: errors });

  /* Call Claude */
  try {
    const claudeRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        messages:   [{ role: 'user', content: buildPrompt(biz) }],
      }),
    });

    if (!claudeRes.ok) {
      const t = await claudeRes.text();
      console.error('Claude API error:', claudeRes.status, t);
      return res.status(502).json({ error: 'AI service error. Please try again.' });
    }

    const claudeData = await claudeRes.json();
    const rawText    = claudeData.content?.[0]?.text?.trim() || '';

    const clean = rawText
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let copies;
    try { copies = JSON.parse(clean); }
    catch {
      console.error('Failed to parse Claude JSON:', clean.slice(0, 200));
      return res.status(502).json({ error: 'AI returned invalid format. Please try again.' });
    }

    if (!Array.isArray(copies) || copies.length === 0)
      return res.status(502).json({ error: 'AI returned empty response. Please try again.' });

    return res.status(200).json({
      ok: true,
      generationId: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      copies,
    });

  } catch (err) {
    console.error('Unexpected error in generate-copy:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
