/**
 * POST /api/orders/verify-session
 * Auth: required (Bearer JWT)
 * Body: { sessionId, generationId? }
 * Returns: { ok, order: { id, tier, status }, downloadToken }
 *
 * Called synchronously when the user returns from Stripe.
 * Idempotent: safe to call multiple times for the same session.
 * Service role handles all DB writes.
 */

const Stripe  = require('stripe');
const crypto  = require('crypto');
const { supabaseAdmin }                          = require('../../lib/supabase');
const { setCors, requireAuth, parseBody, sanitise } = require('../../lib/auth');

// Short-lived token: 4 hours. DB order row is the permanent entitlement.
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

const TIER_AMOUNTS = { basic: 1000, recommended: 1500, premium: 2000 };

function createDownloadToken(userId, orderId, secret) {
  const payload = JSON.stringify({ userId, orderId, exp: Date.now() + TOKEN_TTL_MS });
  const b64     = Buffer.from(payload).toString('base64url');
  const sig     = crypto.createHmac('sha256', secret).update(b64).digest('hex');
  return `${b64}.${sig}`;
}

module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const body         = parseBody(req);
  const sessionId    = sanitise(body.sessionId,    200);
  const generationId = sanitise(body.generationId,  80);

  if (!sessionId)
    return res.status(400).json({ error: 'sessionId is required' });

  const jwtSecret = process.env.JWT_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!jwtSecret || !stripeKey)
    return res.status(500).json({ error: 'Server configuration error' });

  // ── 1. Check existing verified order (idempotent fast path) ───
  const { data: existing } = await supabaseAdmin
    .from('orders')
    .select('id, status, tier, user_id, project_id')
    .eq('stripe_session_id', sessionId)
    .single();

  if (existing?.status === 'paid') {
    // Ownership: verified user must own this order
    if (existing.user_id !== user.id)
      return res.status(403).json({ error: 'This payment belongs to a different account.' });

    const token = createDownloadToken(user.id, existing.id, jwtSecret);
    return res.status(200).json({
      ok:              true,
      order:           { id: existing.id, tier: existing.tier, status: existing.status },
      downloadToken:   token,
      alreadyVerified: true,
    });
  }

  // ── 2. Verify with Stripe ──────────────────────────────────────
  const stripe = Stripe(stripeKey);
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error('[verify-session] Stripe retrieve error:', err.message);
    return res.status(502).json({ error: 'Could not reach payment system. Please try again.' });
  }

  if (!session || session.payment_status !== 'paid')
    return res.status(402).json({
      error:  'Payment not completed.',
      status: session?.payment_status || 'unknown',
    });

  // ── 3. Validate metadata ownership ────────────────────────────
  const meta = session.metadata || {};
  if (meta.userId && meta.userId !== user.id)
    return res.status(403).json({ error: 'This payment was made with a different account.' });

  const resolvedGenId   = generationId || meta.generationId || null;
  const tier            = meta.tier || 'recommended';
  const customerEmail   = session.customer_details?.email || user.email;
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null;

  // ── 4. Upsert order (service role, idempotent on stripe_session_id) ───
  const { data: order, error: upsertErr } = await supabaseAdmin
    .from('orders')
    .upsert({
      stripe_session_id: sessionId,
      stripe_payment_id: paymentIntentId,
      user_id:           user.id,
      project_id:        resolvedGenId || null,
      tier,
      amount_cents:      TIER_AMOUNTS[tier] || 1500,
      currency:          session.currency || 'usd',
      status:            'paid',
      customer_email:    customerEmail,
      paid_at:           new Date().toISOString(),
      // updated_at is set by the DB trigger
    }, { onConflict: 'stripe_session_id' })
    .select('id, tier, status, project_id')
    .single();

  if (upsertErr || !order) {
    console.error('[verify-session] Order upsert error:', upsertErr?.message);
    return res.status(500).json({
      error: 'Payment verified but order could not be saved. Please contact support with your session ID.',
      sessionId,
    });
  }

  const downloadToken = createDownloadToken(user.id, order.id, jwtSecret);

  return res.status(200).json({
    ok:            true,
    order:         { id: order.id, tier: order.tier, status: order.status },
    downloadToken,
  });
};
