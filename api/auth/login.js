/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { ok, access_token, refresh_token, expires_in, user }
 * Public — no auth required.
 */
'use strict';

const { createClient }               = require('@supabase/supabase-js');
const { setCors, parseBody, sanitise } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const body     = parseBody(req);
  const email    = sanitise(body.email, 100).toLowerCase();
  const password = String(body.password || '').trim();

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  // Use anon key for sign-in (correct pattern for Supabase Auth)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message?.toLowerCase().includes('invalid login'))
      return res.status(401).json({ error: 'Incorrect email or password.' });
    if (error.message?.toLowerCase().includes('email not confirmed'))
      return res.status(403).json({ error: 'Please confirm your email address first.' });
    console.error('[login]', error.message);
    return res.status(401).json({ error: error.message });
  }

  return res.status(200).json({
    ok:            true,
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in:    data.session.expires_in,
    user: {
      id:        data.user.id,
      email:     data.user.email,
      full_name: data.user.user_metadata?.full_name || null,
    },
  });
};
