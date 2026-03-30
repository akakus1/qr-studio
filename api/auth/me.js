/**
 * GET /api/auth/me
 * Auth: required
 * Returns: { id, email, full_name, created_at, order_count }
 */
'use strict';

const { supabaseAdmin }        = require('../../lib/supabase');
const { setCors, requireAuth } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const [{ data: profile }, { count: orderCount }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('full_name, created_at')
      .eq('id', user.id)
      .single(),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'paid'),
  ]);

  return res.status(200).json({
    id:          user.id,
    email:       user.email,
    full_name:   profile?.full_name  || null,
    created_at:  profile?.created_at || user.created_at,
    order_count: orderCount || 0,
  });
};
