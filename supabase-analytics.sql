-- ============================================================
-- QR Studio Analytics Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Table: qr_codes — stores all generated QR codes
CREATE TABLE IF NOT EXISTS qr_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Untitled QR',
  type         TEXT NOT NULL DEFAULT 'url',   -- url, wifi, vcard, email, phone, text
  content      TEXT NOT NULL,
  color        TEXT DEFAULT '#000000',
  bg_color     TEXT DEFAULT '#ffffff',
  scan_count   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Table: qr_scans — tracks every scan event
CREATE TABLE IF NOT EXISTS qr_scans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id   UUID REFERENCES qr_codes(id) ON DELETE CASCADE,
  scanned_at   TIMESTAMPTZ DEFAULT NOW(),
  country      TEXT,
  city         TEXT,
  device_type  TEXT,   -- mobile, desktop, tablet
  os           TEXT,   -- iOS, Android, Windows, macOS
  browser      TEXT,
  ip_hash      TEXT    -- hashed for privacy
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON qr_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON qr_scans(scanned_at);

-- Row Level Security
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scans ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own QR codes
DROP POLICY IF EXISTS "Users can view own qr_codes" ON qr_codes;
CREATE POLICY "Users can view own qr_codes"
  ON qr_codes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own qr_codes" ON qr_codes;
CREATE POLICY "Users can insert own qr_codes"
  ON qr_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own qr_codes" ON qr_codes;
CREATE POLICY "Users can update own qr_codes"
  ON qr_codes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own qr_codes" ON qr_codes;
CREATE POLICY "Users can delete own qr_codes"
  ON qr_codes FOR DELETE
  USING (auth.uid() = user_id);

-- Scans are public (for tracking) but only viewable by owner
DROP POLICY IF EXISTS "Anyone can insert scans" ON qr_scans;
CREATE POLICY "Anyone can insert scans"
  ON qr_scans FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view scans of own QR codes" ON qr_scans;
CREATE POLICY "Users can view scans of own QR codes"
  ON qr_scans FOR SELECT
  USING (
    qr_code_id IN (
      SELECT id FROM qr_codes WHERE user_id = auth.uid()
    )
  );

-- Function to increment scan count
CREATE OR REPLACE FUNCTION increment_scan_count(qr_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE qr_codes SET scan_count = scan_count + 1, updated_at = NOW()
  WHERE id = qr_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
