import { createClient } from '@/lib/supabase/client';
import { UmspMonthlyData } from '@/types/database';

export interface MapDataRow extends UmspMonthlyData {
  latitude: number;
  longitude: number;
}

const PAGE_SIZE = 1000;

export async function fetchMapData(params: {
  regions?: string[];
  sites?: string[];
  yearRange?: [number, number];
  dateRange?: [string, string];
  quarters?: string[];
  timeScale: string;
}): Promise<MapDataRow[]> {
  const supabase = createClient();

  // Fetch coordinates
  const coords: { site: string; latitude: number; longitude: number }[] = [];
  {
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('health_facility_coordinates')
        .select('site, latitude, longitude')
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = data ?? [];
      coords.push(...page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  const coordMap = new Map(coords.map((c) => [c.site, { lat: c.latitude, lng: c.longitude }]));

  // Build monthly data query with pagination
  const monthlyRows: UmspMonthlyData[] = [];
  let from = 0;
  while (true) {
    let query = supabase.from('umsp_monthly_data').select('*');

    if (params.regions && params.regions.length > 0) {
      query = query.in('region', params.regions);
    }
    if (params.sites && params.sites.length > 0) {
      query = query.in('site', params.sites);
    }

    if (params.timeScale === 'Annual' && params.yearRange) {
      query = query.gte('year', params.yearRange[0]).lte('year', params.yearRange[1]);
    } else if (params.timeScale === 'Monthly' && params.dateRange) {
      query = query.gte('monthyear', params.dateRange[0]).lte('monthyear', params.dateRange[1]);
    } else if (params.timeScale === 'Quarterly' && params.quarters && params.quarters.length > 0) {
      query = query.in('quarter', params.quarters);
    }

    const { data, error } = await query
      .order('monthyear', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const page = data ?? [];
    monthlyRows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return monthlyRows
    .map((row) => {
      const coord = coordMap.get(row.site);
      if (!coord) return null;
      return { ...row, latitude: coord.lat, longitude: coord.lng } as MapDataRow;
    })
    .filter((r): r is MapDataRow => r !== null);
}
