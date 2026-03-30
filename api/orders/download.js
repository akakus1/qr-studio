/**
 * POST /api/orders/download
 * Auth: required (Bearer JWT)
 * Body: { orderId }
 * Returns: { ok, downloadToken, project, tier }
 *
 * Verifies ownership of a paid order and returns a short-lived
 * download token plus the full project data needed to re-render designs.
 * Service role used for the DB query (bypasses RLS) + explicit user_id check.
 */

const crypto  = require('crypto');
const { supabaseAdmin }                          = require('../../lib/supabase');
const { setCors, requireAuth, parseBody, sanitise } = require('../../lib/auth');

const TOKEN_TTL_MS = 30 * 60 * 1000;   // 30 minutes — user re-requests per session

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

  const body    = parseBody(req);
  const orderId = sanitise(body.orderId, 100);
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return res.status(500).json({ error: 'Server configuration error' });

  // Fetch order + project via service role, enforce ownership + paid status explicitly
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, user_id, status, tier, download_count, project_id,
      projects (
        id, qr_value, biz_data, copies, selections
      )
    `)
    .eq('id', orderId)
    .eq('user_id', user.id)    // explicit ownership — do NOT rely on RLS alone here
    .eq('status', 'paid')
    .single();

  if (error || !order) {
    console.error('[download] Order fetch error:', error?.message, '| orderId:', orderId, '| userId:', user.id);
    return res.status(404).json({ error: 'Order not found or access denied.' });
  }

  // Async download counter increment — fire-and-forget, never block the response
  supabaseAdmin
    .from('orders')
    .update({ download_count: (order.download_count || 0) + 1 })
    .eq('id', orderId)
    .then(({ error: upErr }) => {
      if (upErr) console.error('[download] Counter update error (non-fatal):', upErr.message);
    });

  const downloadToken = createDownloadToken(user.id, order.id, jwtSecret);

  return res.status(200).json({
    ok:            true,
    downloadToken,
    tier:          order.tier,
    project:       order.projects || null,
  });
};
