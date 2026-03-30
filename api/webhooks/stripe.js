/**
 * POST /api/webhooks/stripe
 * No auth header — Stripe signs the request body.
 * bodyParser is disabled below via module.exports.config (works with any vercel.json structure).
 *
 * Handles:
 *   checkout.session.completed  → upsert order as 'paid'
 *   checkout.session.expired    → mark pending order as 'failed'
 *   charge.refunded             → mark order as 'refunded'
 *
 * This is the GUARANTEED delivery path.
 * verify-session is the fast synchronous path for immediate UX.
 * Both write to the same orders table idempotently.
 */

const Stripe = require('stripe');
const { supabaseAdmin } = require('../../lib/supabase');

const TIER_AMOUNTS = { basic: 1000, recommended: 1500, premium: 2000 };

module.exports = async function handler(req, res) {
  // Webhooks must not have CORS or auth headers — Stripe calls this directly
  if (req.method !== 'POST') return res.status(405).end();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey     = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !stripeKey) {
    console.error('[webhook] Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY');
    return res.status(500).end();
  }

  // Reconstruct raw body for signature verification
  // bodyParser is disabled via module.exports.config at the bottom of this file.
  // With bodyParser false, req.body is a Buffer (raw bytes) — required for signature verification.
  let rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    rawBody = Buffer.from(
      typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody ?? '')
    );
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    console.error('[webhook] Missing stripe-signature header');
    return res.status(400).end();
  }

  const stripe = Stripe(stripeKey);
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {

      // ── checkout.session.completed ──────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Only process if actually paid (some sessions use bank transfers that aren't instant)
        if (session.payment_status !== 'paid') {
          break;
        }

        const meta = session.metadata || {};
        const userId = meta.userId;
        if (!userId) {
          console.error('[webhook] No userId in session metadata for session:', session.id);
          break;
        }

        const generationId    = meta.generationId || null;
        const tier            = meta.tier || 'recommended';
        const customerEmail   = session.customer_details?.email || meta.userEmail || null;
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null;

        const { error: upsertErr } = await supabaseAdmin
          .from('orders')
          .upsert({
            stripe_session_id: session.id,
            stripe_payment_id: paymentIntentId,
            user_id:           userId,
            project_id:        generationId,
            tier,
            amount_cents:      TIER_AMOUNTS[tier] || session.amount_total || 1500,
            currency:          session.currency || 'usd',
            status:            'paid',
            customer_email:    customerEmail,
            paid_at:           new Date().toISOString(),
          }, { onConflict: 'stripe_session_id' });

        if (upsertErr) {
          console.error('[webhook] Order upsert error:', upsertErr.message, '| session:', session.id);
          // Return 500 so Stripe retries delivery
          return res.status(500).end();
        }

        console.log(`[webhook] ✓ Order recorded: session=${session.id} user=${userId} tier=${tier}`);
        break;
      }

      // ── checkout.session.expired ────────────────────────────────
      case 'checkout.session.expired': {
        const session = event.data.object;
        const { error } = await supabaseAdmin
          .from('orders')
          .update({ status: 'failed' })
          .eq('stripe_session_id', session.id)
          .eq('status', 'pending');   // only if still pending — don't overwrite a paid order

        if (error) console.error('[webhook] Session expired update error:', error.message);
        break;
      }

      // ── charge.refunded ─────────────────────────────────────────
      case 'charge.refunded': {
        const charge          = event.data.object;
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent : charge.payment_intent?.id;

        if (paymentIntentId) {
          const { error } = await supabaseAdmin
            .from('orders')
            .update({ status: 'refunded' })
            .eq('stripe_payment_id', paymentIntentId)
            .eq('status', 'paid');   // only if currently paid

          if (error) console.error('[webhook] Refund update error:', error.message);
        }
        break;
      }

      default:
        // Silently ignore other event types
        break;
    }
  } catch (err) {
    console.error(`[webhook] Processing error for ${event.type}:`, err.message);
    return res.status(500).end();
  }

  // Always respond 200 quickly after processing
  return res.status(200).json({ received: true });
};

/**
 * Disable Vercel's automatic body parsing so we receive the raw bytes.
 * stripe.webhooks.constructEvent() needs the exact raw body to verify the signature.
 * This works regardless of whether vercel.json has a "builds" array or not.
 */
module.exports.config = {
  api: { bodyParser: false },
};
