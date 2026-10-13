-- Regional summary for overview dashboard
CREATE OR REPLACE FUNCTION get_regional_summary(p_year SMALLINT DEFAULT NULL)
RETURNS TABLE (
  region TEXT, site_count BIGINT, avg_incidence DOUBLE PRECISION,
  avg_tpr DOUBLE PRECISION, total_visits BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.region, COUNT(DISTINCT m.site),
    ROUND(AVG(m.malaria_incidence_per_1000_py)::NUMERIC, 1)::DOUBLE PRECISION,
    ROUND(AVG(m.tpr_cases_all)::NUMERIC, 3)::DOUBLE PRECISION,
    SUM(m.visits)::BIGINT
  FROM umsp_monthly_data m
  WHERE (p_year IS NULL OR m.year = p_year)
  GROUP BY m.region ORDER BY m.region;
END;
$$ LANGUAGE plpgsql STABLE;

-- Normalize site name for cross-table matching
CREATE OR REPLACE FUNCTION normalize_site_name(p_site TEXT)
RETURNS TEXT AS $$
  SELECT trim(
    regexp_replace(
      regexp_replace(upper(COALESCE(p_site, '')), '\mHC\s*(II|III|IV|V)\M', '', 'g'),
      '[^A-Z0-9]+', ' ', 'g'
    )
  );
$$ LANGUAGE sql IMMUTABLE;

-- Refresh ID-based mapping between active_sites and UMSP site names
CREATE OR REPLACE FUNCTION refresh_active_site_umsp_site_map()
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  DELETE FROM active_site_umsp_site_map;

  WITH ranked_matches AS (
    SELECT
      a.id AS active_site_id,
      m.site AS umsp_site,
      ROW_NUMBER() OVER (
        PARTITION BY a.id
        ORDER BY length(m.site), m.site
      ) AS rn
    FROM active_sites a
    JOIN (
      SELECT DISTINCT site
      FROM umsp_monthly_data
    ) m
      ON normalize_site_name(a.site) = normalize_site_name(m.site)
  )
  INSERT INTO active_site_umsp_site_map (active_site_id, umsp_site, match_method)
  SELECT active_site_id, umsp_site, 'normalized_name'
  FROM ranked_matches
  WHERE rn = 1;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Data completeness over time
CREATE OR REPLACE FUNCTION get_data_completeness()
RETURNS TABLE (monthyear DATE, completeness DOUBLE PRECISION) AS $$
BEGIN
  RETURN QUERY
  SELECT m.monthyear,
    ROUND(100.0 * COUNT(m.malaria_incidence_per_1000_py)
      FILTER (WHERE m.malaria_incidence_per_1000_py IS NOT NULL)::NUMERIC
      / NULLIF(COUNT(*)::NUMERIC, 0), 1)::DOUBLE PRECISION
  FROM umsp_monthly_data m GROUP BY m.monthyear ORDER BY m.monthyear;
END;
$$ LANGUAGE plpgsql STABLE;
