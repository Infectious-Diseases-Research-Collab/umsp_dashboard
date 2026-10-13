# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UMSP Malaria Surveillance Dashboard — a Next.js 14 (App Router) application backed by Supabase, visualizing malaria surveillance data for ~42 health facilities across regions in Uganda. Deployed on Vercel; no local database needed (connects directly to Supabase cloud).

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
# Server-only. Used solely to look up admin email addresses for notifications.
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
# Access-request emails. Supabase's SMTP settings only serve Supabase Auth
# emails, so copy the same values from Supabase → Authentication → Emails → SMTP.
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=UMSP Dashboard <no-reply@example.org>
```
If `SMTP_HOST` is unset, emails are skipped (logged) and requests still work in-app.

## Architecture

### Authentication & Authorization

`src/middleware.ts` guards all routes server-side:
- `/dashboard/*` and `/api/*` — require any authenticated user
- `/admin/*` (except `/admin/login`), `/api/upload` and `/api/admin/*` — require `user.app_metadata.role === 'admin'`
- `/dashboard/reports` and `/api/report` — require Full access (`full` or `admin`)
- Admin role is set in Supabase SQL: `UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'`

Supabase clients: `src/lib/supabase/client.ts` (browser) and `src/lib/supabase/server.ts` (server components/API routes).

**Three access tiers**, stored in `auth.users.raw_app_meta_data.role` (`user.app_metadata.role`,
which users cannot edit). Helpers: `src/lib/auth/roles.ts` (`getRole`, `hasFullAccess`); in
dashboard client components use `useAccessLevel()` (context from `AccessLevelProvider` in the
dashboard layout).
- **Standard** (no role) — anyone can self-sign-up on `/login` (email confirmation on); charts
  and maps only.
- **Full** (`'full'`) — adds the tabular views, CSV downloads and `/dashboard/reports` (PDF).
- **Admin** (`'admin'`) — Full plus uploads, `/admin/access-requests` and `/admin/users`.

Standard users click "Request Full Access" in the header (`AccessStatus`), which posts to
`POST /api/access-requests`: the row is inserted under the user's own session (RLS) and all
admins are emailed (`src/lib/email/send.ts`, nodemailer). Admins approve/deny via
`POST /api/admin/access-requests/[id]/review`, which calls the `review_access_request()` SQL
function and emails the requester. `/admin/users` switches users between Standard and Full via
`set_user_role()`. All role changes go through those admin-checked SECURITY DEFINER functions;
the service-role key (`src/lib/supabase/admin.ts`) is only used to list admin emails.

The role is read from the session JWT, which refreshes roughly hourly. `AccessLevelProvider`
calls `refreshSession()` when it sees an approved request but a Standard token, so approvals
apply on the next page load; downgrades apply at the next natural refresh.

**The Standard/Full split is a UI gate, not a data barrier.** Both dashboards query Supabase
from the browser, so any signed-in user can read what their charts load via devtools, and RLS
gives every `authenticated` user `SELECT` on the data tables. This was an explicit decision (the
data is aggregated and publicly available). What *is* enforced server-side: no `anon` access to
any data (see `*_capture_lockdown_access.sql`), admin-only writes, and Full-only PDF reports.

### Database Schema

**Authority:** `supabase/migrations/` is the single source of truth for the database schema, managed via the Supabase CLI (project ref `wejircvuzfdjgiveergq`). The full column list, RLS policies, RLS status, and table privileges for every table in the `public` schema are captured there — always consult the migration files when reasoning about table structure, types, or access rules. The older `supabase/umsp-dashboard.json` snapshot and hand-written `.sql` files (`schema.sql`, `functions.sql`, `indexes.sql`, `rls-policies.sql`, `roles.sql`, `genomic_*.sql`) predate the migration setup, are stale, and have been moved to `supabase/archive/` for historical reference only — do not consult them for current schema state.

Schema changes going forward should be made as new migrations, not hand-run SQL in the Supabase dashboard:
```bash
supabase migration new <description>   # create a new migration file, then edit its SQL
supabase db push                       # apply pending local migrations to the linked project
supabase migration list                # confirm local/remote migration history match
```
`supabase db pull` requires Docker running locally (it spins up a shadow database to diff schemas).

Primary tables used by the dashboard:
- **`umsp_monthly_data`** — monthly surveillance records per site. Upsert conflict key: `site,monthyear`.
- **`health_facility_coordinates`** — lat/lon per site (42 rows). Conflict key: `site`.
- **`active_sites`** — list of currently active sites (42 rows). Conflict key: `site`.

Other tables present in the schema (not currently read by the dashboard app code, per the migration): `umsp_sites`, `active_site_umsp_site_map`, `genomic_sites_reference`, `genomic_single_locus`, `genomic_multi_locus`.

Access-control tables: **`access_requests`** (Full-access requests; at most one `pending` per user; users insert/read their own, admins read all, no direct updates) and **`page_views`** (visit log, admin-readable).

All tables have RLS enabled: `SELECT` requires `authenticated`; `INSERT`/`UPDATE`/`DELETE` require `is_admin()`. Nothing in `public` is granted to `anon`. Default privileges grant new functions to `anon`, so new functions must `REVOKE ... FROM PUBLIC, anon` explicitly.

### Indicators

`src/types/indicators.ts` is the single source of truth for the 8 surveillance metrics. `INDICATOR_DB_COLUMNS` maps human-readable labels to DB column names. Always use `IndicatorLabel` type rather than raw strings.

### Data Fetching Pattern

Client components use `useSupabaseQuery<T>(queryFn, deps)` from `src/lib/hooks/use-supabase-query.ts`. Query functions live in `src/lib/queries/` and return typed data by calling the Supabase client directly.

### Dashboard Pages

| Route | Purpose |
|---|---|
| `/dashboard` | Combined epi dashboard: Map / Chart / Tabular views in one page, with shared filters. Tabular and CSV download need Full access |
| `/dashboard/genomic-data` | Genomic dashboard: Map (pie markers) / Chart / Tabular views, single-locus and multilocus. Tabular and CSV download need Full access |
| `/dashboard/reports` | PDF report config + preview (Full access); PDF served from `POST /api/report` |
| `/dashboard/methods` | Malaria Indicators reference table with definitions |
| `/dashboard/site-summary` | Facility table plus the labelled site map image |
| `/dashboard/map-export` | Standalone Leaflet site map; live but absent from the nav |
| `/admin` | CSV uploader for all 3 tables; data sent to `POST /api/upload` |
| `/admin/access-requests` | Pending / reviewed Full-access requests with approve / deny |
| `/admin/users` | All accounts with role, latest request, sign-up and last sign-in; Standard ↔ Full switch |

### API Routes

- `POST /api/upload` — parses CSV rows client-side (PapaParse), maps column names, upserts to Supabase in 500-row chunks. Supports `replace` mode (deletes all rows first) or append.

- `POST /api/report` — Full access only; fetches all data server-side, aggregates stats, renders PDF with `@react-pdf/renderer`.
- `POST /api/access-requests` — any signed-in user; files a Full-access request and emails admins.
- `POST /api/admin/access-requests/[id]/review` — admin only; `{ approve, note }`, emails the requester.

### Conventions

- Components: `PascalCase.tsx`; hooks: `use-*.ts`; use `@/` path alias throughout.
- Styling: Tailwind CSS; base UI primitives are shadcn/ui components in `src/components/ui/`.
- Feature components are grouped by section: `src/components/map/`, `src/components/time-series/`, `src/components/overview/`, etc.
- Filter state types are in `src/types/filters.ts` (`MapFilters`, `TimeSeriesFilters`).
- Shared utilities: `src/lib/utils/` — aggregation, trend calculation, color palette, CSV export, number formatting.
