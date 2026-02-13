-- Enable RLS
ALTER TABLE umsp_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_facility_coordinates ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sites ENABLE ROW LEVEL SECURITY;

-- Admin helper function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Authenticated READ only (users must be signed in)
CREATE POLICY "Authenticated read umsp_monthly_data" ON umsp_monthly_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read health_facility_coordinates" ON health_facility_coordinates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read active_sites" ON active_sites FOR SELECT TO authenticated USING (true);

-- Admin INSERT/UPDATE/DELETE
CREATE POLICY "Admin insert umsp_monthly_data" ON umsp_monthly_data FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin update umsp_monthly_data" ON umsp_monthly_data FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin delete umsp_monthly_data" ON umsp_monthly_data FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "Admin insert health_facility_coordinates" ON health_facility_coordinates FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin update health_facility_coordinates" ON health_facility_coordinates FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin delete health_facility_coordinates" ON health_facility_coordinates FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "Admin insert active_sites" ON active_sites FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin update active_sites" ON active_sites FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin delete active_sites" ON active_sites FOR DELETE TO authenticated USING (is_admin());
