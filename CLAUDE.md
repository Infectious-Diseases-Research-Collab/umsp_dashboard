# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UMSP Malaria Surveillance Dashboard — a Next.js 14 (App Router) application backed by Supabase, visualizing malaria surveillance data for ~42 health facilities across regions in Gambia. Deployed on Vercel; no local database needed (connects directly to Supabase cloud).

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run lint     # ESLint (next lint) — run before committing
```

No test suite is configured. Before committing, run `npm run lint` and manually verify affected routes.

## Environment Variables

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

## Architecture

### Authentication & Authorization

`src/middleware.ts` guards all routes server-side:
- `/dashboard/*` and `/api/*` — require any authenticated user
- `/admin/*` (except `/admin/login`) and `/api/upload` — require `user.app_metadata.role === 'admin'`
- Admin role is set in Supabase SQL: `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'`

Supabase clients: `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server components/API routes).

### Database Schema (3 tables)

- **`umsp_monthly_data`** — monthly surveillance records per site (`site`, `region`, `district`, `monthyear`, `year`, `quarter`, + 8 indicator columns). Upsert conflict key: `site,monthyear`.
- **`health_facility_coordinates`** — lat/lon per site (42 rows). Conflict key: `site`.
- **`active_sites`** — list of currently active sites (42 rows). Conflict key: `site`.

SQL artifacts (schema, indexes, RLS policies, functions) are in `supabase/`.

### Indicators

`src/types/indicators.ts` is the single source of truth for the 8 surveillance metrics. `INDICATOR_DB_COLUMNS` maps human-readable labels to DB column names. Always use `IndicatorLabel` type rather than raw strings.

### Data Fetching Pattern

Client components use `useSupabaseQuery<T>(queryFn, deps)` from `src/lib/hooks/use-supabase-query.ts`. Query functions live in `src/lib/queries/` and return typed data by calling the Supabase client directly.

### Dashboard Pages

| Route | Purpose |
|---|---|
| `/dashboard/overview` | KPI boxes, regional summary table, data quality chart |
| `/dashboard/map` | react-leaflet map with circles, heatmap, cluster, and trend overlays |
| `/dashboard/time-series` | Plotly line/bar charts with seasonal and trend analysis |
| `/dashboard/data-explorer` | TanStack Table for tabular data with column selection |
| `/dashboard/reports` | @react-pdf/renderer report config + preview; PDF served from `POST /api/report` |
| `/admin` | CSV uploader for all 3 tables; data sent to `POST /api/upload` |

### API Routes

- `POST /api/upload` — parses CSV rows client-side (PapaParse), maps column names, upserts to Supabase in 500-row chunks. Supports `replace` mode (deletes all rows first) or append.
- `POST /api/report` — fetches all data server-side, aggregates stats, renders PDF with `@react-pdf/renderer`.

### Conventions

- Components: `PascalCase.tsx`; hooks: `use-*.ts`; use `@/` path alias throughout.
- Styling: Tailwind CSS; base UI primitives are shadcn/ui components in `src/components/ui/`.
- Feature components are grouped by section: `src/components/map/`, `src/components/time-series/`, `src/components/overview/`, etc.
- Filter state types are in `src/types/filters.ts` (`MapFilters`, `TimeSeriesFilters`).
- Shared utilities: `src/lib/utils/` — aggregation, trend calculation, color palette, CSV export, number formatting.
