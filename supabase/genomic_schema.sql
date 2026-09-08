-- Genomic surveillance tables + harmonized views
-- See instructions/reference/malaria_genomic_dashboard_spec_v1.docx

-- ============================================================================
-- 1. Site reference (80 rows from merged_sites_reference.csv)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.genomic_sites_reference (
  id               BIGSERIAL PRIMARY KEY,
  site_id          INTEGER,              -- numeric NEWsiteID from first CSV column (nullable)
  site_name        TEXT NOT NULL UNIQUE, -- canonical display name (Health facility)
  full_label       TEXT,                 -- e.g. "Kasambya HCIII (Mubende District)"
  region           TEXT,
  district         TEXT,
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  collection_code  TEXT UNIQUE,          -- MIPs abbreviation (AG, TO, KN, ...). NULL for non-MIPs sites.
  paragon_key      TEXT UNIQUE,          -- Paragon site_key as it appears in `population` (e.g. 'Alebtong'). NULL for non-Paragon sites.
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gsref_collection_code ON public.genomic_sites_reference (collection_code);
CREATE INDEX IF NOT EXISTS idx_gsref_paragon_key ON public.genomic_sites_reference (paragon_key);

-- ============================================================================
-- 2. Single-locus rows (combined MIPs + Paragon)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.genomic_single_locus (
  id             BIGSERIAL PRIMARY KEY,
  platform       TEXT NOT NULL CHECK (platform IN ('mips','paragon')),
  population     TEXT NOT NULL,          -- e.g. "AG-2018" or "Alebtong-2023"
  site_key       TEXT NOT NULL,          -- part of population before the final "-"
  year           INTEGER NOT NULL,       -- part of population after the final "-"
  variant        TEXT NOT NULL,          -- "PF3D7_0709000.1:76:T"
  gene_id        TEXT NOT NULL,          -- "PF3D7_0709000.1"
  codon          INTEGER NOT NULL,
  allele         TEXT NOT NULL,
  prev           DOUBLE PRECISION,
  sample_count   INTEGER,
  sample_total   INTEGER,
  allele_total   INTEGER,
  allele_count   INTEGER,
  freq           DOUBLE PRECISION,
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_gsl UNIQUE (platform, population, variant)
);
CREATE INDEX IF NOT EXISTS idx_gsl_site_year ON public.genomic_single_locus (site_key, year);
CREATE INDEX IF NOT EXISTS idx_gsl_gene_codon ON public.genomic_single_locus (gene_id, codon);

-- ============================================================================
-- 3. Multi-locus rows (combined MIPs + Paragon)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.genomic_multi_locus (
  id             BIGSERIAL PRIMARY KEY,
  platform       TEXT NOT NULL CHECK (platform IN ('mips','paragon')),
  population     TEXT NOT NULL,
  site_key       TEXT NOT NULL,
  year           INTEGER NOT NULL,
  group_id       TEXT NOT NULL,          -- crt / pfdhfr / pfdhps / pfdhfr_pfdhps_octuple / pfdhfr_pfdhps_quintuple / px1
  variant        TEXT NOT NULL,          -- full haplotype string
  allele_count   INTEGER,
  sample_count   INTEGER,
  allele_total   INTEGER,
  sample_total   INTEGER,
  freq           DOUBLE PRECISION,
  prev           DOUBLE PRECISION,
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_gml UNIQUE (platform, population, group_id, variant)
);
CREATE INDEX IF NOT EXISTS idx_gml_site_year ON public.genomic_multi_locus (site_key, year);
CREATE INDEX IF NOT EXISTS idx_gml_group ON public.genomic_multi_locus (group_id);

-- ============================================================================
-- 4. Harmonized views — join raw rows to canonical site metadata.
--    The app queries these views, not the raw tables.
-- ============================================================================
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

-- ============================================================================
-- 5. Row-level security — match the existing pattern in rls-policies.sql.
--    Authenticated users read; admins insert/update/delete.
-- ============================================================================
ALTER TABLE public.genomic_sites_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genomic_single_locus    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genomic_multi_locus     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read genomic_sites_reference" ON public.genomic_sites_reference FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read genomic_single_locus"    ON public.genomic_single_locus    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read genomic_multi_locus"     ON public.genomic_multi_locus     FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin insert genomic_sites_reference" ON public.genomic_sites_reference FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin update genomic_sites_reference" ON public.genomic_sites_reference FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin delete genomic_sites_reference" ON public.genomic_sites_reference FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "Admin insert genomic_single_locus" ON public.genomic_single_locus FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin update genomic_single_locus" ON public.genomic_single_locus FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin delete genomic_single_locus" ON public.genomic_single_locus FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "Admin insert genomic_multi_locus" ON public.genomic_multi_locus FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin update genomic_multi_locus" ON public.genomic_multi_locus FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin delete genomic_multi_locus" ON public.genomic_multi_locus FOR DELETE TO authenticated USING (is_admin());
