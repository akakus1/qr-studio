/**
 * POST /api/auth/register
 * Body: { email, password, full_name? }
 * Returns: { ok, message, userId }
 * Public — no auth required.
 *
 * Strategy: Use admin createUser with email_confirm:true so users
 * can log in immediately without waiting for a confirmation email.
 * Supabase free plan has very low email rate limits (3/hour) which
 * makes confirmation emails unreliable.
 */
'use strict';

const { createClient }                 = require('@supabase/supabase-js');
const { setCors, parseBody, sanitise } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const body     = parseBody(req);
  const email    = sanitise(body.email,     100).toLowerCase();
  const password = String(body.password || '').trim();
  const fullName = sanitise(body.full_name,  80);

  if (!email || !email.includes('@'))
    return res.status(400).json({ error: 'A valid email address is required.' });
  if (!password || password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  // Use service role (admin) client to create user with email auto-confirmed
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,   // ← auto-confirm, no email needed
    user_metadata: { full_name: fullName || null },
  });

  if (error) {
    // Handle duplicate user
    if (error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already exists') ||
        error.message?.toLowerCase().includes('user already registered') ||
        error.status === 422)
      return res.status(409).json({ error: 'An account with this email already exists.' });
    console.error('[register]', error.message);
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({
    ok:      true,
    message: 'Account created successfully! You can now sign in.',
    userId:  data.user?.id,
  });
};
