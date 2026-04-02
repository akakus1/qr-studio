import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) return res.status(400).send('Missing code');

  try {
    // Look up the QR code by short_code
    const { data: qr, error } = await supabase
      .from('qr_codes')
      .select('id, redirect_url, is_active, is_dynamic, password_hash, content')
      .eq('short_code', code)
      .single();

    if (error || !qr) {
      return res.status(404).send(`
        <!DOCTYPE html><html><head><title>QR Not Found</title>
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#080B14;color:#fff;}</style>
        </head><body><div style="text-align:center"><h2>⚠️ QR Code Not Found</h2><p>This QR code does not exist or has been deleted.</p></div></body></html>
      `);
    }

    if (!qr.is_active) {
      return res.status(410).send(`
        <!DOCTYPE html><html><head><title>QR Disabled</title>
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#080B14;color:#fff;}</style>
        </head><body><div style="text-align:center"><h2>🚫 QR Code Disabled</h2><p>This QR code has been deactivated by its owner.</p></div></body></html>
      `);
    }

    // If password protected, redirect to password page
    if (qr.password_hash) {
      const pwdParam = req.query.pwd;
      if (!pwdParam) {
        return res.redirect(302, `/password-gate.html?code=${code}`);
      }
      // Verify password (simple hash check)
      const crypto = await import('crypto');
      const inputHash = crypto.createHash('sha256').update(pwdParam).digest('hex');
      if (inputHash !== qr.password_hash) {
        return res.redirect(302, `/password-gate.html?code=${code}&error=1`);
      }
    }

    // Track the scan
    const ua = req.headers['user-agent'] || '';
    const device = /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop';
    const country = req.headers['x-vercel-ip-country'] || 'Unknown';
    const city = req.headers['x-vercel-ip-city'] || 'Unknown';

    let os = 'unknown';
    if (/iphone|ipad/i.test(ua)) os = 'iOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac/i.test(ua)) os = 'macOS';

    let browser = 'unknown';
    if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/edge/i.test(ua)) browser = 'Edge';

    // Insert scan asynchronously (don't wait)
    supabase.from('qr_scans').insert({
      qr_code_id: qr.id,
      country, city,
      device_type: device,
      os, browser,
    }).then(() => {
      supabase.rpc('increment_scan_count', { qr_id: qr.id });
    });

    // Redirect to destination
    const destination = qr.redirect_url || qr.content;
    const url = destination.startsWith('http') ? destination : 'https://' + destination;
    return res.redirect(302, url);

  } catch (err) {
    console.error('Redirect error:', err);
    return res.status(500).send('Server error');
  }
}
