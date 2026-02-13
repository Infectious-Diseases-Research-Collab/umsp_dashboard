export interface UmspMonthlyData {
  id: number;
  site: string;
  region: string;
  district: string;
  monthyear: string; // ISO date string
  quarter: string;
  year: number;
  malaria_incidence_per_1000_py: number | null;
  tpr_cases_all: number | null;
  tpr_cases_per_ca: number | null;
  visits: number | null;
  malariasuspected: number | null;
  propsuspected_per_total_visits: number | null;
  proptested: number | null;
  prop_visit_ca: number | null;
  created_at: string;
}

export interface HealthFacilityCoordinates {
  id: number;
  new_site_id: number;
  site: string;
  district: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface ActiveSite {
  id: number;
  site: string;
  created_at: string;
}

export interface RegionalSummary {
  region: string;
  site_count: number;
  avg_incidence: number;
  avg_tpr: number;
  total_visits: number;
}

export interface DataCompleteness {
  monthyear: string;
  completeness: number;
}
