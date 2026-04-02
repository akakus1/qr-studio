/**
 * POST /api/auth/reset-password
 * Body: { email }
 * Returns: { ok, message }
 * Public — always returns 200 to prevent email enumeration.
 */
'use strict';

const { createClient }               = require('@supabase/supabase-js');
const { setCors, parseBody, sanitise } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const body  = parseBody(req);
  const email = sanitise(body.email, 100).toLowerCase();

  if (!email || !email.includes('@'))
    return res.status(400).json({ error: 'A valid email address is required.' });

  const origin   = process.env.ALLOWED_ORIGIN || 'https://www.getqrdesign.com';
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Await the call so the serverless function doesn't terminate before email is sent
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth.html?mode=reset`,
  });

  if (error) {
    console.error('[reset-password]', error.message);
    // Still return 200 to prevent email enumeration
  }

  return res.status(200).json({
    ok:      true,
    message: 'If an account exists for this email, a reset link has been sent. Please check your inbox.',
  });
};
