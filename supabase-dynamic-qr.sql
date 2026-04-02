-- ============================================================
-- Dynamic QR Codes Schema
-- Run this in Supabase SQL Editor after supabase-analytics.sql
-- ============================================================

-- Add dynamic QR columns to qr_codes table
ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS is_dynamic    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS short_code    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS redirect_url  TEXT,
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Index for fast short_code lookups
CREATE INDEX IF NOT EXISTS idx_qr_codes_short_code ON qr_codes(short_code);

-- Function to generate unique short codes
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..7 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
