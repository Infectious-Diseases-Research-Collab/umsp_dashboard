'use client';

import Image from 'next/image';
import { useSupabaseQuery } from '@/lib/hooks/use-supabase-query';
import { fetchUmspSites, isActiveSite } from '@/lib/queries/umsp-sites';
import { formatDate } from '@/lib/utils/format';

export default function SiteSummaryPage() {
  const { data: sites, loading } = useSupabaseQuery(() => fetchUmspSites());

  const activeCount = (sites ?? []).filter(isActiveSite).length;
  const inactiveCount = (sites ?? []).filter((s) => !isActiveSite(s)).length;

  return (
    <div className="space-y-6">
      {/* Site location map */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">Map of Malaria Reference Centers</p>
        <Image
          src="/logo/site-map.png"
          alt="Map of Malaria Reference Centers"
          width={0}
          height={0}
          sizes="60vw"
          className="h-auto w-[60%] rounded-xl border border-border/70 shadow-sm"
        />
      </div>

      {!loading && sites && (
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span><strong className="text-foreground">{activeCount}</strong> active</span>
          <span><strong className="text-foreground">{inactiveCount}</strong> prior</span>
          <span><strong className="text-foreground">{sites.length}</strong> total</span>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading sites...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data From</th>
                <th className="px-4 py-3">Data To</th>
              </tr>
            </thead>
            <tbody>
              {(sites ?? []).map((s) => (
                <tr key={s.site_id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{s.site}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.district}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.region}</td>
                  <td className="px-4 py-2.5">
                    {isActiveSite(s) ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-slate-500/20">
                        Prior
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatDate(s.date_from)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {s.date_to ? formatDate(s.date_to) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
