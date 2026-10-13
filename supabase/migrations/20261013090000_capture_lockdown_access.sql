-- Captures supabase/lockdown_access.sql (sections 1-4), which was hand-run in
-- the SQL editor on 2026-10-08 before it existed as a migration. Every
-- statement is idempotent, so applying this to the live database is a no-op
-- there and brings a fresh database to the same state. The optional
-- login_events section of that script is intentionally not captured here.
--
-- The original script, with its full rationale, is in
-- supabase/archive/lockdown_access.sql.

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
-- Guarded because the function is not part of the captured schema, so it may
-- not exist on a fresh database.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon;
  END IF;
END $$;

-- get_regional_summary() and get_data_completeness() are left granted: both are
-- invoker-rights (not SECURITY DEFINER), so an anon caller hits RLS on
-- umsp_monthly_data and gets nothing back.


