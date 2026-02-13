import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  umsp_monthly_data: {
    'Site': 'site',
    'Region': 'region',
    'district': 'district',
    'monthyear': 'monthyear',
    'quarter': 'quarter',
    'year': 'year',
    'malaria_incidence_per_1000_PY': 'malaria_incidence_per_1000_py',
    'TPR_cases_all': 'tpr_cases_all',
    'TPR_cases_per_CA': 'tpr_cases_per_ca',
    'visits': 'visits',
    'malariasuspected': 'malariasuspected',
    'propsuspected_per_total_visits': 'propsuspected_per_total_visits',
    'proptested': 'proptested',
    'prop_visit_CA': 'prop_visit_ca',
  },
  health_facility_coordinates: {
    'Health Facility': 'site',
    'NEWsiteID': 'new_site_id',
    'District': 'district',
    'Latitude': 'latitude',
    'Longitude': 'longitude',
  },
  active_sites: {
    'site': 'site',
  },
};

function mapRow(row: Record<string, string>, table: string): Record<string, unknown> {
  const mapping = COLUMN_MAPPINGS[table] ?? {};
  const mapped: Record<string, unknown> = {};

  for (const [csvCol, value] of Object.entries(row)) {
    const dbCol = mapping[csvCol] ?? csvCol.toLowerCase();
    if (value === '' || value === undefined) {
      mapped[dbCol] = null;
    } else if (['year', 'visits', 'malariasuspected', 'new_site_id'].includes(dbCol)) {
      mapped[dbCol] = parseInt(value, 10);
    } else if ([
      'malaria_incidence_per_1000_py', 'tpr_cases_all', 'tpr_cases_per_ca',
      'propsuspected_per_total_visits', 'proptested', 'prop_visit_ca',
      'latitude', 'longitude',
    ].includes(dbCol)) {
      mapped[dbCol] = parseFloat(value);
    } else {
      mapped[dbCol] = value;
    }
  }

  return mapped;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Verify admin auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, mode, rows } = await request.json();

    if (!['umsp_monthly_data', 'health_facility_coordinates', 'active_sites'].includes(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    // Map rows
    const mappedRows = (rows as Record<string, string>[])
      .filter((row) => Object.values(row).some((v) => v !== ''))
      .map((row) => mapRow(row, table));

    if (mappedRows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found' }, { status: 400 });
    }

    // If replace mode, delete all existing data
    if (mode === 'replace') {
      const { error: deleteError } = await supabase.from(table).delete().gte('id', 0);
      if (deleteError) throw deleteError;
    }

    // Insert in chunks of 500
    let inserted = 0;
    const chunkSize = 500;
    for (let i = 0; i < mappedRows.length; i += chunkSize) {
      const chunk = mappedRows.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).upsert(chunk, {
        onConflict: table === 'umsp_monthly_data' ? 'site,monthyear'
          : table === 'health_facility_coordinates' ? 'site'
          : 'site',
      });
      if (error) throw error;
      inserted += chunk.length;
    }

    return NextResponse.json({ success: true, inserted });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
