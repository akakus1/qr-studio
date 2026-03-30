/**
 * lib/auth.js — shared API middleware and helpers
 * Imported by every api/* route.
 */
'use strict';

const { verifySupabaseJWT } = require('./supabase');

/** Set CORS + content-type headers. */
function setCors(res, methods = 'GET, POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin',  process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type',                 'application/json');
}

/** Extract Bearer token from the Authorization header. */
function extractToken(req) {
  const h = req.headers['authorization'] || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return null;
}

/**
 * Verify the JWT and attach the user to req.
 * Returns the user object, or sends 401 and returns null.
 */
async function requireAuth(req, res) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  const user = await verifySupabaseJWT(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token. Please sign in again.' });
    return null;
  }
  return user;
}

/** Parse JSON body safely. */
function parseBody(req) {
  try {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    return req.body || {};
  } catch {
    return {};
  }
}

/** Strip HTML and trim a string field to a max length. */
function sanitise(v, max = 200) {
  if (!v) return '';
  return String(v)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .trim()
    .slice(0, max);
}

module.exports = { setCors, extractToken, requireAuth, parseBody, sanitise };
