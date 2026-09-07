-- ============================================================================
-- Migration: let Paragon (2023+) genomic rows resolve to site coordinates
-- ============================================================================
-- PROBLEM
--   genomic_single_locus_v / genomic_multi_locus_v join MIPs rows to the site
--   reference on `collection_code` (site_key = "AG") but Paragon rows on
--   `site_name` (site_key = "Alebtong"). Paragon site_keys are short names
--   parsed out of `population`, and they do NOT equal the fuller facility names
--   held in genomic_sites_reference.site_name. So the paragon join misses,
--   latitude/longitude come back NULL, and every Paragon site is silently
--   dropped by the map (GenomicMapView skips any site without coordinates).
--
-- FIX
--   Give the site reference an explicit `paragon_key` alias column — the
--   symmetric counterpart to the existing `collection_code` MIPs alias — and
--   join on it. An alias column is used rather than a fuzzy ILIKE join in the
--   view because a LEFT JOIN that prefix-matched two facilities would DUPLICATE
--   rows, and so duplicate pie slices on the map.
--
-- Run the steps in order. Steps 0 and 3 are read-only checks.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- STEP 0 (read-only) — see the damage before changing anything
-- ----------------------------------------------------------------------------

-- 0a. Which Paragon site keys have no match in the sites reference?
SELECT sl.site_key, count(*) AS rows
FROM public.genomic_single_locus sl
WHERE sl.platform = 'paragon'
  AND NOT EXISTS (
    SELECT 1 FROM public.genomic_sites_reference r WHERE r.site_name = sl.site_key
  )
GROUP BY 1
ORDER BY 1;

-- 0b. Candidate matches by name prefix — this is the mapping, eyeball it.
--     A site_key with a NULL site_name here is absent from the reference table
--     entirely and must be added (with real coordinates) before it can be mapped.
SELECT k.site_key, r.site_name, r.district, r.latitude, r.longitude
FROM (
  SELECT DISTINCT site_key FROM public.genomic_single_locus WHERE platform = 'paragon'
  UNION
  SELECT DISTINCT site_key FROM public.genomic_multi_locus  WHERE platform = 'paragon'
) k
LEFT JOIN public.genomic_sites_reference r ON r.site_name ILIKE k.site_key || '%'
ORDER BY 1, 2;


-- ----------------------------------------------------------------------------
-- STEP 1 — add the alias column
-- ----------------------------------------------------------------------------

ALTER TABLE public.genomic_sites_reference
  ADD COLUMN IF NOT EXISTS paragon_key TEXT;

