import { createClient } from '@/lib/supabase/client';
import type {
  GenomicSite,
  SingleLocusRow,
  MultiLocusRow,
} from '@/types/genomic';

const PAGE_SIZE = 1000;

export async function fetchGenomicSites(): Promise<GenomicSite[]> {
  const supabase = createClient();
  const rows: GenomicSite[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('genomic_sites_reference')
      .select('site_name, full_label, region, district, latitude, longitude, collection_code')
      .order('site_name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as GenomicSite[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export async function fetchSingleLocusData(params: {
  sites?: string[];
  yearRange?: [number, number];
  geneId?: string;
  codon?: number;
}): Promise<SingleLocusRow[]> {
  const supabase = createClient();
  const rows: SingleLocusRow[] = [];
  let from = 0;
  while (true) {
    let q = supabase.from('genomic_single_locus_v').select('*');
    if (params.sites && params.sites.length > 0) q = q.in('site', params.sites);
    if (params.yearRange) q = q.gte('year', params.yearRange[0]).lte('year', params.yearRange[1]);
    if (params.geneId) q = q.eq('gene_id', params.geneId);
    if (params.codon != null) q = q.eq('codon', params.codon);
    // Paginating with .range() across separate requests needs a stable sort —
    // without one Postgres may return rows in a different order per page,
    // silently skipping or duplicating some.
    const { data, error } = await q
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as SingleLocusRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export async function fetchMultiLocusData(params: {
  sites?: string[];
  yearRange?: [number, number];
  groupId?: string;
}): Promise<MultiLocusRow[]> {
  const supabase = createClient();
  const rows: MultiLocusRow[] = [];
  let from = 0;
  while (true) {
    let q = supabase.from('genomic_multi_locus_v').select('*');
    if (params.sites && params.sites.length > 0) q = q.in('site', params.sites);
    if (params.yearRange) q = q.gte('year', params.yearRange[0]).lte('year', params.yearRange[1]);
    if (params.groupId) q = q.eq('group_id', params.groupId);
    // See the note in fetchSingleLocusData — stable sort required for paging.
    const { data, error } = await q
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as MultiLocusRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export async function fetchGenomicYearRange(): Promise<{ min: number; max: number } | null> {
  const supabase = createClient();
  const { data: minRow } = await supabase
    .from('genomic_single_locus_v')
    .select('year')
    .order('year', { ascending: true })
    .limit(1);
  const { data: maxRow } = await supabase
    .from('genomic_single_locus_v')
    .select('year')
    .order('year', { ascending: false })
    .limit(1);
  if (!minRow?.length || !maxRow?.length) return null;
  return { min: minRow[0].year as number, max: maxRow[0].year as number };
}
