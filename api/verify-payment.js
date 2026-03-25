/**
 * /api/verify-payment.js — Vercel Serverless Function
 * ─────────────────────────────────────────────────────────────
 * POST — verify Stripe Checkout session → issue signed download token
 * GET  — verify an existing download token
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY       sk_live_... or sk_test_...
 *   DOWNLOAD_TOKEN_SECRET   any random 32+ char string
 *   ALLOWED_ORIGIN          your domain (optional)
 * ─────────────────────────────────────────────────────────────
 */

const crypto = require('crypto');

const TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

/* ── Token helpers ───────────────────────────────────────── */
function createToken(email, generationId) {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET;
  if (!secret) throw new Error('DOWNLOAD_TOKEN_SECRET not set');

  const payload = JSON.stringify({ email, generationId, exp: Date.now() + TOKEN_TTL });
  const b64     = Buffer.from(payload).toString('base64url');
  const sig     = crypto.createHmac('sha256', secret).update(b64).digest('hex');
  return `${b64}.${sig}`;
}

function verifyToken(token) {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET;
  if (!secret) return { valid: false, reason: 'server_config' };

  const parts = (token || '').split('.');
  if (parts.length !== 2) return { valid: false, reason: 'malformed' };

  const [b64, sig] = parts;
  const expected   = crypto.createHmac('sha256', secret).update(b64).digest('hex');
  if (sig !== expected) return { valid: false, reason: 'invalid_signature' };

  let payload;
  try { payload = JSON.parse(Buffer.from(b64, 'base64url').toString()); }
  catch { return { valid: false, reason: 'parse_error' }; }

  if (Date.now() > payload.exp) return { valid: false, reason: 'expired' };

  return { valid: true, email: payload.email, generationId: payload.generationId };
}

/* ── Main handler ────────────────────────────────────────── */
module.exports = async function handler(req, res) {
  const origin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin',  origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  /* GET — check existing token */
  if (req.method === 'GET') {
    const { token } = req.query;
    if (!token) return res.status(400).json({ valid: false });
    return res.status(200).json(verifyToken(token));
  }

  /* POST — verify Stripe session */
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey)
    return res.status(500).json({ error: 'Payment system not configured' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { sessionId, generationId } = body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  try {
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );

    if (!stripeRes.ok)
      return res.status(402).json({ error: 'Could not verify payment' });

    const session = await stripeRes.json();

    if (session.payment_status !== 'paid')
      return res.status(402).json({
        error: 'Payment not completed',
        status: session.payment_status,
      });

    const email = session.customer_details?.email || session.customer_email || 'unknown';
    const token = createToken(email, generationId || 'unknown');

    return res.status(200).json({ ok: true, token, email, expiresIn: '24h' });

  } catch (err) {
    console.error('Stripe verification error:', err);
    return res.status(500).json({ error: 'Payment verification failed' });
  }
};
