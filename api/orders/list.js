/**
 * GET /api/orders/list
 * Auth: required (Bearer JWT)
 * Returns: { ok, orders: [...] }
 *
 * Returns all paid orders for the authenticated user,
 * joined with project data for dashboard rendering.
 * Uses service role with an explicit user_id filter for reliability.
 */

const { supabaseAdmin }           = require('../../lib/supabase');
const { setCors, requireAuth }    = require('../../lib/auth');

module.exports = async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      tier,
      amount_cents,
      currency,
      status,
      customer_email,
      download_count,
      paid_at,
      created_at,
      stripe_session_id,
      project_id,
      projects (
        id,
        qr_value,
        biz_data,
        copies,
        selections,
        created_at
      )
    `)
    .eq('user_id', user.id)    // explicit ownership — belt-and-suspenders over RLS
    .eq('status', 'paid')
    .order('paid_at', { ascending: false });

  if (error) {
    console.error('[orders/list] DB error:', error.message);
    return res.status(500).json({ error: 'Could not load your orders. Please try again.' });
  }

  return res.status(200).json({ ok: true, orders: orders || [] });
};
