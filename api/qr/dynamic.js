import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '../../lib/auth.js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateShortCode(length = 7) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  // ── CREATE Dynamic QR ──
  if (req.method === 'POST') {
    try {
      const { name, redirect_url, color, bg_color, password } = req.body;
      if (!redirect_url) return res.status(400).json({ error: 'redirect_url is required' });

      // Generate unique short code
      let short_code = generateShortCode();
      let attempts = 0;
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from('qr_codes').select('id').eq('short_code', short_code).single();
        if (!existing) break;
        short_code = generateShortCode();
        attempts++;
      }

      const baseUrl = process.env.ALLOWED_ORIGIN || 'https://www.getqrdesign.com';
      const qr_content = `${baseUrl}/api/r/${short_code}`;

      // Hash password if provided
      const password_hash = password
        ? crypto.createHash('sha256').update(password).digest('hex')
        : null;

      const { data, error } = await supabase
        .from('qr_codes')
        .insert({
          user_id: user.id,
          name: name || 'Dynamic QR - ' + new Date().toLocaleDateString(),
          type: 'url',
          content: qr_content,
          color: color || '#000000',
          bg_color: bg_color || '#ffffff',
          is_dynamic: true,
          short_code,
          redirect_url,
          is_active: true,
          password_hash,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        qr: data,
        qr_url: qr_content,
        short_code,
      });
    } catch (err) {
      console.error('Create dynamic QR error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── UPDATE Dynamic QR (change redirect URL, toggle active, update password) ──
  if (req.method === 'PUT') {
    try {
      const { id, redirect_url, is_active, name, password } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });

      // Verify ownership
      const { data: existing } = await supabase
        .from('qr_codes').select('user_id').eq('id', id).single();
      if (!existing || existing.user_id !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updates = { updated_at: new Date().toISOString() };
      if (redirect_url !== undefined) updates.redirect_url = redirect_url;
      if (is_active !== undefined) updates.is_active = is_active;
      if (name !== undefined) updates.name = name;
      if (password !== undefined) {
        updates.password_hash = password
          ? crypto.createHash('sha256').update(password).digest('hex')
          : null;
      }

      const { data, error } = await supabase
        .from('qr_codes').update(updates).eq('id', id).select().single();

      if (error) throw error;

      return res.status(200).json({ ok: true, qr: data });
    } catch (err) {
      console.error('Update dynamic QR error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET all dynamic QR codes for user ──
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dynamic', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ ok: true, qr_codes: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
