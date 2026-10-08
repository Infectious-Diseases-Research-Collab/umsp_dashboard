-- ============================================================================
-- Lock down read access to surveillance data.
--
-- RUN THIS BY HAND in the Supabase SQL editor. Nothing in this repo executes
-- SQL automatically, and a Vercel deploy ships code only.
--
-- Safe to run BEFORE deploying any code: the app keeps working unchanged,
-- because `authenticated` retains SELECT and the existing RLS policies already
-- grant it `USING (true)`.
--
-- Idempotent and re-runnable; a fresh database can be rebuilt by running this
-- top to bottom after schema.sql / genomic_schema.sql / rls-policies.sql.
--
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS — three ways `anon` (i.e. anybody, since the anon key ships
-- in the browser bundle) could reach data that is supposed to require a login:
--
--   1. genomic_single_locus_v and genomic_multi_locus_v are owner-rights views
--      owned by postgres. A view without `security_invoker` runs with its
--      OWNER's privileges, so the base tables' RLS never applies to reads
--      through it. Combined with `GRANT ALL ... TO anon` (schema.sql:1051-1071)
--      this exposed 14,763 single-locus and 2,976 multi-locus rows to
--      unauthenticated callers. Verified live before this fix.
--
--   2. Every table and view carried `GRANT ALL` to both `anon` and
--      `authenticated`. For the base tables RLS neutralised `anon`, but
--      `authenticated` held INSERT/UPDATE/DELETE/TRUNCATE privileges and was
--      restrained only by RLS write policies — one missing policy away from
--      letting any signed-in user modify data.
--
--   3. refresh_active_site_umsp_site_map() is SECURITY DEFINER, owned by
--      postgres, and was granted to `anon` (schema.sql:982). Its body begins
--      `DELETE FROM active_site_umsp_site_map`, so an unauthenticated RPC call
--      could wipe and rebuild that table, bypassing RLS entirely.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Views: apply the CALLER's RLS, and stop serving them to anon.
--    Base-table privileges below are what make these readable at all once
--    security_invoker is on.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v text;
  views text[] := ARRAY['genomic_single_locus_v', 'genomic_multi_locus_v'];
BEGIN
  FOREACH v IN ARRAY views LOOP
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = v) THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', v);
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', v);
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v);
    ELSE
      RAISE NOTICE 'view public.% not found, skipped', v;
    END IF;
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- 2. Base tables: nothing for anon; for authenticated, only the privileges the
--    app actually uses.
--
--    Writes stay granted because the admin CSV uploader (POST /api/upload)
--    runs as the signed-in admin user under the `authenticated` role — it is
--    RLS, via is_admin() in rls-policies.sql, that limits writes to admins.
--    `replace` mode deletes all rows first, hence DELETE. Upsert needs both
--    INSERT and UPDATE. Dropping TRUNCATE/REFERENCES/TRIGGER (which GRANT ALL
--    included) costs the app nothing.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  base_tables text[] := ARRAY[
    'umsp_monthly_data',
    'health_facility_coordinates',
    'active_sites',
    'active_site_umsp_site_map',
    'umsp_sites',
    'genomic_sites_reference',
    'genomic_single_locus',
    'genomic_multi_locus'
  ];
BEGIN
  FOREACH t IN ARRAY base_tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    ELSE
      RAISE NOTICE 'table public.% not found, skipped', t;
    END IF;
  END LOOP;
END $$;

-- Sequence privileges are deliberately left alone: BIGSERIAL inserts from the
-- admin uploader need USAGE on the id sequences.


-- ----------------------------------------------------------------------------
-- 3. New tables must not be born public.
--    Must name the same role as the original grant (schema.sql:1134).
-- ----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM anon;


