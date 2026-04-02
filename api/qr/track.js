import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function detectDevice(ua) {
  if (!ua) return { device: 'unknown', os: 'unknown', browser: 'unknown' };
  const device = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop';
  let os = 'unknown';
  if (/iphone|ipad/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  let browser = 'unknown';
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/edge/i.test(ua)) browser = 'Edge';
  return { device, os, browser };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { qr_code_id } = req.body;
    if (!qr_code_id) return res.status(400).json({ error: 'qr_code_id required' });

    const ua = req.headers['user-agent'] || '';
    const { device, os, browser } = detectDevice(ua);

    // Get country from Vercel geo headers
    const country = req.headers['x-vercel-ip-country'] || 'Unknown';
    const city = req.headers['x-vercel-ip-city'] || 'Unknown';

    // Hash IP for privacy
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || '';
    const crypto = await import('crypto');
    const ip_hash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);

    // Insert scan record
    await supabase.from('qr_scans').insert({
      qr_code_id,
      country,
      city,
      device_type: device,
      os,
      browser,
      ip_hash,
    });

    // Increment scan count
    await supabase.rpc('increment_scan_count', { qr_id: qr_code_id });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Track scan error:', err);
    return res.status(500).json({ error: err.message });
  }
}
