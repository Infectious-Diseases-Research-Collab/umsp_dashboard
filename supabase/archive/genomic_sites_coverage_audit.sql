-- ============================================================================
-- Audit: why are genomic sites missing coordinates?
-- ============================================================================
-- A site fails to appear on the genomic map for one of three reasons. They need
-- different fixes, so triage first (STEP 1) and only then apply STEP 2/3/4.
--
--   A. No reference row      — site_key matches nothing in genomic_sites_reference.
--                              Needs an alias (paragon_key) or a brand-new row.
--   B. Row, but no coords    — the reference row exists with NULL lat/lon.
--                              Often backfillable from the other coordinate tables.
--   C. Resolved              — fine, will render.
--
-- Every query here is read-only except STEP 2 and STEP 3, which are marked.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 1 — triage: one row per site key, with its diagnosis
-- ----------------------------------------------------------------------------
-- Run this first. The `diagnosis` column tells you which fix each site needs,
-- and `rows` tells you how much data is riding on it (fix the big ones first).

WITH keys AS (
  SELECT platform, site_key, count(*) AS rows FROM public.genomic_single_locus_v GROUP BY 1,2
  UNION ALL
  SELECT platform, site_key, count(*) AS rows FROM public.genomic_multi_locus_v  GROUP BY 1,2
),
agg AS (
  SELECT platform, site_key, sum(rows) AS rows FROM keys GROUP BY 1,2
),
resolved AS (
  SELECT a.platform, a.site_key, a.rows,
         r.site_name, r.latitude, r.longitude
  FROM agg a
  LEFT JOIN public.genomic_sites_reference r
    ON (a.platform = 'mips'    AND r.collection_code = a.site_key)
    OR (a.platform = 'paragon' AND (r.paragon_key = a.site_key OR r.site_name = a.site_key))
)
SELECT
  platform,
  site_key,
  rows,
  site_name,
  CASE
    WHEN site_name IS NULL                          THEN 'A. no reference row'
    WHEN latitude IS NULL OR longitude IS NULL      THEN 'B. row exists, no coordinates'
    ELSE                                                 'C. resolved'
  END AS diagnosis
FROM resolved
ORDER BY diagnosis, rows DESC, platform, site_key;


-- ----------------------------------------------------------------------------
-- STEP 2 (WRITES) — fix bucket B by borrowing coordinates you already have
-- ----------------------------------------------------------------------------
-- The project has two other coordinate tables. Where a genomic site is the same
-- facility, copy the coordinates across rather than re-deriving them.
-- Preview each one BEFORE running the UPDATE beneath it.

-- 2a. Preview: exact name matches against health_facility_coordinates (lat/lon NOT NULL there)
SELECT r.site_name, h.site AS match, h.latitude, h.longitude
FROM public.genomic_sites_reference r
JOIN public.health_facility_coordinates h ON h.site = r.site_name
WHERE r.latitude IS NULL OR r.longitude IS NULL
ORDER BY 1;

UPDATE public.genomic_sites_reference r
SET latitude = h.latitude, longitude = h.longitude
FROM public.health_facility_coordinates h
WHERE h.site = r.site_name
  AND (r.latitude IS NULL OR r.longitude IS NULL);

-- 2b. Preview: exact name matches against umsp_sites (nullable there, so filter)
SELECT r.site_name, u.site AS match, u.latitude, u.longitude
FROM public.genomic_sites_reference r
JOIN public.umsp_sites u ON u.site = r.site_name
WHERE (r.latitude IS NULL OR r.longitude IS NULL)
  AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL
ORDER BY 1;

UPDATE public.genomic_sites_reference r
SET latitude = u.latitude, longitude = u.longitude
FROM public.umsp_sites u
WHERE u.site = r.site_name
  AND (r.latitude IS NULL OR r.longitude IS NULL)
  AND u.latitude IS NOT NULL AND u.longitude IS NOT NULL;

-- 2c. Preview ONLY — near-matches that exact equality missed (spelling/suffix drift).
--     Do NOT bulk-apply this; eyeball it and write individual UPDATEs, because a
--     prefix can match the wrong facility.
SELECT r.site_name AS genomic_name,
       h.site      AS hfc_name,
       h.latitude, h.longitude
FROM public.genomic_sites_reference r
JOIN public.health_facility_coordinates h
  ON h.site ILIKE split_part(r.site_name, ' ', 1) || '%'
WHERE r.latitude IS NULL OR r.longitude IS NULL
ORDER BY 1, 2;


-- ----------------------------------------------------------------------------
-- STEP 3 (WRITES) — fix bucket A: keys with no reference row
-- ----------------------------------------------------------------------------
-- Usually an alias problem, not a missing site. Find the likely facility first:

SELECT k.site_key, r.site_name, r.district, r.latitude, r.longitude
FROM (
  SELECT DISTINCT site_key FROM public.genomic_single_locus WHERE platform = 'paragon'
  UNION
  SELECT DISTINCT site_key FROM public.genomic_multi_locus  WHERE platform = 'paragon'
) k
LEFT JOIN public.genomic_sites_reference r ON r.site_name ILIKE k.site_key || '%'
ORDER BY 1, 2;

-- If the facility IS there under a different name, add the alias:
--   UPDATE public.genomic_sites_reference SET paragon_key = 'Alebtong'
--    WHERE site_name = 'Alebtong HCIV';
--
-- If it genuinely is not there, add the site (coordinates required to map it):
--   INSERT INTO public.genomic_sites_reference (site_name, district, region, latitude, longitude, paragon_key)
--   VALUES ('Alebtong HCIV', 'Alebtong', 'Northern', 2.2540, 33.3480, 'Alebtong');
--
-- For MIPs keys in bucket A, set collection_code instead of paragon_key.


-- ----------------------------------------------------------------------------
-- STEP 4 — what is still broken, and the final gate
-- ----------------------------------------------------------------------------

-- 4a. Reference rows still lacking coordinates — these need real lat/lon.
--     Export this list, fill it in, and re-upload merged_sites_reference.csv
--     through /admin (it upserts on site_name), or UPDATE by hand.
SELECT site_name, district, region, collection_code, paragon_key
FROM public.genomic_sites_reference
WHERE latitude IS NULL OR longitude IS NULL
ORDER BY 1;

-- 4b. THE GATE. Re-run STEP 1 — every row should now say 'C. resolved'.
--     Then confirm at the data level; with_coords must equal rows everywhere:
SELECT platform, year, count(*) AS rows, count(latitude) AS with_coords
FROM public.genomic_single_locus_v
GROUP BY 1,2 ORDER BY 1,2;

SELECT platform, year, count(*) AS rows, count(latitude) AS with_coords
FROM public.genomic_multi_locus_v
GROUP BY 1,2 ORDER BY 1,2;
