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
  genomic_sites_reference: {
    'site': 'site_id',
    'NEWsiteID': 'full_label',
    'Health facility': 'site_name',
    'Region': 'region',
    'District': 'district',
    'Latitude': 'latitude',
    'Longitude': 'longitude',
    'CollectionCode': 'collection_code',
    'paragon_key': 'paragon_key',
    'ParagonKey': 'paragon_key',
  },
  genomic_single_locus: {
    'population': 'population',
    'variant': 'variant',
    'prev': 'prev',
    'sample_count': 'sample_count',
    'sample_total': 'sample_total',
    'allele_total': 'allele_total',
    'allele_count': 'allele_count',
    'freq': 'freq',
  },
  genomic_multi_locus: {
    'population': 'population',
    'group_id': 'group_id',
    'variant': 'variant',
    'prev': 'prev',
    'sample_count': 'sample_count',
    'sample_total': 'sample_total',
    'allele_total': 'allele_total',
    'allele_count': 'allele_count',
    'freq': 'freq',
  },
};

const INT_COLUMNS = new Set([
  'year', 'visits', 'malariasuspected', 'new_site_id',
  'site_id', 'codon',
  'sample_count', 'sample_total', 'allele_count', 'allele_total',
]);
const FLOAT_COLUMNS = new Set([
  'malaria_incidence_per_1000_py', 'tpr_cases_all', 'tpr_cases_per_ca',
  'propsuspected_per_total_visits', 'proptested', 'prop_visit_ca',
  'latitude', 'longitude',
  'prev', 'freq',
]);

function splitPopulation(population: string): { site_key: string; year: number } | null {
  // "AG-2018", "Alebtong-2023", "Lira-Kato-2023" — split on the LAST "-"
  const idx = population.lastIndexOf('-');
  if (idx < 0) return null;
  const site_key = population.slice(0, idx).trim();
  const year = parseInt(population.slice(idx + 1), 10);
  if (!Number.isFinite(year)) return null;
  return { site_key, year };
}

function parseVariantSingleLocus(variant: string): { gene_id: string; codon: number; allele: string } | null {
  // e.g. "PF3D7_0709000.1:76:T"
  const parts = variant.split(':');
  if (parts.length < 3) return null;
  const codon = parseInt(parts[1], 10);
  if (!Number.isFinite(codon)) return null;
  return { gene_id: parts[0], codon, allele: parts[2] };
}

function mapRow(row: Record<string, string>, table: string, platform?: string): Record<string, unknown> {
  const mapping = COLUMN_MAPPINGS[table] ?? {};
  const mapped: Record<string, unknown> = {};

  for (const [csvCol, value] of Object.entries(row)) {
    const dbCol = mapping[csvCol] ?? csvCol.toLowerCase();
    if (value === '' || value === undefined || value === null) {
      mapped[dbCol] = null;
    } else if (INT_COLUMNS.has(dbCol)) {
      const n = parseInt(value, 10);
      mapped[dbCol] = Number.isFinite(n) ? n : null;
    } else if (FLOAT_COLUMNS.has(dbCol)) {
      const n = parseFloat(value);
      mapped[dbCol] = Number.isFinite(n) ? n : null;
    } else {
      mapped[dbCol] = value;
    }
  }

  // Derived fields for genomic tables
  if (table === 'genomic_single_locus' || table === 'genomic_multi_locus') {
    const pop = String(mapped.population ?? '');
    const split = splitPopulation(pop);
    if (split) {
      mapped.site_key = split.site_key;
      mapped.year = split.year;
    }
    mapped.platform = platform ?? 'paragon';
  }
  if (table === 'genomic_single_locus') {
    const parsed = parseVariantSingleLocus(String(mapped.variant ?? ''));
    if (parsed) {
      mapped.gene_id = parsed.gene_id;
      mapped.codon = parsed.codon;
      mapped.allele = parsed.allele;
    }
  }

  return mapped;
}

const CONFLICT_KEYS: Record<string, string> = {
  umsp_monthly_data: 'site,monthyear',
  health_facility_coordinates: 'site',
  active_sites: 'site',
  genomic_sites_reference: 'site_name',
  genomic_single_locus: 'platform,population,variant',
  genomic_multi_locus: 'platform,population,group_id,variant',
};

const ALLOWED_TABLES = Object.keys(CONFLICT_KEYS);

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { table, mode, rows, platform } = await request.json();

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const needsPlatform = table === 'genomic_single_locus' || table === 'genomic_multi_locus';
    if (needsPlatform && platform !== 'mips' && platform !== 'paragon') {
      return NextResponse.json({ error: 'Platform (mips|paragon) required' }, { status: 400 });
    }

    const mappedRows = (rows as Record<string, string>[])
      .filter((row) => Object.values(row).some((v) => v !== ''))
      .map((row) => mapRow(row, table, platform));

    if (mappedRows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found' }, { status: 400 });
    }

    if (mode === 'replace') {
      const { error: deleteError } = await supabase.from(table).delete().gte('id', 0);
      if (deleteError) throw deleteError;
    }

    let inserted = 0;
    const chunkSize = 500;
    for (let i = 0; i < mappedRows.length; i += chunkSize) {
      const chunk = mappedRows.slice(i, i + chunkSize);
      const { error } = await supabase.from(table).upsert(chunk, {
        onConflict: CONFLICT_KEYS[table],
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
