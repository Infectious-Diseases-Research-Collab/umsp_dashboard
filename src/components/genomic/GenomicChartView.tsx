'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  GenomicFilters,
  SingleLocusRow,
  MultiLocusRow,
  HAPLOTYPE_CATEGORIES,
  CATEGORY_COLOR,
} from '@/types/genomic';
import {
  buildWildTypeMap,
  siteYearSeries,
  multilocusCategorySeries,
} from '@/lib/utils/genomic';
import { getColorsForGroups } from '@/lib/utils/color-palette';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface Props {
  filters: GenomicFilters;
  slRows: SingleLocusRow[];
  mlRows: MultiLocusRow[];
}

export function GenomicChartView({ filters, slRows, mlRows }: Props) {
  const [y0, y1] = filters.yearRange;
  const years = useMemo(
    () => Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i),
    [y0, y1]
  );
  const inferredWt = useMemo(() => buildWildTypeMap(slRows), [slRows]);

  const metricLabel = filters.metric === 'prev' ? 'Prevalence' : 'Frequency';

  // Determine which sites to plot
  const activeSites = useMemo(() => {
    if (filters.sites.length > 0) return filters.sites;
    const src = filters.locusMode === 'SingleLocus' ? slRows : mlRows;
    return Array.from(new Set(src.map((r) => r.site))).sort();
  }, [filters.sites, filters.locusMode, slRows, mlRows]);

  const siteColors = useMemo(() => getColorsForGroups(activeSites), [activeSites]);

  const categorySeries = useMemo(
    () =>
      filters.locusMode === 'Multilocus'
        ? multilocusCategorySeries(mlRows, activeSites, years, filters.metric)
        : null,
    [filters.locusMode, mlRows, activeSites, years, filters.metric]
  );

  // --- SINGLE LOCUS --------------------------------------------------------
  if (filters.locusMode === 'SingleLocus') {
    if (filters.codon === 'ALL') {
      return (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Chart view requires a specific codon — select one above.
        </div>
      );
    }
    const series = siteYearSeries(slRows, activeSites, years, filters.metric, {
      geneId: filters.geneId,
      codon: filters.codon,
      inferredWt,
    });

    const traces = activeSites.map((site) => ({
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      x: years,
      y: series[site],
      name: site,
      line: { color: siteColors[site], width: 2 },
      marker: { size: 6 },
      connectgaps: false,
    }));

    if (traces.every((t) => (t.y as (number | null)[]).every((v) => v == null))) {
      return (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          No data for this gene/codon across the selected sites and years.
        </div>
      );
    }

    return (
      <Plot
        data={traces}
        layout={{
          height: 520,
          margin: { l: 60, r: 20, t: 30, b: 60 },
          xaxis: { title: 'Year', dtick: 1 },
          yaxis: { title: `Mutant ${metricLabel}`, range: [0, 1] },
          legend: { orientation: 'h', y: -0.2 },
        }}
        config={{ responsive: true, displaylogo: false }}
        style={{ width: '100%' }}
      />
    );
  }

  // --- MULTILOCUS: faceted subplots (one row per category) ------------------
  if (!categorySeries) return null;
  const nCats = HAPLOTYPE_CATEGORIES.length;
  const traces: Record<string, unknown>[] = [];
  HAPLOTYPE_CATEGORIES.forEach((cat, ci) => {
    activeSites.forEach((site) => {
      traces.push({
        type: 'scatter',
        mode: 'lines+markers',
        x: years,
        y: categorySeries[cat][site],
        name: site,
        legendgroup: site,
        showlegend: ci === 0,
        line: { color: siteColors[site], width: 2 },
        marker: { size: 5 },
        xaxis: `x${ci + 1}`,
        yaxis: `y${ci + 1}`,
        connectgaps: false,
      });
    });
  });

  const subplotHeight = 120;
  const totalHeight = subplotHeight * nCats + 160;
  const gap = 0.04;
  const panel = (1 - gap * (nCats - 1)) / nCats;
  const layout: Record<string, unknown> = {
    height: totalHeight,
    margin: { l: 70, r: 20, t: 30, b: 60 },
    legend: { orientation: 'h', y: -0.12 },
    grid: { rows: nCats, columns: 1, pattern: 'independent' },
  };
  HAPLOTYPE_CATEGORIES.forEach((cat, ci) => {
    const yStart = 1 - (ci + 1) * panel - ci * gap;
    const yEnd   = 1 - ci * panel - ci * gap;
    layout[`xaxis${ci + 1}`] = {
      anchor: `y${ci + 1}`,
      dtick: 1,
      title: ci === nCats - 1 ? 'Year' : '',
    };
    layout[`yaxis${ci + 1}`] = {
      anchor: `x${ci + 1}`,
      domain: [yStart, yEnd],
      range: [0, 1],
      title: `${cat}`,
      titlefont: { size: 11, color: CATEGORY_COLOR[cat] },
    };
  });

  return (
    <Plot
      data={traces}
      layout={layout}
      config={{ responsive: true, displaylogo: false }}
      style={{ width: '100%' }}
    />
  );
}
