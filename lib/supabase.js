/**
 * lib/supabase.js — server-side Supabase clients
 * Imported by api/* routes only. Never in public/.
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) console.error('[lib/supabase] SUPABASE_URL not set');
if (!SERVICE_KEY)  console.error('[lib/supabase] SUPABASE_SERVICE_ROLE_KEY not set');

/**
 * Admin client — bypasses RLS.
 * All server-side reads and writes use this.
 */
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Verify a Supabase JWT. Returns the user object or null.
 * @param {string} token — raw JWT from Authorization: Bearer <token>
 */
async function verifySupabaseJWT(token) {
  if (!token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

module.exports = { supabaseAdmin, verifySupabaseJWT };
