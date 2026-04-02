import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '../../lib/auth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const user = await verifyToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const { name, type, content, color, bg_color } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const { data, error } = await supabase
      .from('qr_codes')
      .insert({
        user_id: user.id,
        name: name || `${type || 'url'} QR - ${new Date().toLocaleDateString()}`,
        type: type || 'url',
        content,
        color: color || '#000000',
        bg_color: bg_color || '#ffffff',
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ ok: true, qr: data });
  } catch (err) {
    console.error('Save QR error:', err);
    return res.status(500).json({ error: err.message });
  }
}
