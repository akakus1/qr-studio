/**
 * POST /api/auth/register
 * Body: { email, password, full_name? }
 * Returns: { ok, message, userId }
 * Public — no auth required.
 */
'use strict';

const { supabaseAdmin }              = require('../../lib/supabase');
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

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,                        // Supabase sends a confirmation email
    user_metadata: { full_name: fullName || null },
  });

  if (error) {
    if (error.message?.toLowerCase().includes('already registered') ||
        error.message?.toLowerCase().includes('already exists'))
      return res.status(409).json({ error: 'An account with this email already exists.' });
    console.error('[register]', error.message);
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({
    ok:      true,
    message: 'Account created. Check your email to confirm before signing in.',
    userId:  data.user.id,
  });
};
