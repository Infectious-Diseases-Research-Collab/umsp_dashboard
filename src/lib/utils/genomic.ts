import type {
  SingleLocusRow,
  MultiLocusRow,
  HaplotypeCategory,
  GenomicMetric,
} from '@/types/genomic';
import {
  WT_ALLELES,
  DHFR_DHPS_CODONS,
  CATEGORY_COLOR,
  MUTANT_CODON_COLORS,
  SINGLE_SNP_COLORS,
  RDYLBU_5,
} from '@/types/genomic';

// ============================================================================
// Parse a variant string from the ML file into { gene, codon, allele } records.
//
// A haplotype may span several genes, one ";"-separated block per gene:
//   "PF3D7_0417200.1:51_59_108_164:I_R_N_I;PF3D7_0810800.1:437_540_581_613:G_E_A_A"
// Single-gene strings ("PF3D7_0709000.1:76:T") are just the one-block case.
// ============================================================================
export function parseHaplotypeVariant(
  variant: string
): { gene: string; codon: number; allele: string }[] {
  const out: { gene: string; codon: number; allele: string }[] = [];
  for (const block of variant.split(';')) {
    const [gene, codonPart, allelePart] = block.split(':');
    if (!gene || !codonPart || !allelePart) continue;
    const codons = codonPart.split('_');
    const alleles = allelePart.split('_');
    // A malformed block is skipped rather than discarding the whole haplotype;
    // classifyDhfrDhpsHaplotype still requires all 8 codons before it categorises.
    if (codons.length !== alleles.length) continue;
    for (let i = 0; i < codons.length; i++) {
      out.push({ gene, codon: Number(codons[i]), allele: alleles[i] });
    }
  }
  return out;
}

// ============================================================================
// For codons missing from WT_ALLELES, infer the wild-type allele as the most
// prevalent allele across all populations in the provided row set.
// ============================================================================
export function buildWildTypeMap(rows: SingleLocusRow[]): Record<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (r.sample_count == null) continue;
    const key = `${r.gene_id}:${r.codon}`;
    if (!counts.has(key)) counts.set(key, new Map());
    const m = counts.get(key)!;
    m.set(r.allele, (m.get(r.allele) ?? 0) + r.sample_count);
  }
  const wt: Record<string, string> = {};
  counts.forEach((m, key) => {
    let bestAllele = '';
    let bestCount = -1;
    m.forEach((count, allele) => {
      if (count > bestCount) {
        bestCount = count;
        bestAllele = allele;
      }
    });
    wt[key] = bestAllele;
  });
  return wt;
}

export function wildTypeAllele(
  geneId: string,
  codon: number,
  inferred: Record<string, string>
): string | undefined {
  const hard = WT_ALLELES[geneId]?.[codon];
  if (hard) return hard;
  return inferred[`${geneId}:${codon}`];
}

export function isWildType(
  geneId: string,
  codon: number,
  allele: string,
  inferred: Record<string, string>
): boolean {
  return wildTypeAllele(geneId, codon, inferred) === allele;
}

// ============================================================================
// DHFR/DHPS 8-codon haplotype → category classifier.
// Parses the variant string and counts non-reference alleles across the 8 codons.
// ============================================================================
export function classifyDhfrDhpsHaplotype(variant: string): HaplotypeCategory {
  const parts = parseHaplotypeVariant(variant);
  if (parts.length === 0) return 'Other';

  // Match codons by (gene, codon) → expected wild-type
  let mutantCount = 0;
  let matched = 0;
  for (const p of parts) {
    const ref = DHFR_DHPS_CODONS.find((d) => d.gene === p.gene && d.codon === p.codon);
    if (!ref) continue;
    matched += 1;
    if (p.allele !== ref.wt) mutantCount += 1;
  }
  // For haplotypes that combine dhfr + dhps in one row we expect all 8 codons.
  // Rows with only dhfr (4 codons) or only dhps (4 codons) are treated as 'Other'
  // since the spec collapses category at the 8-codon level.
  if (matched < 8) return 'Other';

  switch (mutantCount) {
    case 0: return 'Wildtype';
    case 4: return 'Quadruple';
    case 5: return 'Quintuple';
    case 6: return 'Sextuple';
    case 7: return 'Septuple';
    default: return 'Other';
  }
}

// ============================================================================
// Map pie slices
// ============================================================================
export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

// Single SNP (two-color): wild-type vs mutant at a specific codon
export function buildSingleSnpPie(
  rowsAtSite: SingleLocusRow[],
  geneId: string,
  codon: number,
  metric: GenomicMetric,
  inferredWt: Record<string, string>
): PieSlice[] {
  const alleleRows = rowsAtSite.filter((r) => r.gene_id === geneId && r.codon === codon);
  if (alleleRows.length === 0) return [];
  let wt = 0;
  let mut = 0;
  for (const r of alleleRows) {
    const v = r[metric] ?? 0;
    if (isWildType(r.gene_id, r.codon, r.allele, inferredWt)) wt += v;
    else mut += v;
  }
  const slices: PieSlice[] = [];
  if (wt > 0)  slices.push({ label: 'Wild-type', value: wt,  color: SINGLE_SNP_COLORS.wildtype });
  if (mut > 0) slices.push({ label: 'Mutant',    value: mut, color: SINGLE_SNP_COLORS.mutant });
  return slices;
}

