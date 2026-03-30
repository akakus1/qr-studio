-- ═══════════════════════════════════════════════════════════════
-- QR Studio v2 — Final Production Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run All
-- Idempotent: safe to re-run at any time.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- uuid_generate_v4() fallback

-- ── 2. Reusable updated_at trigger ───────────────────────────
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

-- Auto-create profile on signup
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
-- Immutable after creation. user_id always set server-side from JWT.
CREATE TABLE IF NOT EXISTS public.projects (
  id          text        PRIMARY KEY,           -- gen_<ts>_<rand6> from API
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
-- All mutations (INSERT, UPDATE) are performed by the service role
-- from server-side API routes only. Authenticated users SELECT only.
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
CREATE INDEX IF NOT EXISTS idx_orders_paid_at        ON public.orders (paid_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_orders_created_at     ON public.orders (created_at DESC);

-- ── 6. Row Level Security ─────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders   ENABLE ROW LEVEL SECURITY;

-- Drop all policies for idempotent re-runs
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "projects_all_own"     ON public.projects;  -- old broad policy
DROP POLICY IF EXISTS "projects_select_own"  ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own"  ON public.projects;
DROP POLICY IF EXISTS "projects_update_own"  ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own"  ON public.projects;
DROP POLICY IF EXISTS "orders_select_own"    ON public.orders;
DROP POLICY IF EXISTS "orders_insert_own"    ON public.orders;
DROP POLICY IF EXISTS "orders_update_own"    ON public.orders;

-- profiles: read and update own row only
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- profiles INSERT is handled by the handle_new_user() SECURITY DEFINER trigger.
-- No INSERT policy needed for the authenticated role.

-- projects: explicit per-operation policies
-- SELECT: own rows only
CREATE POLICY "projects_select_own" ON public.projects
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: belt-and-suspenders guard; API uses service role which bypasses RLS,
-- but this prevents a compromised anon key from inserting rows with wrong user_id.
CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: not permitted for authenticated role. Projects are immutable.
-- Service role bypasses RLS for any server-side corrections if ever needed.
-- (No UPDATE policy = authenticated role cannot update.)

-- DELETE: allow users to delete their own projects (GDPR support)
CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- orders: SELECT own paid orders only.
-- INSERT and UPDATE are done exclusively by the service role server-side.
-- No INSERT/UPDATE policy for authenticated role = they cannot write orders.
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND status = 'paid');

-- ── 7. Dashboard view ─────────────────────────────────────────
DROP VIEW IF EXISTS public.order_details;
CREATE VIEW public.order_details
  WITH (security_invoker = true)   -- RLS still applies through the view
AS
  SELECT
    o.id,
    o.user_id,
    o.project_id,
    o.stripe_session_id,
    o.tier,
    o.amount_cents,
    o.currency,
    o.status,
    o.customer_email,
    o.download_count,
    o.paid_at,
    o.created_at,
    o.updated_at,
    p.qr_value,
    p.biz_data,
    p.copies,
    p.selections
  FROM public.orders o
  LEFT JOIN public.projects p ON p.id = o.project_id;

-- ── 8. Grants ─────────────────────────────────────────────────
-- profiles
GRANT SELECT, UPDATE           ON public.profiles      TO authenticated;
-- projects
GRANT SELECT, INSERT, DELETE   ON public.projects      TO authenticated;
-- orders: read-only for authenticated; mutations are service-role only
GRANT SELECT                   ON public.orders        TO authenticated;
-- view
GRANT SELECT                   ON public.order_details TO authenticated;

-- ── 9. Extensibility stubs ────────────────────────────────────
-- Uncomment to enable when needed — follows the same RLS + trigger pattern.

/*
-- Future subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_sub_id       text        UNIQUE NOT NULL,
  plan                text        NOT NULL DEFAULT 'pro',
  status              text        NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active','canceled','past_due','trialing')),
  current_period_end  timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS trg_subs_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subs_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_select_own" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
GRANT SELECT ON public.subscriptions TO authenticated;
*/

/*
-- Future admin_users table (role-based access)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer','editor','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_users_select_own" ON public.admin_users
  FOR SELECT TO authenticated USING (auth.uid() = id);
GRANT SELECT ON public.admin_users TO authenticated;
*/
