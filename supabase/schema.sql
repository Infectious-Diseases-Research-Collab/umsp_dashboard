-- Database schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main surveillance data (monthly uploads)
CREATE TABLE umsp_monthly_data (
  id                              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site                            TEXT NOT NULL,
  region                          TEXT NOT NULL,
  district                        TEXT NOT NULL,
  monthyear                       DATE NOT NULL,
  quarter                         TEXT NOT NULL,
  year                            SMALLINT NOT NULL,
  malaria_incidence_per_1000_py   DOUBLE PRECISION,
  tpr_cases_all                   DOUBLE PRECISION,
  tpr_cases_per_ca                DOUBLE PRECISION,
  visits                          INTEGER,
  malariasuspected                INTEGER,
  propsuspected_per_total_visits  DOUBLE PRECISION,
  proptested                      DOUBLE PRECISION,
  prop_visit_ca                   DOUBLE PRECISION,
  created_at                      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_site_monthyear UNIQUE (site, monthyear)
);

-- Health facility GPS coordinates
CREATE TABLE health_facility_coordinates (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  new_site_id INTEGER NOT NULL,
  site        TEXT NOT NULL UNIQUE,
  district    TEXT NOT NULL,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Currently active surveillance sites
CREATE TABLE active_sites (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mapping between active_sites IDs and umsp_monthly_data site labels
CREATE TABLE active_site_umsp_site_map (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  active_site_id BIGINT NOT NULL REFERENCES active_sites(id) ON DELETE CASCADE,
  umsp_site      TEXT NOT NULL,
  match_method   TEXT NOT NULL DEFAULT 'normalized_name',
  created_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_active_site_map_active_site_id UNIQUE (active_site_id),
  CONSTRAINT uq_active_site_map_umsp_site UNIQUE (umsp_site)
);