-- ----------------------------------------------------------------------------
-- 4. refresh_active_site_umsp_site_map(): no anon, and admin-only in the body.
--
--    Revoking EXECUTE is not sufficient on its own for defence in depth — the
--    function is SECURITY DEFINER, so if anything ever re-grants it the body
--    must refuse non-admins itself. Nothing in src/ calls this function; it is
--    a maintenance routine run from the SQL editor after uploads.
--
--    The body below is the LIVE definition (read back with pg_get_functiondef
--    on 2026-10-08) with only the guard prepended. Do NOT rebuild it from
--    schema.sql: that pg_dump is stale and its copy of this function is the
--    pre-hardening version, with `SET search_path = public` and unqualified
--    object names. The live one uses `SET search_path TO ''` with everything
--    schema-qualified, which is the correct pattern for SECURITY DEFINER —
--    an empty search_path stops a rogue schema shadowing active_sites or
--    normalize_site_name and hijacking a postgres-owned function.
--
--    Because search_path is empty, the guard must call public.is_admin(),
--    not is_admin(): a bare name would not resolve.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_active_site_umsp_site_map()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'refresh_active_site_umsp_site_map: admin role required';
  END IF;

  DELETE FROM public.active_site_umsp_site_map;

  WITH ranked_matches AS (
    SELECT
      a.id AS active_site_id,
      m.site AS umsp_site,
      ROW_NUMBER() OVER (
        PARTITION BY a.id
        ORDER BY length(m.site), m.site
      ) AS rn
    FROM public.active_sites a
    JOIN (
      SELECT DISTINCT site
      FROM public.umsp_monthly_data
    ) m
      ON public.normalize_site_name(a.site) = public.normalize_site_name(m.site)
  )
  INSERT INTO public.active_site_umsp_site_map (active_site_id, umsp_site, match_method)
  SELECT active_site_id, umsp_site, 'normalized_name'
  FROM ranked_matches
  WHERE rn = 1;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."refresh_active_site_umsp_site_map"() FROM anon;

-- The event-trigger function is not callable over RPC, but it has no business
-- being granted to anon either.
REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM anon;

-- get_regional_summary() and get_data_completeness() are left granted: both are
-- invoker-rights (not SECURITY DEFINER), so an anon caller hits RLS on
-- umsp_monthly_data and gets nothing back.


-- ----------------------------------------------------------------------------
-- 5. Verify. Expect: every row below shows has_anon_select = false.
--    Run this on its own — the SQL editor only shows the last statement's
--    result.
-- ----------------------------------------------------------------------------
-- SELECT c.relname,
--        c.relkind,
--        has_table_privilege('anon', c.oid, 'SELECT') AS has_anon_select,
--        has_table_privilege('authenticated', c.oid, 'SELECT') AS has_auth_select,
--        COALESCE(c.reloptions::text, '') LIKE '%security_invoker=on%' AS invoker
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--  WHERE n.nspname = 'public'
--    AND c.relkind IN ('r', 'v')
--  ORDER BY c.relkind, c.relname;


-- ============================================================================
-- OPTIONAL: durable sign-in log.
--
-- CHECK FIRST whether this is needed. Supabase already records login events in
-- `auth.audit_log_entries` and keeps `auth.users.last_sign_in_at`. Run this and
-- see whether the retention window is long enough for your purposes:
--
--   SELECT min(created_at) AS oldest,
--          max(created_at) AS newest,
--          count(*)        AS events
--     FROM auth.audit_log_entries
--    WHERE payload->>'action' = 'login';
--
-- If that is sufficient, stop here and do not create the table below — it is
-- duplicated state that then has to be maintained.
--
-- Everything below is idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.login_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,
  email       TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_events_occurred_at
  ON public.login_events (occurred_at DESC);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

-- Readable by admins only. No write policy at all: rows arrive solely via the
-- SECURITY DEFINER trigger below, which bypasses RLS by design.
DROP POLICY IF EXISTS "Admin read login_events" ON public.login_events;
CREATE POLICY "Admin read login_events"
  ON public.login_events FOR SELECT TO authenticated USING (public.is_admin());

REVOKE ALL ON public.login_events FROM anon;
REVOKE ALL ON public.login_events FROM authenticated;
GRANT SELECT ON public.login_events TO authenticated;

-- The exception handler matters: a logging failure must never be able to block
-- somebody signing in.
-- search_path is empty and every reference schema-qualified, matching the
-- hardening already applied to this database's other SECURITY DEFINER functions.
CREATE OR REPLACE FUNCTION public.log_login_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  BEGIN
    INSERT INTO public.login_events (user_id, email)
    SELECT NEW.user_id, u.email
      FROM auth.users u
     WHERE u.id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_login_event ON auth.sessions;
CREATE TRIGGER trg_log_login_event
  AFTER INSERT ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION public.log_login_event();

-- Who has signed in lately:
--   SELECT email, max(occurred_at) AS last_seen, count(*) AS sign_ins
--     FROM public.login_events GROUP BY email ORDER BY last_seen DESC;
