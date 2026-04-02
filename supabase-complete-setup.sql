-- ═══════════════════════════════════════════════════════════════
-- QR Studio — Complete Database Setup (All-in-One)
-- Run this ONCE in Supabase SQL Editor → New Query → Run
-- Safe to re-run at any time (idempotent)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. updated_at trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 3. profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 4. projects ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id          text        PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qr_value    text        NOT NULL DEFAULT '',
  biz_data    jsonb       NOT NULL DEFAULT '{}',
  copies      jsonb       NOT NULL DEFAULT '[]',
  selections  jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id    ON public.projects (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects (created_at DESC);

-- ── 5. orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                  text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id          text        REFERENCES public.projects(id) ON DELETE SET NULL,
  stripe_session_id   text        UNIQUE NOT NULL,
  stripe_payment_id   text,
  tier                text        NOT NULL CHECK (tier IN ('basic','recommended','premium')),
  amount_cents        integer     NOT NULL CHECK (amount_cents > 0),
  currency            text        NOT NULL DEFAULT 'usd',
  status              text        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','paid','failed','refunded')),
  customer_email      text,
  download_count      integer     NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  paid_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_user_id        ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON public.orders (stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status         ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_project_id     ON public.orders (project_id);

-- ── 6. qr_codes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT 'Untitled QR',
  type          TEXT NOT NULL DEFAULT 'url',
  content       TEXT NOT NULL,
  color         TEXT DEFAULT '#000000',
  bg_color      TEXT DEFAULT '#ffffff',
  scan_count    INTEGER DEFAULT 0,
  is_dynamic    BOOLEAN DEFAULT false,
  short_code    TEXT UNIQUE,
  redirect_url  TEXT,
  is_active     BOOLEAN DEFAULT true,
  password_hash TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id   ON public.qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_short_code ON public.qr_codes(short_code);

-- ── 7. qr_scans ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qr_scans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id   UUID REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  scanned_at   TIMESTAMPTZ DEFAULT NOW(),
  country      TEXT,
  city         TEXT,
  device_type  TEXT,
  os           TEXT,
  browser      TEXT,
  ip_hash      TEXT
);

CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON public.qr_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON public.qr_scans(scanned_at);

-- ── 8. Function: increment_scan_count ────────────────────────
CREATE OR REPLACE FUNCTION increment_scan_count(qr_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.qr_codes SET scan_count = scan_count + 1, updated_at = NOW()
  WHERE id = qr_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 9. Function: generate_short_code ─────────────────────────
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

-- ── 10. Row Level Security ────────────────────────────────────
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scans  ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "profiles_select_own"             ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"             ON public.profiles;
DROP POLICY IF EXISTS "projects_select_own"             ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own"             ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own"             ON public.projects;
DROP POLICY IF EXISTS "orders_select_own"               ON public.orders;
DROP POLICY IF EXISTS "Users can view own qr_codes"     ON public.qr_codes;
DROP POLICY IF EXISTS "Users can insert own qr_codes"   ON public.qr_codes;
DROP POLICY IF EXISTS "Users can update own qr_codes"   ON public.qr_codes;
DROP POLICY IF EXISTS "Users can delete own qr_codes"   ON public.qr_codes;
DROP POLICY IF EXISTS "Anyone can insert scans"         ON public.qr_scans;
DROP POLICY IF EXISTS "Users can view scans of own QR codes" ON public.qr_scans;

-- profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- projects
CREATE POLICY "projects_select_own" ON public.projects
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- orders
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id AND status = 'paid');

-- qr_codes
CREATE POLICY "Users can view own qr_codes" ON public.qr_codes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own qr_codes" ON public.qr_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own qr_codes" ON public.qr_codes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own qr_codes" ON public.qr_codes
  FOR DELETE USING (auth.uid() = user_id);

-- qr_scans
CREATE POLICY "Anyone can insert scans" ON public.qr_scans
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view scans of own QR codes" ON public.qr_scans
  FOR SELECT USING (
    qr_code_id IN (SELECT id FROM public.qr_codes WHERE user_id = auth.uid())
  );

-- ── 11. Dashboard view ────────────────────────────────────────
DROP VIEW IF EXISTS public.order_details;
CREATE VIEW public.order_details WITH (security_invoker = true) AS
  SELECT
    o.id, o.user_id, o.project_id, o.stripe_session_id,
    o.tier, o.amount_cents, o.currency, o.status,
    o.customer_email, o.download_count, o.paid_at,
    o.created_at, o.updated_at,
    p.qr_value, p.biz_data, p.copies, p.selections
  FROM public.orders o
  LEFT JOIN public.projects p ON p.id = o.project_id;

-- ── 12. Grants ────────────────────────────────────────────────
GRANT SELECT, UPDATE         ON public.profiles      TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.projects      TO authenticated;
GRANT SELECT                 ON public.orders        TO authenticated;
GRANT SELECT                 ON public.order_details TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_codes TO authenticated;
GRANT SELECT, INSERT         ON public.qr_scans      TO authenticated;