-- Unique so one Paragon key can never map to two facilities.
-- (Separate from the ADD COLUMN so re-running is safe.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'genomic_sites_reference_paragon_key_key'
  ) THEN
    ALTER TABLE public.genomic_sites_reference
      ADD CONSTRAINT genomic_sites_reference_paragon_key_key UNIQUE (paragon_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gsref_paragon_key
  ON public.genomic_sites_reference (paragon_key);

COMMENT ON COLUMN public.genomic_sites_reference.paragon_key IS
  'Paragon site_key as it appears in the population string (e.g. ''Alebtong''). NULL for non-Paragon sites.';


-- ----------------------------------------------------------------------------
-- STEP 2 — seed the aliases (PREVIEW, then APPLY)
-- ----------------------------------------------------------------------------
-- Scoped to reference rows with collection_code IS NULL: those are the non-MIPs
-- rows, i.e. the Paragon half of the table. This keeps the seed from ever
-- aliasing a MIPs row by accident.
--
-- Match is `site_name ILIKE key || '%'` — site_name holds the full facility
-- label ("Kiyunga HCIV (Luuka District)") and the Paragon key is the place name
-- it starts with ("Kiyunga"). A match is only applied when it is unambiguous in
-- BOTH directions: one key resolves to one row, and that row is claimed by only
-- one key. Anything else is left for a human, because a wrong alias silently
-- plots a site's data at another facility's coordinates.

-- 2a. PREVIEW — what would be set, and what is ambiguous.
--     n_rows_for_key > 1 or n_keys_for_row > 1 means it will be SKIPPED.
WITH keys AS (
  SELECT DISTINCT site_key FROM public.genomic_single_locus WHERE platform = 'paragon'
  UNION
  SELECT DISTINCT site_key FROM public.genomic_multi_locus  WHERE platform = 'paragon'
)
SELECT k.site_key, r.site_name, r.district, r.latitude, r.longitude,
       count(*) OVER (PARTITION BY k.site_key) AS n_rows_for_key,
       count(*) OVER (PARTITION BY r.id)       AS n_keys_for_row
FROM keys k
JOIN public.genomic_sites_reference r
  ON r.collection_code IS NULL
 AND r.site_name ILIKE k.site_key || '%'
ORDER BY n_rows_for_key DESC, n_keys_for_row DESC, k.site_key;

-- 2b. PREVIEW — Paragon keys that match NOTHING. These need a hand-written
--     alias (or a new reference row) in STEP 3.
WITH keys AS (
  SELECT DISTINCT site_key FROM public.genomic_single_locus WHERE platform = 'paragon'
  UNION
  SELECT DISTINCT site_key FROM public.genomic_multi_locus  WHERE platform = 'paragon'
)
SELECT k.site_key
FROM keys k
WHERE NOT EXISTS (
  SELECT 1 FROM public.genomic_sites_reference r
  WHERE r.collection_code IS NULL AND r.site_name ILIKE k.site_key || '%'
)
ORDER BY 1;

-- 2c. APPLY — only the unambiguous pairs. Re-runnable.
WITH keys AS (
  SELECT DISTINCT site_key FROM public.genomic_single_locus WHERE platform = 'paragon'
  UNION
  SELECT DISTINCT site_key FROM public.genomic_multi_locus  WHERE platform = 'paragon'
),
pairs AS (
  SELECT k.site_key, r.id,
         count(*) OVER (PARTITION BY k.site_key) AS n_rows_for_key,
         count(*) OVER (PARTITION BY r.id)       AS n_keys_for_row
  FROM keys k
  JOIN public.genomic_sites_reference r
    ON r.collection_code IS NULL
   AND r.site_name ILIKE k.site_key || '%'
)
UPDATE public.genomic_sites_reference r
SET paragon_key = p.site_key
FROM pairs p
WHERE r.id = p.id
  AND p.n_rows_for_key = 1
  AND p.n_keys_for_row = 1
  AND r.paragon_key IS NULL;

-- 2d. VERIFY — how many of the 40 non-MIPs rows now carry an alias?
SELECT count(*) FILTER (WHERE paragon_key IS NOT NULL) AS aliased,
       count(*)                                        AS non_mips_rows
FROM public.genomic_sites_reference
WHERE collection_code IS NULL;

-- Anything still unaliased needs a hand-written line, e.g.:
--   UPDATE public.genomic_sites_reference SET paragon_key = 'Alebtong'
--    WHERE site_name = 'Apala HCIII (Alebtong District)';
-- The admin uploader can also maintain this: include a `paragon_key` column in
-- the sites-reference CSV and re-upload (it upserts on site_name).


-- ----------------------------------------------------------------------------
-- STEP 3 — repoint both views at the alias
-- ----------------------------------------------------------------------------
-- Column list is unchanged (required by CREATE OR REPLACE VIEW); only the
-- paragon ON clause differs. The site_name arm is kept so any Paragon upload
-- that already uses exact canonical names keeps working.

CREATE OR REPLACE VIEW public.genomic_single_locus_v AS
SELECT
  sl.id,
  sl.platform,
  sl.population,
  sl.site_key,
  sl.year,
  sl.variant,
  sl.gene_id,
  sl.codon,
  sl.allele,
  sl.prev,
  sl.sample_count,
  sl.sample_total,
  sl.allele_total,
  sl.allele_count,
  sl.freq,
  COALESCE(sr_code.site_name, sr_name.site_name, sl.site_key) AS site,
  COALESCE(sr_code.region,    sr_name.region)                 AS region,
  COALESCE(sr_code.district,  sr_name.district)               AS district,
  COALESCE(sr_code.latitude,  sr_name.latitude)               AS latitude,
  COALESCE(sr_code.longitude, sr_name.longitude)              AS longitude
FROM public.genomic_single_locus sl
LEFT JOIN public.genomic_sites_reference sr_code
       ON sl.platform = 'mips'    AND sr_code.collection_code = sl.site_key
LEFT JOIN public.genomic_sites_reference sr_name
       ON sl.platform = 'paragon'
      AND (sr_name.paragon_key = sl.site_key OR sr_name.site_name = sl.site_key);

CREATE OR REPLACE VIEW public.genomic_multi_locus_v AS
SELECT
  ml.id,
  ml.platform,
  ml.population,
  ml.site_key,
  ml.year,
  ml.group_id,
  ml.variant,
  ml.allele_count,
  ml.sample_count,
  ml.allele_total,
  ml.sample_total,
  ml.freq,
  ml.prev,
  COALESCE(sr_code.site_name, sr_name.site_name, ml.site_key) AS site,
  COALESCE(sr_code.region,    sr_name.region)                 AS region,
  COALESCE(sr_code.district,  sr_name.district)               AS district,
  COALESCE(sr_code.latitude,  sr_name.latitude)               AS latitude,
  COALESCE(sr_code.longitude, sr_name.longitude)              AS longitude
FROM public.genomic_multi_locus ml
LEFT JOIN public.genomic_sites_reference sr_code
       ON ml.platform = 'mips'    AND sr_code.collection_code = ml.site_key
LEFT JOIN public.genomic_sites_reference sr_name
       ON ml.platform = 'paragon'
      AND (sr_name.paragon_key = ml.site_key OR sr_name.site_name = ml.site_key);


-- ----------------------------------------------------------------------------
-- STEP 4 (read-only) — pass/fail gate
-- ----------------------------------------------------------------------------
-- Every Paragon year must show with_coords = rows. Anything less means some
-- site keys are still unmapped; go back to STEP 0a.

SELECT platform, year, count(*) AS rows, count(latitude) AS with_coords
FROM public.genomic_single_locus_v
GROUP BY 1, 2
ORDER BY 1, 2;

SELECT platform, year, count(*) AS rows, count(latitude) AS with_coords
FROM public.genomic_multi_locus_v
GROUP BY 1, 2
ORDER BY 1, 2;
