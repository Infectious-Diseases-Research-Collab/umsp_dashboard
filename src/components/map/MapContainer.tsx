'use client';

import { useMemo } from 'react';
import { MapContainer as LeafletMap, TileLayer, CircleMarker, Popup, Marker, Polyline, GeoJSON } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OverlayType, IndicatorLabel, AggMethod, INDICATOR_DB_COLUMNS } from '@/types/indicators';
import { MapDataRow } from '@/lib/queries/map-data';
import { aggregateByMetric, groupBy } from '@/lib/utils/aggregation';
import { interpolateColor, YLOR_RD, RD_YL_BU } from '@/lib/utils/color-palette';
import { calculateTrend } from '@/lib/utils/trend-calculation';
import { MapLegend } from './MapLegend';
import { formatNumber } from '@/lib/utils/format';
import { UmspMonthlyData } from '@/types/database';

// Fix default marker icon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TILE_URLS: Record<string, string> = {
  'OpenStreetMap.Mapnik': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'Esri.WorldImagery': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  'OpenTopoMap': 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  'CartoDB.Positron': 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  'CartoDB.DarkMatter': 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

interface SiteAgg {
  site: string;
  region: string;
  district: string;
  latitude: number;
  longitude: number;
  value: number;
  count: number;
}

interface Props {
  data: MapDataRow[];
  overlayType: OverlayType;
  metric: IndicatorLabel;
  aggMethod: AggMethod;
  basemap: string;
  trendMonths: number;
  heatmapRadius: number;
  heatmapBlur: number;
  ugandaGeoJson?: GeoJSON.FeatureCollection;
}

