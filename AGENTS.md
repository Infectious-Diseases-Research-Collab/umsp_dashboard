# Repository Guidelines

## Project Structure & Module Organization
- Application code lives in `src/` using Next.js App Router.
- Routes and pages are in `src/app/` (e.g., `src/app/login`, `src/app/dashboard/*`, `src/app/admin/*`).
- API route handlers are in `src/app/api/*`.
- Reusable UI and feature components are in `src/components/` (feature folders + `src/components/ui` for base primitives).
- Shared logic is in `src/lib/` (`supabase` clients, hooks, queries, utils) and shared types in `src/types/`.
- Database SQL artifacts are in `supabase/` (`schema.sql`, `rls-policies.sql`, `functions.sql`, `indexes.sql`).
- Static assets go in `public/`.

## Build, Test, and Development Commands
- `npm run dev`: start the local dev server.
- `npm run build`: create a production build.
- `npm run start`: run the production build locally.
- `npm run lint`: run ESLint (`next lint`) and fix issues before committing.

## Coding Style & Naming Conventions
- Language: TypeScript + React function components.
- Indentation: 2 spaces; prefer clear, small components.
- File naming:
  - Components: `PascalCase.tsx` (e.g., `Header.tsx`).
  - Hooks: `use-*.ts` or `use-*.tsx` (e.g., `use-admin-auth.ts`).
  - Route folders follow Next.js conventions (`page.tsx`, `layout.tsx`, `route.ts`).
- Use path alias imports via `@/` when possible.
- Styling uses Tailwind CSS; keep utility classes readable and grouped logically.

## Testing Guidelines
- No formal test suite is configured yet.
- Minimum requirement for changes: run `npm run lint` and manually verify impacted flows (login, dashboard pages, admin pages, API endpoints).
- When adding tests in future, colocate by feature and use `*.test.ts(x)` naming.

## Commit & Pull Request Guidelines
- Current history is minimal (`Initial Commit`), so use clear imperative commit messages going forward.
- Recommended format: `type(scope): summary` (example: `feat(auth): add signup mode toggle`).
- Keep commits focused and atomic.
- PRs should include:
  - What changed and why.
  - Screenshots/GIFs for UI changes.
  - Manual verification steps (commands run, routes tested).
  - Any Supabase schema/policy updates and migration notes.

## Security & Configuration Tips
- Never commit secrets. `.env*` files are ignored; keep a sanitized `.env.example` if needed.
- Validate auth changes against middleware and Supabase RLS policies in `supabase/rls-policies.sql`.
