import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '../../lib/auth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const user = await verifyToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    // Get all QR codes for this user
    const { data: qrCodes, error: qrError } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (qrError) throw qrError;

    // Get scan stats for each QR code
    const qrIds = qrCodes.map(q => q.id);
    let scanStats = [];

    if (qrIds.length > 0) {
      const { data: scans } = await supabase
        .from('qr_scans')
        .select('qr_code_id, country, device_type, os, scanned_at')
        .in('qr_code_id', qrIds)
        .order('scanned_at', { ascending: false })
        .limit(500);

      scanStats = scans || [];
    }

    // Aggregate stats
    const totalScans = qrCodes.reduce((sum, q) => sum + (q.scan_count || 0), 0);

    // Country breakdown
    const countryMap = {};
    scanStats.forEach(s => {
      if (s.country) countryMap[s.country] = (countryMap[s.country] || 0) + 1;
    });
    const topCountries = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }));

    // Device breakdown
    const deviceMap = {};
    scanStats.forEach(s => {
      if (s.device_type) deviceMap[s.device_type] = (deviceMap[s.device_type] || 0) + 1;
    });

    // Recent scans (last 7 days by day)
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const scansByDay = {};
    last7Days.forEach(d => { scansByDay[d] = 0; });
    scanStats.forEach(s => {
      const day = s.scanned_at?.split('T')[0];
      if (day && scansByDay[day] !== undefined) scansByDay[day]++;
    });

    return res.status(200).json({
      ok: true,
      stats: {
        total_qr_codes: qrCodes.length,
        total_scans: totalScans,
        top_countries: topCountries,
        device_breakdown: deviceMap,
        scans_by_day: last7Days.map(d => ({ date: d, count: scansByDay[d] })),
      },
      qr_codes: qrCodes,
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ error: err.message });
  }
}