export function MapContainerComponent({
  data,
  overlayType,
  metric,
  aggMethod,
  basemap,
  trendMonths,
  ugandaGeoJson,
}: Props) {
  // Aggregate data by site
  const siteAggregated = useMemo((): SiteAgg[] => {
    const bySite = groupBy(data, (r) => r.site);
    return Object.entries(bySite).map(([site, rows]) => {
      const value = aggregateByMetric(rows as UmspMonthlyData[], metric, aggMethod);
      return {
        site,
        region: rows[0].region,
        district: rows[0].district,
        latitude: rows[0].latitude,
        longitude: rows[0].longitude,
        value: value ?? 0,
        count: rows.length,
      };
    }).filter((s) => s.value != null && isFinite(s.value));
  }, [data, metric, aggMethod]);

  const minVal = useMemo(() => Math.min(...siteAggregated.map((s) => s.value)), [siteAggregated]);
  const maxVal = useMemo(() => Math.max(...siteAggregated.map((s) => s.value)), [siteAggregated]);

  const tileUrl = TILE_URLS[basemap] || TILE_URLS['OpenStreetMap.Mapnik'];

  // Trend data for trends overlay
  const trendData = useMemo(() => {
    if (overlayType !== 'trends') return [];
    const col = INDICATOR_DB_COLUMNS[metric];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - trendMonths);

    const bySite = groupBy(data, (r) => r.site);
    return Object.entries(bySite).map(([site, rows]) => {
      const recentRows = rows
        .filter((r) => new Date(r.monthyear) >= cutoff)
        .sort((a, b) => new Date(a.monthyear).getTime() - new Date(b.monthyear).getTime());

      if (recentRows.length < 2) return null;
      const dates = recentRows.map((r) => new Date(r.monthyear));
      const values = recentRows.map((r) => (r[col] as number) ?? 0);
      const trend = calculateTrend(dates, values);
      if (!trend) return null;

      return {
        site,
        latitude: rows[0].latitude,
        longitude: rows[0].longitude,
        region: rows[0].region,
        slope: trend.slope,
        direction: trend.direction,
        arrow: trend.arrow,
      };
    }).filter(Boolean) as { site: string; latitude: number; longitude: number; region: string; slope: number; direction: string; arrow: string }[];
  }, [data, overlayType, metric, trendMonths]);

  const trendMinSlope = trendData.length ? Math.min(...trendData.map((t) => t.slope)) : 0;
  const trendMaxSlope = trendData.length ? Math.max(...trendData.map((t) => t.slope)) : 0;

  const renderPopup = (s: SiteAgg) => (
    <Popup>
      <div className="text-sm">
        <p className="font-bold text-[#26A69A]">{s.site}</p>
        <p>Region: {s.region}</p>
        <p>District: {s.district}</p>
        <p>{metric}: <strong>{formatNumber(s.value, 2)}</strong></p>
        <p>Data points: {s.count}</p>
      </div>
    </Popup>
  );

  return (
    <div className="relative rounded-lg overflow-hidden border">
      <LeafletMap center={[1.5, 32.5]} zoom={7} style={{ height: 650, width: '100%' }}>
        <TileLayer url={tileUrl} />

        {/* Uganda boundary */}
        {ugandaGeoJson && (
          <GeoJSON
            data={ugandaGeoJson}
            style={{ fillColor: 'transparent', color: '#666666', weight: 2, fillOpacity: 0.1 }}
          />
        )}

        {/* Circle Markers */}
        {overlayType === 'circles' && siteAggregated.map((s) => {
          const radius = maxVal === minVal ? 8 : 5 + 15 * ((s.value - minVal) / (maxVal - minVal));
          const color = interpolateColor(s.value, minVal, maxVal, YLOR_RD);
          return (
            <CircleMarker
              key={s.site}
              center={[s.latitude, s.longitude]}
              radius={radius}
              pathOptions={{ fillColor: color, color: '#333', weight: 1, fillOpacity: 0.8 }}
            >
              {renderPopup(s)}
            </CircleMarker>
          );
        })}

        {/* Heatmap - simplified as weighted circle markers since leaflet.heat requires special handling */}
        {overlayType === 'heatmap' && siteAggregated.map((s) => {
          const intensity = maxVal === minVal ? 0.5 : (s.value - minVal) / (maxVal - minVal);
          return (
            <CircleMarker
              key={s.site}
              center={[s.latitude, s.longitude]}
              radius={20 + intensity * 30}
              pathOptions={{
                fillColor: interpolateColor(s.value, minVal, maxVal, YLOR_RD),
                color: 'transparent',
                fillOpacity: 0.4 + intensity * 0.4,
              }}
            >
              {renderPopup(s)}
            </CircleMarker>
          );
        })}

        {/* Clustering */}
        {overlayType === 'cluster' && (
          <MarkerClusterGroup>
            {siteAggregated.map((s) => (
              <Marker key={s.site} position={[s.latitude, s.longitude]}>
                <Popup>
                  <p className="font-bold">{s.site}</p>
                  <p>{metric}: {formatNumber(s.value, 2)}</p>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}

        {/* Choropleth - as regional circle markers (full choropleth requires matching GeoJSON regions) */}
        {overlayType === 'choropleth' && (() => {
          const byRegion = groupBy(siteAggregated, (s) => s.region);
          const regionalData = Object.entries(byRegion).map(([region, sites]) => {
            const avgVal = sites.reduce((s, site) => s + site.value, 0) / sites.length;
            const avgLat = sites.reduce((s, site) => s + site.latitude, 0) / sites.length;
            const avgLng = sites.reduce((s, site) => s + site.longitude, 0) / sites.length;
            return { region, value: avgVal, lat: avgLat, lng: avgLng, count: sites.length };
          });
          const rMin = Math.min(...regionalData.map((r) => r.value));
          const rMax = Math.max(...regionalData.map((r) => r.value));
          return regionalData.map((r) => (
            <CircleMarker
              key={r.region}
              center={[r.lat, r.lng]}
              radius={20 + ((r.value - rMin) / (rMax - rMin || 1)) * 30}
              pathOptions={{
                fillColor: interpolateColor(r.value, rMin, rMax, YLOR_RD),
                color: '#333',
                weight: 2,
                fillOpacity: 0.7,
              }}
            >
              <Popup>
                <p className="font-bold text-[#26A69A]">{r.region}</p>
                <p>Average {metric}: {formatNumber(r.value, 2)}</p>
                <p>Sites: {r.count}</p>
              </Popup>
            </CircleMarker>
          ));
        })()}

        {/* Trends */}
        {overlayType === 'trends' && trendData.map((t) => {
          const color = interpolateColor(t.slope, trendMinSlope, trendMaxSlope, [...RD_YL_BU].reverse());
          return (
            <CircleMarker
              key={t.site}
              center={[t.latitude, t.longitude]}
              radius={8}
              pathOptions={{ fillColor: color, color: '#333', weight: 1, fillOpacity: 0.8 }}
            >
              <Popup>
                <p className="font-bold text-[#26A69A]">{t.site}</p>
                <p>Region: {t.region}</p>
                <p>Trend: {t.arrow} {t.direction}</p>
                <p>Slope: {t.slope.toFixed(3)}</p>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Flows */}
        {overlayType === 'flows' && (() => {
          const top20 = siteAggregated.slice(0, 20);
          const maxFlow = Math.max(...top20.map((s) => s.value));
          return (
            <>
              {top20.map((s) => {
                const strength = maxFlow > 0 ? (s.value / maxFlow) * 100 : 50;
                return (
                  <CircleMarker
                    key={s.site}
                    center={[s.latitude, s.longitude]}
                    radius={Math.sqrt(strength)}
                    pathOptions={{ fillColor: '#26A69A', color: '#333', weight: 1, fillOpacity: 0.8 }}
                  >
                    {renderPopup(s)}
                  </CircleMarker>
                );
              })}
              {top20.slice(0, -1).map((s, i) => {
                const next = top20[i + 1];
                return (
                  <Polyline
                    key={`flow-${s.site}-${next.site}`}
                    positions={[[s.latitude, s.longitude], [next.latitude, next.longitude]]}
                    pathOptions={{ color: '#FF7043', weight: 2, opacity: 0.6 }}
                  />
                );
              })}
            </>
          );
        })()}
      </LeafletMap>

      {/* Legend */}
      {overlayType === 'circles' && siteAggregated.length > 0 && (
        <MapLegend title={metric} min={minVal} max={maxVal} type="ylOrRd" />
      )}
      {overlayType === 'trends' && trendData.length > 0 && (
        <MapLegend title="Trend Slope" min={trendMinSlope} max={trendMaxSlope} type="rdYlBu" />
      )}
    </div>
  );
}
