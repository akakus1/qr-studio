/**
 * POST /api/orders/create-checkout
 * Auth: required (Bearer JWT)
 * Body: { generationId, tier }
 * Returns: { ok, url, sessionId }
 *
 * Creates a Stripe Checkout Session and a pending order row.
 * All DB writes use the service role (bypasses RLS).
 * userId always comes from the verified JWT.
 */

const Stripe = require('stripe');
const { supabaseAdmin }                          = require('../../lib/supabase');
const { setCors, requireAuth, parseBody, sanitise } = require('../../lib/auth');

const TIER_PRICE_ENV = {
  basic:       'STRIPE_PRICE_BASIC',
  recommended: 'STRIPE_PRICE_RECOMMENDED',
  premium:     'STRIPE_PRICE_PREMIUM',
};
const TIER_AMOUNTS = {
  basic:       1000,   // $10
  recommended: 1500,   // $15
  premium:     2000,   // $20
};

module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const body         = parseBody(req);
  const generationId = sanitise(body.generationId, 80);
  const tier         = sanitise(body.tier, 20);

  if (!generationId)
    return res.status(400).json({ error: 'generationId is required' });
  if (!TIER_AMOUNTS[tier])
    return res.status(400).json({ error: `Invalid tier: "${tier}". Must be basic, recommended, or premium.` });

  const priceId   = process.env[TIER_PRICE_ENV[tier]];
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const origin    = process.env.ALLOWED_ORIGIN || 'https://yourdomain.com';

  if (!stripeKey)
    return res.status(500).json({ error: 'Payment system not configured (STRIPE_SECRET_KEY missing)' });
  if (!priceId)
    return res.status(500).json({ error: `Stripe price not configured for tier "${tier}" (${TIER_PRICE_ENV[tier]} missing)` });

  // Verify the project exists and belongs to this user (service role, no RLS bypass needed here)
  const { data: project, error: projErr } = await supabaseAdmin
    .from('projects')
    .select('id, biz_data')
    .eq('id', generationId)
    .eq('user_id', user.id)   // ownership check
    .single();

  if (projErr || !project) {
    return res.status(404).json({ error: 'Project not found or does not belong to your account.' });
  }

  // Check for an existing paid order for this project — prevent double-charging
  const { data: existingPaid } = await supabaseAdmin
    .from('orders')
    .select('id, tier, status')
    .eq('project_id', generationId)
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .single();

  if (existingPaid) {
    return res.status(409).json({
      error:    'You have already paid for this design pack.',
      orderId:  existingPaid.id,
      alreadyPaid: true,
    });
  }

  const stripe   = Stripe(stripeKey);
  const bizName  = (project.biz_data?.name || 'QR Promo Design Pack').slice(0, 100);

  try {
    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      customer_email:       user.email,
      line_items: [{
        price:    priceId,
        quantity: 1,
      }],
      // Metadata is available in the webhook and verify-session
      metadata: {
        userId:       user.id,
        userEmail:    user.email,
        generationId: generationId,
        tier:         tier,
        bizName,
      },
      payment_intent_data: {
        metadata: {
          userId:       user.id,
          generationId: generationId,
          tier:         tier,
        },
      },
      success_url: `${origin}/promo.html?session_id={CHECKOUT_SESSION_ID}&gen=${encodeURIComponent(generationId)}`,
      cancel_url:  `${origin}/promo.html?cancelled=1&gen=${encodeURIComponent(generationId)}`,
    });

    // Pre-create pending order via service role (bypasses RLS — intentional, server-side only)
    const { error: insertErr } = await supabaseAdmin
      .from('orders')
      .upsert({
        stripe_session_id: session.id,
        user_id:           user.id,
        project_id:        generationId,
        tier,
        amount_cents:      TIER_AMOUNTS[tier],
        currency:          'usd',
        status:            'pending',
        customer_email:    user.email,
      }, { onConflict: 'stripe_session_id', ignoreDuplicates: true });

    if (insertErr) {
      // Non-fatal — webhook will create the order if this fails
      console.error('[create-checkout] Order pre-insert error (non-fatal):', insertErr.message);
    }

    return res.status(200).json({ ok: true, url: session.url, sessionId: session.id });

  } catch (err) {
    console.error('[create-checkout] Stripe error:', err.message);
    return res.status(500).json({ error: 'Could not create checkout session. Please try again.' });
  }
};