// "All SNPs" pie: blue wild-type + one slice per mutant codon
export function buildAllSnpsPie(
  rowsAtSite: SingleLocusRow[],
  geneId: string,
  metric: GenomicMetric,
  inferredWt: Record<string, string>
): PieSlice[] {
  const geneRows = rowsAtSite.filter((r) => r.gene_id === geneId);
  if (geneRows.length === 0) return [];

  // Wild-type proportion = mean of WT prev/freq across codons where this site has data
  // Mutant slices = per-codon mutant prev/freq (summed across alleles)
  const codonMap = new Map<number, { wt: number; mut: number }>();
  for (const r of geneRows) {
    if (!codonMap.has(r.codon)) codonMap.set(r.codon, { wt: 0, mut: 0 });
    const entry = codonMap.get(r.codon)!;
    const v = r[metric] ?? 0;
    if (isWildType(r.gene_id, r.codon, r.allele, inferredWt)) entry.wt += v;
    else entry.mut += v;
  }

  const codons = Array.from(codonMap.keys()).sort((a, b) => a - b);
  const wtAvg =
    codons.reduce((s, c) => s + codonMap.get(c)!.wt, 0) / Math.max(codons.length, 1);

  const slices: PieSlice[] = [];
  if (wtAvg > 0) slices.push({ label: 'Wild-type', value: wtAvg, color: RDYLBU_5.darkBlue });
  codons.forEach((c, i) => {
    const mut = codonMap.get(c)!.mut;
    if (mut > 0) {
      slices.push({
        label: `${c}`,
        value: mut,
        color: MUTANT_CODON_COLORS[i % MUTANT_CODON_COLORS.length],
      });
    }
  });
  return slices;
}

// Multilocus pie: dhfr/dhps category proportions
export function buildMultiLocusPie(
  rowsAtSite: MultiLocusRow[],
  metric: GenomicMetric
): PieSlice[] {
  const byCategory = new Map<HaplotypeCategory, number>();
  for (const r of rowsAtSite) {
    const cat = classifyDhfrDhpsHaplotype(r.variant);
    const v = r[metric] ?? 0;
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + v);
  }
  const order: HaplotypeCategory[] = ['Wildtype', 'Quadruple', 'Quintuple', 'Sextuple', 'Septuple', 'Other'];
  return order
    .filter((cat) => (byCategory.get(cat) ?? 0) > 0)
    .map((cat) => ({
      label: cat,
      value: byCategory.get(cat)!,
      color: CATEGORY_COLOR[cat],
    }));
}

// ============================================================================
// SVG pie generator for Leaflet divIcon markers
// ============================================================================
export function renderPieSvg(slices: PieSlice[], size = 36): string {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return '';
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 1;
  let angle = -Math.PI / 2;
  const paths: string[] = [];

  if (slices.length === 1) {
    paths.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${slices[0].color}" stroke="#1f2937" stroke-width="0.5"/>`
    );
  } else {
    for (const s of slices) {
      const slice = (s.value / total) * Math.PI * 2;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      angle += slice;
      const x2 = cx + r * Math.cos(angle);
      const y2 = cy + r * Math.sin(angle);
      const large = slice > Math.PI ? 1 : 0;
      paths.push(
        `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${s.color}" stroke="#1f2937" stroke-width="0.5"/>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths.join('')}</svg>`;
}

// ============================================================================
// Chart helpers — build site×year value series for Plotly
// ============================================================================
export function siteYearSeries(
  rows: SingleLocusRow[],
  sites: string[],
  years: number[],
  metric: GenomicMetric,
  opts: { geneId: string; codon: number; inferredWt: Record<string, string> }
): Record<string, Array<number | null>> {
  const out: Record<string, Array<number | null>> = {};
  for (const site of sites) {
    out[site] = years.map((yr) => {
      const alleleRows = rows.filter(
        (r) => r.site === site && r.year === yr && r.gene_id === opts.geneId && r.codon === opts.codon
      );
      if (alleleRows.length === 0) return null;
      let mut = 0;
      for (const r of alleleRows) {
        if (!isWildType(r.gene_id, r.codon, r.allele, opts.inferredWt)) {
          mut += r[metric] ?? 0;
        }
      }
      return mut;
    });
  }
  return out;
}

export function multilocusCategorySeries(
  rows: MultiLocusRow[],
  sites: string[],
  years: number[],
  metric: GenomicMetric
): Record<HaplotypeCategory, Record<string, Array<number | null>>> {
  const categories: HaplotypeCategory[] = ['Wildtype', 'Quadruple', 'Quintuple', 'Sextuple', 'Septuple', 'Other'];
  const out = {} as Record<HaplotypeCategory, Record<string, Array<number | null>>>;
  for (const cat of categories) {
    out[cat] = {};
    for (const site of sites) {
      out[cat][site] = years.map((yr) => {
        const present = rows.some((r) => r.site === site && r.year === yr);
        if (!present) return null;
        const matching = rows.filter(
          (r) =>
            r.site === site &&
            r.year === yr &&
            classifyDhfrDhpsHaplotype(r.variant) === cat
        );
        return matching.reduce((s, r) => s + (r[metric] ?? 0), 0);
      });
    }
  }
  return out;
}
