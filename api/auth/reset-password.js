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

  // If ALLOWED_ORIGIN is not set, omit redirectTo so Supabase uses its own configured site URL.
  const origin      = process.env.ALLOWED_ORIGIN || '';
  const redirectOpts = origin
    ? { redirectTo: `${origin}/auth.html?mode=reset` }
    : {};
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Fire-and-forget — do not expose whether an account exists
  supabase.auth.resetPasswordForEmail(email, redirectOpts)
    .catch(err => console.error('[reset-password]', err.message));

  return res.status(200).json({
    ok:      true,
    message: 'If an account exists for this email, a reset link has been sent.',
  });
};
