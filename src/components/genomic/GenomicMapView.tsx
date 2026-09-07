'use client';

import { useMemo } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  GenomicFilters,
  SingleLocusRow,
  MultiLocusRow,
  GenomicSite,
  CATEGORY_COLOR,
  HAPLOTYPE_CATEGORIES,
  SINGLE_SNP_COLORS,
  MUTANT_CODON_COLORS,
  RDYLBU_5,
} from '@/types/genomic';
import {
  PieSlice,
  buildAllSnpsPie,
  buildMultiLocusPie,
  buildSingleSnpPie,
  buildWildTypeMap,
  renderPieSvg,
} from '@/lib/utils/genomic';
import { GenomicLegend } from './GenomicLegend';

// Fix default icon paths (same pattern as MapContainer.tsx)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function pieIcon(slices: PieSlice[], size = 38): L.DivIcon {
  const svg = renderPieSvg(slices, size);
  return L.divIcon({
    className: 'genomic-pie-icon',
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface Props {
  filters: GenomicFilters;
  siteMeta: Map<string, GenomicSite>;
  slRows: SingleLocusRow[];
  mlRows: MultiLocusRow[];
}

export function GenomicMapView({ filters, siteMeta, slRows, mlRows }: Props) {
  // Resolve the year to draw per site: the latest year where that site has a row
  // that actually satisfies the current selection. Matching on gene+codon (not
  // just the gene) matters because the MIPs and Paragon panels assay different
  // codon sets — otherwise a site's newest year can win here and then produce no
  // pie, hiding the good data it does have for an earlier year.
  const yearBySite = useMemo(() => {
    const m = new Map<string, number>();
    if (filters.locusMode === 'SingleLocus') {
      for (const r of slRows) {
        if (r.gene_id !== filters.geneId) continue;
        if (filters.codon !== 'ALL' && r.codon !== filters.codon) continue;
        const prev = m.get(r.site) ?? -Infinity;
        if (r.year > prev) m.set(r.site, r.year);
      }
    } else {
      for (const r of mlRows) {
        const prev = m.get(r.site) ?? -Infinity;
        if (r.year > prev) m.set(r.site, r.year);
      }
    }
    return m;
  }, [filters.locusMode, filters.geneId, filters.codon, slRows, mlRows]);

  const inferredWt = useMemo(() => buildWildTypeMap(slRows), [slRows]);

  const { markers, missingCoords } = useMemo(() => {
    type Entry = { site: string; year: number; lat: number; lng: number; slices: PieSlice[] };
    const out: Entry[] = [];
    const missing = new Set<string>();

    for (const [site, year] of yearBySite) {
      const slAtSite =
        filters.locusMode === 'SingleLocus'
          ? slRows.filter((r) => r.site === site && r.year === year)
          : [];
      const mlAtSite =
        filters.locusMode === 'Multilocus'
          ? mlRows.filter((r) => r.site === site && r.year === year)
          : [];

      // Prefer the coordinates the view already carries on the row, falling back
      // to the sites reference. `== null` rather than a falsy test: latitude 0 is
      // a real place, and Uganda straddles the equator.
      const rowCoord =
        slAtSite.find((r) => r.latitude != null && r.longitude != null) ??
        mlAtSite.find((r) => r.latitude != null && r.longitude != null);
      const meta = siteMeta.get(site);
      const lat = rowCoord?.latitude ?? meta?.latitude;
      const lng = rowCoord?.longitude ?? meta?.longitude;
      if (lat == null || lng == null) {
        // Site has data but nowhere to draw it — surface this rather than
        // silently shrinking the map.
        missing.add(site);
        continue;
      }

      let slices: PieSlice[] = [];
      if (filters.locusMode === 'SingleLocus') {
        if (filters.codon === 'ALL') {
          slices = buildAllSnpsPie(slAtSite, filters.geneId, filters.metric, inferredWt);
        } else {
          slices = buildSingleSnpPie(
            slAtSite, filters.geneId, filters.codon, filters.metric, inferredWt
          );
        }
      } else {
        slices = buildMultiLocusPie(mlAtSite, filters.metric);
      }

      if (slices.length === 0) continue;
      out.push({ site, year, lat, lng, slices });
    }
    return { markers: out, missingCoords: Array.from(missing).sort() };
  }, [filters, yearBySite, siteMeta, slRows, mlRows, inferredWt]);

  // Build a legend that reflects the current view.
  const legendSlices: PieSlice[] = useMemo(() => {
    if (filters.locusMode === 'Multilocus') {
      return HAPLOTYPE_CATEGORIES.map((c) => ({
        label: c, value: 1, color: CATEGORY_COLOR[c],
      }));
    }
    if (filters.codon === 'ALL') {
      // Wild-type + observed mutant codons across all markers (take a set from markers)
      const codons = new Set<string>();
      for (const m of markers) {
        for (const s of m.slices) if (s.label !== 'Wild-type') codons.add(s.label);
      }
      const sorted = Array.from(codons).sort((a, b) => Number(a) - Number(b));
      return [
        { label: 'Wild-type', value: 1, color: RDYLBU_5.darkBlue },
        ...sorted.map((label, i) => ({
          label,
          value: 1,
          color: MUTANT_CODON_COLORS[i % MUTANT_CODON_COLORS.length],
        })),
      ];
    }
    return [
      { label: 'Wild-type', value: 1, color: SINGLE_SNP_COLORS.wildtype },
      { label: 'Mutant',    value: 1, color: SINGLE_SNP_COLORS.mutant },
    ];
  }, [filters.locusMode, filters.codon, markers]);

  const metricLabel = filters.metric === 'prev' ? 'Prevalence' : 'Frequency';
  const yearLabel =
    filters.mapYear === 'RECENT' ? 'most recent year per site' : String(filters.mapYear);
  const subject =
    filters.locusMode === 'Multilocus'
      ? 'dhfr/dhps categories'
      : filters.codon === 'ALL'
      ? 'All SNPs'
      : `Codon ${filters.codon}`;
  const title = `${subject} — ${metricLabel} — ${yearLabel}`;

  const missingNotice = missingCoords.length > 0 && (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
      <span className="font-semibold">
        {missingCoords.length} {missingCoords.length === 1 ? 'site has' : 'sites have'} data but
        no coordinates
      </span>{' '}
      and cannot be drawn: {missingCoords.join(', ')}. Add them to the site reference
      (<code>genomic_sites_reference</code>) — for Paragon rows, check that{' '}
      <code>paragon_key</code> matches the site key.
    </div>
  );

  if (markers.length === 0) {
    return (
      <div className="space-y-3">
        {missingNotice}
        <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-border/60 px-6 text-center text-muted-foreground">
          {missingCoords.length > 0
            ? 'Every site matching these filters is missing coordinates — see the note above.'
            : filters.mapYear === 'RECENT'
            ? 'No genomic data available for the current filters.'
            : `No genomic data for ${filters.mapYear} at the selected sites. Try another year, or "Most recent".`}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {missingNotice}
      <GenomicLegend slices={legendSlices} title={title} />
      <div className="h-[600px] w-full overflow-hidden rounded-lg border">
        <LeafletMap
          center={[1.3733, 32.2903]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((m) => (
            <Marker key={m.site} position={[m.lat, m.lng]} icon={pieIcon(m.slices)}>
              <Tooltip direction="top" offset={[0, -20]}>
                <div className="text-xs">
                  <div className="font-semibold">{m.site}</div>
                  <div className="mb-1 text-muted-foreground">{m.year}</div>
                  {m.slices.map((s) => {
                    const total = m.slices.reduce((sum, x) => sum + x.value, 0);
                    const pct = total > 0 ? (s.value / total) * 100 : 0;
                    return (
                      <div key={s.label} className="flex items-center gap-1">
                        <span
                          className="inline-block h-2 w-2 rounded-sm"
                          style={{ background: s.color }}
                        />
                        <span>{s.label}: {pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </Tooltip>
            </Marker>
          ))}
        </LeafletMap>
      </div>
    </div>
  );
}
