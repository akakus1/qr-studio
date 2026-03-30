/**
 * POST /api/generate-copy
 * Auth: required (Bearer JWT)
 * Body: { name, industry, phone, whatsapp?, website?, address?,
 *          social?, tagline?, goal, style, lang, size, qrValue? }
 * Returns: { ok, generationId, copies }
 *
 * Uses service role to write to projects table (bypasses RLS).
 * user_id always comes from the verified JWT — never from client input.
 */

const { supabaseAdmin }                          = require('../lib/supabase');
const { setCors, requireAuth, parseBody, sanitise } = require('../lib/auth');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL  = 'claude-sonnet-4-20250514';
const MAX_TOKENS    = 2000;

/* ── In-memory rate limit (resets on cold start) ─────────── */
const rlMap     = new Map();
const RL_WINDOW = 60_000;   // 1 minute
const RL_MAX    = 10;       // requests per window per IP

function isRateLimited(ip) {
  const now = Date.now();
  const e   = rlMap.get(ip) || { count: 0, start: now };
  if (now - e.start > RL_WINDOW) { rlMap.set(ip, { count: 1, start: now }); return false; }
  e.count++;
  rlMap.set(ip, e);
  return e.count > RL_MAX;
}

/* ── Validation ──────────────────────────────────────────── */
const ALLOWED = {
  goal:  ['calls','whatsapp','bookings','website'],
  style: ['modern','bold','luxury','minimal'],
  lang:  ['en','ar','both'],
  size:  ['a6','a5','10x15','cardoor'],
};

function validate(b) {
  const errs = [];
  if (!b.name?.trim())     errs.push('name required');
  if (!b.industry?.trim()) errs.push('industry required');
  if (!b.phone?.trim())    errs.push('phone required');
  Object.entries(ALLOWED).forEach(([k, vals]) => {
    if (!vals.includes(b[k])) errs.push(`invalid ${k}: "${b[k]}"`);
  });
  return errs;
}

/* ── Prompt ───────────────────────────────────────────────── */
function buildPrompt(b) {
  return `You are a professional marketing copywriter specialising in small business print promotions.

Business details:
- Name: ${b.name}
- Industry: ${b.industry}
- Phone: ${b.phone}
- WhatsApp: ${b.whatsapp || 'N/A'}
- Website: ${b.website || 'N/A'}
- Address: ${b.address || 'N/A'}
- Social: ${b.social || 'N/A'}
- Provided tagline: ${b.tagline || 'none'}

Campaign goal: ${b.goal}
Design style: ${b.style}
Language preference: ${b.lang}

Generate exactly 8 unique copy variations. Each must feel distinct — vary the angle, tone, and CTA approach.
Rules:
- headline: max 6 words, punchy and benefit-led
- cta: max 5 words, strong action verb
- sub: one supporting sentence, max 12 words
- tagline: short memorable brand line (use provided tagline if given, otherwise create one)
- If lang is "ar" or "both": provide authentic Arabic (never transliteration)
- If lang is "en" only: set all *Ar fields to null

Respond ONLY with a raw JSON array. No markdown fences, no explanation, nothing before or after the array:
[
  {
    "id": 1,
    "headline":   "...",
    "headlineAr": "... or null",
    "cta":        "...",
    "ctaAr":      "... or null",
    "sub":        "...",
    "subAr":      "... or null",
    "tagline":    "...",
    "taglineAr":  "... or null",
    "bizNameAr":  "... or null"
  }
]`;
}

/* ── Handler ─────────────────────────────────────────────── */
module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // Auth
  const user = await requireAuth(req, res);
  if (!user) return;

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
          || req.socket?.remoteAddress
          || 'unknown';
  if (isRateLimited(ip))
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[generate-copy] ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Parse + sanitise
  const body = parseBody(req);
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
  const qrValue = sanitise(body.qrValue || '', 500);

  const errors = validate(biz);
  if (errors.length > 0)
    return res.status(400).json({ error: 'Validation failed', details: errors });

  // Call Claude
  let copies;
  try {
    const claudeRes = await fetch(ANTHROPIC_URL, {
      method:  'POST',
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
      const txt = await claudeRes.text();
      console.error('[generate-copy] Claude error:', claudeRes.status, txt.slice(0, 200));
      return res.status(502).json({ error: 'AI service error. Please try again.' });
    }

    const claudeData = await claudeRes.json();
    const rawText    = claudeData.content?.[0]?.text?.trim() || '';
    const clean      = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      copies = JSON.parse(clean);
    } catch {
      console.error('[generate-copy] JSON parse failed:', clean.slice(0, 300));
      return res.status(502).json({ error: 'AI returned an invalid format. Please try again.' });
    }

    if (!Array.isArray(copies) || copies.length === 0)
      return res.status(502).json({ error: 'AI returned an empty response. Please try again.' });

  } catch (err) {
    console.error('[generate-copy] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Persist project — service role bypasses RLS; user_id from JWT (not client input)
  const generationId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const { error: dbErr } = await supabaseAdmin
    .from('projects')
    .insert({
      id:         generationId,
      user_id:    user.id,          // always from verified JWT
      qr_value:   qrValue || 'https://example.com',
      biz_data:   biz,
      copies,
      selections: {
        goal:  biz.goal,
        style: biz.style,
        lang:  biz.lang,
        size:  biz.size,
      },
    });

  if (dbErr) {
    // Non-fatal: log and continue — the user still gets their designs
    console.error('[generate-copy] DB insert error (non-fatal):', dbErr.message);
  }

  return res.status(200).json({ ok: true, generationId, copies });
};
