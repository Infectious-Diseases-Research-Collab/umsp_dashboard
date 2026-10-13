


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_data_completeness"() RETURNS TABLE("monthyear" "date", "completeness" double precision)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
  RETURN QUERY
  SELECT m.monthyear,
    ROUND(100.0 * COUNT(m.malaria_incidence_per_1000_py)
      FILTER (WHERE m.malaria_incidence_per_1000_py IS NOT NULL)::NUMERIC
      / NULLIF(COUNT(*)::NUMERIC, 0), 1)::DOUBLE PRECISION
  FROM umsp_monthly_data m GROUP BY m.monthyear ORDER BY m.monthyear;
END;
$$;


ALTER FUNCTION "public"."get_data_completeness"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_regional_summary"("p_year" smallint DEFAULT NULL::smallint) RETURNS TABLE("region" "text", "site_count" bigint, "avg_incidence" double precision, "avg_tpr" double precision, "total_visits" bigint)
    LANGUAGE "plpgsql" STABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."get_regional_summary"("p_year" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_site_name"("p_site" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT trim(
    regexp_replace(
      regexp_replace(upper(COALESCE(p_site, '')), '\mHC\s*(II|III|IV|V)\M', '', 'g'),
      '[^A-Z0-9]+', ' ', 'g'
    )
  );
$$;


ALTER FUNCTION "public"."normalize_site_name"("p_site" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_active_site_umsp_site_map"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."refresh_active_site_umsp_site_map"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."active_site_umsp_site_map" (
    "id" bigint NOT NULL,
    "active_site_id" bigint NOT NULL,
    "umsp_site" "text" NOT NULL,
    "match_method" "text" DEFAULT 'normalized_name'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."active_site_umsp_site_map" OWNER TO "postgres";


ALTER TABLE "public"."active_site_umsp_site_map" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."active_site_umsp_site_map_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."active_sites" (
    "id" bigint NOT NULL,
    "site" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."active_sites" OWNER TO "postgres";


ALTER TABLE "public"."active_sites" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."active_sites_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."genomic_multi_locus" (
    "id" bigint NOT NULL,
    "platform" "text" NOT NULL,
    "population" "text" NOT NULL,
    "site_key" "text" NOT NULL,
    "year" integer NOT NULL,
    "group_id" "text" NOT NULL,
    "variant" "text" NOT NULL,
    "allele_count" integer,
    "sample_count" integer,
    "allele_total" integer,
    "sample_total" integer,
    "freq" double precision,
    "prev" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "genomic_multi_locus_platform_check" CHECK (("platform" = ANY (ARRAY['mips'::"text", 'paragon'::"text"])))
);


ALTER TABLE "public"."genomic_multi_locus" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."genomic_multi_locus_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."genomic_multi_locus_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."genomic_multi_locus_id_seq" OWNED BY "public"."genomic_multi_locus"."id";



