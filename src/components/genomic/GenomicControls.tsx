'use client';

import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/shared/MultiSelect';
import {
  GenomicFilters,
  GenomicView,
  LocusMode,
  GenomicMetric,
  GENES,
  GENE_BY_ID,
  DHFR_DHPS_GROUP_ID,
  MIPS_YEARS,
  PARAGON_YEARS,
} from '@/types/genomic';

interface Props {
  filters: GenomicFilters;
  onChange: (next: GenomicFilters) => void;
  sites: string[];
  yearMin: number;
  yearMax: number;
  /** Raw per-row data is admin-only; hides the Tabular Data view for everyone else. */
  isAdmin: boolean;
}

export function GenomicControls({
  filters,
  onChange,
  sites,
  yearMin,
  yearMax,
  isAdmin,
}: Props) {
  const set = <K extends keyof GenomicFilters>(key: K, value: GenomicFilters[K]) =>
    onChange({ ...filters, [key]: value });

  const gene = GENE_BY_ID[filters.geneId];

  const allowsAllSnps = filters.view === 'Map';

  // The year window actually in force: Map view is driven by its own single-year
  // selection ('RECENT' spans everything), other views by the start/end range.
  const effectiveYears = useMemo<[number, number]>(
    () =>
      filters.view === 'Map'
        ? filters.mapYear === 'RECENT'
          ? [yearMin, yearMax]
          : [filters.mapYear, filters.mapYear]
        : filters.yearRange,
    [filters.view, filters.mapYear, filters.yearRange, yearMin, yearMax]
  );

  // Codon list, filtered by year-range × platform availability.
  const availableCodons = useMemo(() => {
    if (!gene) return [] as number[];
    const [y0, y1] = effectiveYears;
    const intersectsMips    = y1 >= MIPS_YEARS[0] && y0 <= MIPS_YEARS[1];
    const intersectsParagon = y1 >= PARAGON_YEARS[0];
    return gene.codons.filter((c) => {
      if (gene.mipsOnlyCodons?.includes(c))    return intersectsMips;
      if (gene.paragonOnlyCodons?.includes(c)) return intersectsParagon;
      return true;
    });
  }, [gene, effectiveYears]);

  // If the currently-selected codon is disabled by platform/year, drop it.
  const codonValue: string =
    filters.codon === 'ALL'
      ? 'ALL'
      : availableCodons.includes(filters.codon)
      ? String(filters.codon)
      : '';

  const yearList = Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMin + i);
  // Map view lists newest first, since that is what people reach for.
  const mapYearList = [...yearList].reverse();
  const mapYearValue = filters.mapYear === 'RECENT' ? 'RECENT' : String(filters.mapYear);

  return (
    <div className="space-y-4">
      {/* Row 1: View / Sites */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            View Type
          </Label>
          <Select value={filters.view} onValueChange={(v) => set('view', v as GenomicView)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Map">Map</SelectItem>
              <SelectItem value="Chart">Chart</SelectItem>
              {isAdmin && <SelectItem value="Table">Tabular Data</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Site(s)
          </Label>
          <MultiSelect
            options={sites}
            selected={filters.sites}
            onChange={(v) => set('sites', v)}
            placeholder="All Sites"
            maxItems={80}
          />
        </div>
      </div>

      {/* Row 2: Map picks a single data year; Chart and Table use a year range */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {filters.view === 'Map' ? (
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Data Year
            </Label>
            <Select
              value={mapYearValue}
              onValueChange={(v) => set('mapYear', v === 'RECENT' ? 'RECENT' : Number(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RECENT">Most recent</SelectItem>
                {mapYearList.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Start Year
              </Label>
              <Select
                value={String(filters.yearRange[0])}
                onValueChange={(v) => set('yearRange', [Number(v), filters.yearRange[1]])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearList.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                End Year
              </Label>
              <Select
                value={String(filters.yearRange[1])}
                onValueChange={(v) => set('yearRange', [filters.yearRange[0], Number(v)])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearList.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* Row 3: Locus mode / Gene or Haplotype / SNP or category */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Locus Mode
          </Label>
          <Select
            value={filters.locusMode}
            onValueChange={(v) => set('locusMode', v as LocusMode)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SingleLocus">Single Locus</SelectItem>
              <SelectItem value="Multilocus">Multilocus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filters.locusMode === 'SingleLocus' ? (
          <>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Gene
              </Label>
              <Select value={filters.geneId} onValueChange={(v) => set('geneId', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENES.map((g) => (
                    <SelectItem key={g.geneId} value={g.geneId}>{g.commonName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Codon
              </Label>
              <Select
                value={codonValue}
                onValueChange={(v) => set('codon', v === 'ALL' ? 'ALL' : Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="Select codon" /></SelectTrigger>
                <SelectContent>
                  {allowsAllSnps && <SelectItem value="ALL">All SNPs</SelectItem>}
                  {availableCodons.map((c) => (
                    <SelectItem key={c} value={String(c)}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="lg:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Haplotype Group
            </Label>
            <Select value={filters.haplotypeGroup} onValueChange={(v) => set('haplotypeGroup', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={DHFR_DHPS_GROUP_ID}>
                  dhfr / dhps (8 codons)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Metric
          </Label>
          <Select
            value={filters.metric}
            onValueChange={(v) => set('metric', v as GenomicMetric)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prev">Prevalence</SelectItem>
              <SelectItem value="freq">Frequency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
