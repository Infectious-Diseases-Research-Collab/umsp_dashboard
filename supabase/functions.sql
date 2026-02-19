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