CREATE TABLE IF NOT EXISTS "public"."genomic_sites_reference" (
    "id" bigint NOT NULL,
    "site_id" integer,
    "site_name" "text" NOT NULL,
    "full_label" "text",
    "region" "text",
    "district" "text",
    "latitude" double precision,
    "longitude" double precision,
    "collection_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."genomic_sites_reference" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."genomic_multi_locus_v" AS
 SELECT "ml"."id",
    "ml"."platform",
    "ml"."population",
    "ml"."site_key",
    "ml"."year",
    "ml"."group_id",
    "ml"."variant",
    "ml"."allele_count",
    "ml"."sample_count",
    "ml"."allele_total",
    "ml"."sample_total",
    "ml"."freq",
    "ml"."prev",
    COALESCE("sr_code"."site_name", "sr_name"."site_name", "ml"."site_key") AS "site",
    COALESCE("sr_code"."region", "sr_name"."region") AS "region",
    COALESCE("sr_code"."district", "sr_name"."district") AS "district",
    COALESCE("sr_code"."latitude", "sr_name"."latitude") AS "latitude",
    COALESCE("sr_code"."longitude", "sr_name"."longitude") AS "longitude"
   FROM (("public"."genomic_multi_locus" "ml"
     LEFT JOIN "public"."genomic_sites_reference" "sr_code" ON ((("ml"."platform" = 'mips'::"text") AND ("sr_code"."collection_code" = "ml"."site_key"))))
     LEFT JOIN "public"."genomic_sites_reference" "sr_name" ON ((("ml"."platform" = 'paragon'::"text") AND ("sr_name"."site_name" = "ml"."site_key"))));


ALTER VIEW "public"."genomic_multi_locus_v" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."genomic_single_locus" (
    "id" bigint NOT NULL,
    "platform" "text" NOT NULL,
    "population" "text" NOT NULL,
    "site_key" "text" NOT NULL,
    "year" integer NOT NULL,
    "variant" "text" NOT NULL,
    "gene_id" "text" NOT NULL,
    "codon" integer NOT NULL,
    "allele" "text" NOT NULL,
    "prev" double precision,
    "sample_count" integer,
    "sample_total" integer,
    "allele_total" integer,
    "allele_count" integer,
    "freq" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "genomic_single_locus_platform_check" CHECK (("platform" = ANY (ARRAY['mips'::"text", 'paragon'::"text"])))
);


ALTER TABLE "public"."genomic_single_locus" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."genomic_single_locus_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."genomic_single_locus_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."genomic_single_locus_id_seq" OWNED BY "public"."genomic_single_locus"."id";



CREATE OR REPLACE VIEW "public"."genomic_single_locus_v" AS
 SELECT "sl"."id",
    "sl"."platform",
    "sl"."population",
    "sl"."site_key",
    "sl"."year",
    "sl"."variant",
    "sl"."gene_id",
    "sl"."codon",
    "sl"."allele",
    "sl"."prev",
    "sl"."sample_count",
    "sl"."sample_total",
    "sl"."allele_total",
    "sl"."allele_count",
    "sl"."freq",
    COALESCE("sr_code"."site_name", "sr_name"."site_name", "sl"."site_key") AS "site",
    COALESCE("sr_code"."region", "sr_name"."region") AS "region",
    COALESCE("sr_code"."district", "sr_name"."district") AS "district",
    COALESCE("sr_code"."latitude", "sr_name"."latitude") AS "latitude",
    COALESCE("sr_code"."longitude", "sr_name"."longitude") AS "longitude"
   FROM (("public"."genomic_single_locus" "sl"
     LEFT JOIN "public"."genomic_sites_reference" "sr_code" ON ((("sl"."platform" = 'mips'::"text") AND ("sr_code"."collection_code" = "sl"."site_key"))))
     LEFT JOIN "public"."genomic_sites_reference" "sr_name" ON ((("sl"."platform" = 'paragon'::"text") AND ("sr_name"."site_name" = "sl"."site_key"))));


ALTER VIEW "public"."genomic_single_locus_v" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."genomic_sites_reference_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."genomic_sites_reference_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."genomic_sites_reference_id_seq" OWNED BY "public"."genomic_sites_reference"."id";



CREATE TABLE IF NOT EXISTS "public"."health_facility_coordinates" (
    "id" bigint NOT NULL,
    "new_site_id" integer NOT NULL,
    "site" "text" NOT NULL,
    "district" "text" NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."health_facility_coordinates" OWNER TO "postgres";


ALTER TABLE "public"."health_facility_coordinates" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."health_facility_coordinates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."umsp_monthly_data" (
    "id" bigint NOT NULL,
    "site" "text" NOT NULL,
    "region" "text" NOT NULL,
    "district" "text" NOT NULL,
    "monthyear" "date" NOT NULL,
    "quarter" "text" NOT NULL,
    "year" smallint NOT NULL,
    "malaria_incidence_per_1000_py" double precision,
    "tpr_cases_all" double precision,
    "tpr_cases_per_ca" double precision,
    "visits" integer,
    "malariasuspected" integer,
    "propsuspected_per_total_visits" double precision,
    "proptested" double precision,
    "prop_visit_ca" double precision,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."umsp_monthly_data" OWNER TO "postgres";


ALTER TABLE "public"."umsp_monthly_data" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."umsp_monthly_data_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."umsp_sites" (
    "site_id" integer NOT NULL,
    "site" "text" NOT NULL,
    "district" "text",
    "region" "text",
    "status" "text",
    "date_from" "date",
    "date_to" "date",
    "latitude" double precision,
    "longitude" double precision
);


ALTER TABLE "public"."umsp_sites" OWNER TO "postgres";


ALTER TABLE ONLY "public"."genomic_multi_locus" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."genomic_multi_locus_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."genomic_single_locus" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."genomic_single_locus_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."genomic_sites_reference" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."genomic_sites_reference_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."active_site_umsp_site_map"
    ADD CONSTRAINT "active_site_umsp_site_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."active_sites"
    ADD CONSTRAINT "active_sites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."active_sites"
    ADD CONSTRAINT "active_sites_site_key" UNIQUE ("site");



ALTER TABLE ONLY "public"."genomic_multi_locus"
    ADD CONSTRAINT "genomic_multi_locus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."genomic_single_locus"
    ADD CONSTRAINT "genomic_single_locus_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."genomic_sites_reference"
    ADD CONSTRAINT "genomic_sites_reference_collection_code_key" UNIQUE ("collection_code");



ALTER TABLE ONLY "public"."genomic_sites_reference"
    ADD CONSTRAINT "genomic_sites_reference_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."genomic_sites_reference"
    ADD CONSTRAINT "genomic_sites_reference_site_name_key" UNIQUE ("site_name");



ALTER TABLE ONLY "public"."health_facility_coordinates"
    ADD CONSTRAINT "health_facility_coordinates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."health_facility_coordinates"
    ADD CONSTRAINT "health_facility_coordinates_site_key" UNIQUE ("site");



ALTER TABLE ONLY "public"."umsp_monthly_data"
    ADD CONSTRAINT "umsp_monthly_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."umsp_sites"
    ADD CONSTRAINT "umsp_sites_pkey" PRIMARY KEY ("site_id");



ALTER TABLE ONLY "public"."active_site_umsp_site_map"
    ADD CONSTRAINT "uq_active_site_map_active_site_id" UNIQUE ("active_site_id");



ALTER TABLE ONLY "public"."active_site_umsp_site_map"
    ADD CONSTRAINT "uq_active_site_map_umsp_site" UNIQUE ("umsp_site");



ALTER TABLE ONLY "public"."genomic_multi_locus"
    ADD CONSTRAINT "uq_gml" UNIQUE ("platform", "population", "group_id", "variant");



ALTER TABLE ONLY "public"."genomic_single_locus"
    ADD CONSTRAINT "uq_gsl" UNIQUE ("platform", "population", "variant");



ALTER TABLE ONLY "public"."umsp_monthly_data"
    ADD CONSTRAINT "uq_site_monthyear" UNIQUE ("site", "monthyear");



CREATE INDEX "idx_active_site" ON "public"."active_sites" USING "btree" ("site");



CREATE INDEX "idx_active_site_map_active_site_id" ON "public"."active_site_umsp_site_map" USING "btree" ("active_site_id");



CREATE INDEX "idx_active_site_map_umsp_site" ON "public"."active_site_umsp_site_map" USING "btree" ("umsp_site");



CREATE INDEX "idx_coords_site" ON "public"."health_facility_coordinates" USING "btree" ("site");



CREATE INDEX "idx_gml_group" ON "public"."genomic_multi_locus" USING "btree" ("group_id");



CREATE INDEX "idx_gml_site_year" ON "public"."genomic_multi_locus" USING "btree" ("site_key", "year");



CREATE INDEX "idx_gsl_gene_codon" ON "public"."genomic_single_locus" USING "btree" ("gene_id", "codon");



CREATE INDEX "idx_gsl_site_year" ON "public"."genomic_single_locus" USING "btree" ("site_key", "year");



CREATE INDEX "idx_gsref_collection_code" ON "public"."genomic_sites_reference" USING "btree" ("collection_code");



CREATE INDEX "idx_monthly_district" ON "public"."umsp_monthly_data" USING "btree" ("district");



CREATE INDEX "idx_monthly_monthyear" ON "public"."umsp_monthly_data" USING "btree" ("monthyear");



CREATE INDEX "idx_monthly_quarter" ON "public"."umsp_monthly_data" USING "btree" ("quarter");



CREATE INDEX "idx_monthly_region" ON "public"."umsp_monthly_data" USING "btree" ("region");



CREATE INDEX "idx_monthly_region_monthyear" ON "public"."umsp_monthly_data" USING "btree" ("region", "monthyear");



CREATE INDEX "idx_monthly_site" ON "public"."umsp_monthly_data" USING "btree" ("site");



CREATE INDEX "idx_monthly_site_monthyear" ON "public"."umsp_monthly_data" USING "btree" ("site", "monthyear");



CREATE INDEX "idx_monthly_year" ON "public"."umsp_monthly_data" USING "btree" ("year");



ALTER TABLE ONLY "public"."active_site_umsp_site_map"
    ADD CONSTRAINT "active_site_umsp_site_map_active_site_id_fkey" FOREIGN KEY ("active_site_id") REFERENCES "public"."active_sites"("id") ON DELETE CASCADE;



CREATE POLICY "Admin delete active_site_umsp_site_map" ON "public"."active_site_umsp_site_map" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete active_sites" ON "public"."active_sites" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete genomic_multi_locus" ON "public"."genomic_multi_locus" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete genomic_single_locus" ON "public"."genomic_single_locus" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete genomic_sites_reference" ON "public"."genomic_sites_reference" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete health_facility_coordinates" ON "public"."health_facility_coordinates" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete umsp_monthly_data" ON "public"."umsp_monthly_data" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin delete umsp_sites" ON "public"."umsp_sites" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin insert active_site_umsp_site_map" ON "public"."active_site_umsp_site_map" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin insert active_sites" ON "public"."active_sites" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin insert genomic_multi_locus" ON "public"."genomic_multi_locus" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin insert genomic_single_locus" ON "public"."genomic_single_locus" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin insert genomic_sites_reference" ON "public"."genomic_sites_reference" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin insert health_facility_coordinates" ON "public"."health_facility_coordinates" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin insert umsp_monthly_data" ON "public"."umsp_monthly_data" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin insert umsp_sites" ON "public"."umsp_sites" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admin update active_site_umsp_site_map" ON "public"."active_site_umsp_site_map" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin update active_sites" ON "public"."active_sites" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin update genomic_multi_locus" ON "public"."genomic_multi_locus" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin update genomic_single_locus" ON "public"."genomic_single_locus" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin update genomic_sites_reference" ON "public"."genomic_sites_reference" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin update health_facility_coordinates" ON "public"."health_facility_coordinates" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin update umsp_monthly_data" ON "public"."umsp_monthly_data" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admin update umsp_sites" ON "public"."umsp_sites" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Authenticated read active_sites" ON "public"."active_sites" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read genomic_multi_locus" ON "public"."genomic_multi_locus" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read genomic_single_locus" ON "public"."genomic_single_locus" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read genomic_sites_reference" ON "public"."genomic_sites_reference" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read health_facility_coordinates" ON "public"."health_facility_coordinates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read umsp_monthly_data" ON "public"."umsp_monthly_data" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated read umsp_sites" ON "public"."umsp_sites" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."active_site_umsp_site_map" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."active_sites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."genomic_multi_locus" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."genomic_single_locus" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."genomic_sites_reference" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."health_facility_coordinates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."umsp_monthly_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."umsp_sites" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."get_data_completeness"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_data_completeness"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_data_completeness"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_regional_summary"("p_year" smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_regional_summary"("p_year" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_regional_summary"("p_year" smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_site_name"("p_site" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_site_name"("p_site" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_site_name"("p_site" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_active_site_umsp_site_map"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_active_site_umsp_site_map"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_active_site_umsp_site_map"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."active_site_umsp_site_map" TO "anon";
GRANT ALL ON TABLE "public"."active_site_umsp_site_map" TO "authenticated";
GRANT ALL ON TABLE "public"."active_site_umsp_site_map" TO "service_role";



GRANT ALL ON SEQUENCE "public"."active_site_umsp_site_map_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."active_site_umsp_site_map_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."active_site_umsp_site_map_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."active_sites" TO "anon";
GRANT ALL ON TABLE "public"."active_sites" TO "authenticated";
GRANT ALL ON TABLE "public"."active_sites" TO "service_role";



GRANT ALL ON SEQUENCE "public"."active_sites_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."active_sites_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."active_sites_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."genomic_multi_locus" TO "anon";
GRANT ALL ON TABLE "public"."genomic_multi_locus" TO "authenticated";
GRANT ALL ON TABLE "public"."genomic_multi_locus" TO "service_role";



GRANT ALL ON SEQUENCE "public"."genomic_multi_locus_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."genomic_multi_locus_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."genomic_multi_locus_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."genomic_sites_reference" TO "anon";
GRANT ALL ON TABLE "public"."genomic_sites_reference" TO "authenticated";
GRANT ALL ON TABLE "public"."genomic_sites_reference" TO "service_role";



GRANT ALL ON TABLE "public"."genomic_multi_locus_v" TO "anon";
GRANT ALL ON TABLE "public"."genomic_multi_locus_v" TO "authenticated";
GRANT ALL ON TABLE "public"."genomic_multi_locus_v" TO "service_role";



GRANT ALL ON TABLE "public"."genomic_single_locus" TO "anon";
GRANT ALL ON TABLE "public"."genomic_single_locus" TO "authenticated";
GRANT ALL ON TABLE "public"."genomic_single_locus" TO "service_role";



GRANT ALL ON SEQUENCE "public"."genomic_single_locus_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."genomic_single_locus_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."genomic_single_locus_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."genomic_single_locus_v" TO "anon";
GRANT ALL ON TABLE "public"."genomic_single_locus_v" TO "authenticated";
GRANT ALL ON TABLE "public"."genomic_single_locus_v" TO "service_role";



GRANT ALL ON SEQUENCE "public"."genomic_sites_reference_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."genomic_sites_reference_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."genomic_sites_reference_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."health_facility_coordinates" TO "anon";
GRANT ALL ON TABLE "public"."health_facility_coordinates" TO "authenticated";
GRANT ALL ON TABLE "public"."health_facility_coordinates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."health_facility_coordinates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."health_facility_coordinates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."health_facility_coordinates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."umsp_monthly_data" TO "anon";
GRANT ALL ON TABLE "public"."umsp_monthly_data" TO "authenticated";
GRANT ALL ON TABLE "public"."umsp_monthly_data" TO "service_role";



GRANT ALL ON SEQUENCE "public"."umsp_monthly_data_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."umsp_monthly_data_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."umsp_monthly_data_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."umsp_sites" TO "anon";
GRANT ALL ON TABLE "public"."umsp_sites" TO "authenticated";
GRANT ALL ON TABLE "public"."umsp_sites" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































