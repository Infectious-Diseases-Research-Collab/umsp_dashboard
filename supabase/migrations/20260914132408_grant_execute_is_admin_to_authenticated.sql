-- is_admin() is SECURITY DEFINER and is called from RLS policies (USING /
-- WITH CHECK) on INSERT/UPDATE/DELETE for umsp_monthly_data, active_sites,
-- health_facility_coordinates, and the genomic tables. Those policies run as
-- the `authenticated` role, but EXECUTE on the function was only ever
-- granted to `service_role`, so every admin write failed RLS evaluation
-- with "permission denied for function is_admin" (42501) — including
-- uploads via /api/upload, regardless of CSV content.
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
