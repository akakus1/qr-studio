/**
 * POST /api/auth/register
 * Body: { email, password, full_name? }
 * Returns: { ok, message, userId }
 * Public — no auth required.
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

  // Use anon client with signUp so Supabase sends the confirmation email automatically
  const origin   = process.env.ALLOWED_ORIGIN || 'https://www.getqrdesign.com';
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data:            { full_name: fullName || null },
      emailRedirectTo: `${origin}/auth.html?mode=confirmed`,
    },
  });

  if (error) {
    if (error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already exists') ||
        error.message?.toLowerCase().includes('user already registered'))
      return res.status(409).json({ error: 'An account with this email already exists.' });
    console.error('[register]', error.message);
    return res.status(400).json({ error: error.message });
  }

  // If identities array is empty, the user already exists (Supabase quirk)
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  return res.status(201).json({
    ok:      true,
    message: 'Account created! Please check your email and click the confirmation link before signing in.',
    userId:  data.user?.id,
  });
};
