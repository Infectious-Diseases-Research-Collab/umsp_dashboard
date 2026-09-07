// Types and reference constants for the Genomic Data dashboard.
// Reference data derived from the spec (instructions/reference/malaria_genomic_dashboard_spec_v1.docx).

export type GenomicPlatform = 'mips' | 'paragon';
export type LocusMode = 'SingleLocus' | 'Multilocus';
export type GenomicView = 'Map' | 'Chart' | 'Table';
export type GenomicMetric = 'prev' | 'freq';
// Map view year selection: a specific year, or 'RECENT' for the latest year
// available at each site (which may differ site to site).
export type MapYearSelection = number | 'RECENT';

export interface GenomicSite {
  site_name: string;
  full_label: string | null;
  region: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
  collection_code: string | null;
}

export interface SingleLocusRow {
  id: number;
  platform: GenomicPlatform;
  population: string;
  site_key: string;
  year: number;
  variant: string;
  gene_id: string;
  codon: number;
  allele: string;
  prev: number | null;
  sample_count: number | null;
  sample_total: number | null;
  allele_total: number | null;
  allele_count: number | null;
  freq: number | null;
  site: string;
  region: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface MultiLocusRow {
  id: number;
  platform: GenomicPlatform;
  population: string;
  site_key: string;
  year: number;
  group_id: string;
  variant: string;
  allele_count: number | null;
  sample_count: number | null;
  allele_total: number | null;
  sample_total: number | null;
  freq: number | null;
  prev: number | null;
  site: string;
  region: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface GenomicFilters {
  sites: string[];
  view: GenomicView;
  yearRange: [number, number];    // Chart + Table views
  mapYear: MapYearSelection;      // Map view — 'RECENT' = latest year per site
  locusMode: LocusMode;
  geneId: string;                 // SingleLocus — gene id
  codon: number | 'ALL';          // SingleLocus — codon, 'ALL' only allowed in Map view
  haplotypeGroup: string;         // Multilocus — currently only 'pfdhfr_pfdhps_octuple'
  metric: GenomicMetric;
}

// ============================================================================
// Gene catalog — 11 genes present across the SL dataset (observed gene_ids).
// Common names are best-effort from standard P. falciparum resistance literature;
// replace with an authoritative S1 reference CSV when available.
// ============================================================================
export interface GeneDef {
  geneId: string;      // PlasmoDB id as stored in `gene_id` (with ".1" suffix)
  commonName: string;
  codons: number[];
  mipsOnlyCodons?: number[];
  paragonOnlyCodons?: number[];
}

export const GENES: GeneDef[] = [
  { geneId: 'PF3D7_0417200.1', commonName: 'pfdhfr',    codons: [51, 59, 108, 164] },
  {
    geneId: 'PF3D7_0523000.1',
    commonName: 'pfmdr1',
    codons: [86, 184, 199, 995, 1031, 1042, 1246, 1272],
  },
  {
    geneId: 'PF3D7_0709000.1',
    commonName: 'pfcrt',
    codons: [72, 73, 74, 75, 76, 93, 97, 101, 141, 145, 218, 220, 271, 272, 326, 343, 350, 353, 356],
    mipsOnlyCodons: [218, 220, 271, 272, 326],
  },
  { geneId: 'PF3D7_0720700.1', commonName: 'pfubp1',   codons: [1484, 1502] },
  {
    geneId: 'PF3D7_0810800.1',
    commonName: 'pfdhps',
    codons: [436, 437, 454, 540, 562, 581, 613],
  },
  { geneId: 'PF3D7_1318100.1', commonName: 'PF3D7_1318100', codons: [193] },
  {
    geneId: 'PF3D7_1343700.1',
    commonName: 'pfkelch13',
    codons: [215, 217, 246, 255, 258, 263, 348, 441, 469, 490, 515, 538, 539, 553, 561, 568, 574, 578, 580, 596, 605, 610, 613, 622, 675],
  },
  {
    geneId: 'PF3D7_1362500.1',
    commonName: 'pfap2mu',
    codons: [415, 430],
    paragonOnlyCodons: [430],
  },
  {
    geneId: 'PF3D7_1408000.1',
    commonName: 'pfpm2',
    codons: [68, 367, 375, 388, 413, 415],
  },
  { geneId: 'PF3D7_1408100.1', commonName: 'pfpm3',    codons: [69] },
  { geneId: 'PF3D7_1447900.1', commonName: 'pfmdr2',   codons: [492] },
];

export const GENE_BY_ID: Record<string, GeneDef> = Object.fromEntries(GENES.map((g) => [g.geneId, g]));

// Year range where each platform has data
export const MIPS_YEARS: [number, number] = [2016, 2022];
export const PARAGON_YEARS: [number, number] = [2023, 2099];

// ============================================================================
// Wild-type (3D7 reference) allele per gene:codon for well-studied drug-
// resistance markers. Codons absent from this map fall back to a runtime
// "majority-allele across all populations" heuristic. Replace with S1 when
// the authoritative CSV is supplied.
// ============================================================================
export const WT_ALLELES: Record<string, Record<number, string>> = {
  'PF3D7_0417200.1': { 51: 'N', 59: 'C', 108: 'S', 164: 'I' }, // pfdhfr
  'PF3D7_0810800.1': { 436: 'S', 437: 'A', 540: 'K', 581: 'A', 613: 'A' }, // pfdhps
  'PF3D7_0709000.1': { // pfcrt
    72: 'C', 73: 'V', 74: 'M', 75: 'N', 76: 'K',
    93: 'T', 97: 'H', 101: 'C',
    218: 'I', 220: 'A', 271: 'Q', 272: 'N', 326: 'N',
    343: 'I', 350: 'R', 353: 'G', 356: 'I',
  },
  'PF3D7_0523000.1': { // pfmdr1
    86: 'N', 184: 'Y', 1034: 'S', 1042: 'N', 1246: 'D',
  },
};

// ============================================================================
// Multilocus — dhfr/dhps octuple (8 codons: dhfr 51/59/108/164 + dhps 437/540/581/613)
// ============================================================================
export const DHFR_DHPS_GROUP_ID = 'pfdhfr_pfdhps_octuple';
export const DHFR_DHPS_CODONS: { gene: string; codon: number; wt: string }[] = [
  { gene: 'PF3D7_0417200.1', codon: 51,  wt: 'N' },
  { gene: 'PF3D7_0417200.1', codon: 59,  wt: 'C' },
  { gene: 'PF3D7_0417200.1', codon: 108, wt: 'S' },
  { gene: 'PF3D7_0417200.1', codon: 164, wt: 'I' },
  { gene: 'PF3D7_0810800.1', codon: 437, wt: 'A' },
  { gene: 'PF3D7_0810800.1', codon: 540, wt: 'K' },
  { gene: 'PF3D7_0810800.1', codon: 581, wt: 'A' },
  { gene: 'PF3D7_0810800.1', codon: 613, wt: 'A' },
];

export type HaplotypeCategory = 'Wildtype' | 'Quadruple' | 'Quintuple' | 'Sextuple' | 'Septuple' | 'Other';

export const HAPLOTYPE_CATEGORIES: HaplotypeCategory[] = [
  'Wildtype', 'Quadruple', 'Quintuple', 'Sextuple', 'Septuple', 'Other',
];

// ============================================================================
// Colors (RdYlBu diverging palette from spec §7.1)
// ============================================================================
export const RDYLBU_5 = {
  darkBlue:  '#2c7bb6', // Wildtype / least resistant
  lightBlue: '#abd9e9', // Quadruple
  yellow:    '#fef0a0', // Quintuple
  orange:    '#fdae61', // Sextuple
  red:       '#d7191c', // Septuple / most resistant
};
export const OTHER_GRAY = '#969696';

export const CATEGORY_COLOR: Record<HaplotypeCategory, string> = {
  Wildtype:  RDYLBU_5.darkBlue,
  Quadruple: RDYLBU_5.lightBlue,
  Quintuple: RDYLBU_5.yellow,
  Sextuple:  RDYLBU_5.orange,
  Septuple:  RDYLBU_5.red,
  Other:     OTHER_GRAY,
};

// For "All SNPs" pies: wild-type blue + distinct per-codon colors
export const MUTANT_CODON_COLORS = [
  '#d7191c', '#fdae61', '#fef0a0', '#abd9e9',
  '#762a83', '#af8dc3', '#e7d4e8', '#1b7837',
  '#7fbc41', '#b8e186', '#c51b7d', '#de77ae',
];

export const SINGLE_SNP_COLORS = {
  wildtype: RDYLBU_5.darkBlue,
  mutant:   RDYLBU_5.red,
};
