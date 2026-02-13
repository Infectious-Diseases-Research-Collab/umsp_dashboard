# UMSP Malaria Surveillance Dashboard — Setup Guide

## Part 1: Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up or log in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `umsp-malaria-dashboard`
   - **Database Password**: Generate a strong one — **save it**
   - **Region**: Choose closest to your users
4. Click **"Create new project"** and wait ~2 minutes

### Step 2: Get Your API Credentials

1. Go to **Settings → API** in the left sidebar
2. Copy:
   - **Project URL** (e.g. `https://abcdefghij.supabase.co`)
   - **anon public** key (the long `eyJ...` string)
3. Open `umsp-dashboard/.env.local` and paste them in:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Step 3: Run the 4 SQL Scripts (in order)

Go to **SQL Editor** in the left sidebar. For each script below, click **"New query"**, paste the contents, and click **"Run"**:

1. **Schema** — paste contents of `umsp-dashboard/supabase/schema.sql` → Run
2. **Indexes** — paste contents of `umsp-dashboard/supabase/indexes.sql` → Run
3. **RLS Policies** — paste contents of `umsp-dashboard/supabase/rls-policies.sql` → Run
4. **Functions** — paste contents of `umsp-dashboard/supabase/functions.sql` → Run

You should see "Success" after each one.

### Step 4: Import CSV Data

For each of the 3 CSV files, use the **Table Editor** import:

#### 4a. Import `final_UMSP_dashboard_df.csv` → `umsp_monthly_data`

1. Go to **Table Editor** in the left sidebar
2. Click on the `umsp_monthly_data` table
3. Click **"Insert" → "Import data from CSV"**
4. Upload the file `final_UMSP_dashboard_df.csv`
5. **Column mapping** — the CSV headers need to be mapped to lowercase DB columns:

| CSV Column | DB Column |
|---|---|
| `Site` | `site` |
| `Region` | `region` |
| `district` | `district` |
| `monthyear` | `monthyear` |
| `quarter` | `quarter` |
| `year` | `year` |
| `malaria_incidence_per_1000_PY` | `malaria_incidence_per_1000_py` |
| `TPR_cases_all` | `tpr_cases_all` |
| `TPR_cases_per_CA` | `tpr_cases_per_ca` |
| `visits` | `visits` |
| `malariasuspected` | `malariasuspected` |
| `propsuspected_per_total_visits` | `propsuspected_per_total_visits` |
| `proptested` | `proptested` |
| `prop_visit_CA` | `prop_visit_ca` |

> **Note**: If Supabase's Table Editor doesn't support column renaming during import, you have two alternatives:
> - **Option A**: Edit the CSV file first — open it in a text editor and change the header row to match the DB column names exactly (all lowercase)
> - **Option B**: Use the app's built-in admin upload page (set up in Step 6 below) which handles column mapping automatically

6. Click **"Import"** — should import ~4,110 rows

#### 4b. Import `MRC_health_facility_coordinates_42_sites.csv` → `health_facility_coordinates`

1. Click on the `health_facility_coordinates` table
2. Click **"Insert" → "Import data from CSV"**
3. Upload `MRC_health_facility_coordinates_42_sites.csv`
4. Column mapping:

| CSV Column | DB Column |
|---|---|
| `NEWsiteID` | `new_site_id` |
| `Health Facility` | `site` |
| `District` | `district` |
| `Latitude` | `latitude` |
| `Longitude` | `longitude` |

5. Import — should be 42 rows

#### 4c. Import `List_of_Active_sites_42.csv` → `active_sites`

1. Click on the `active_sites` table
2. Click **"Insert" → "Import data from CSV"**
3. Upload `List_of_Active_sites_42.csv`
4. Column mapping: `site` → `site` (already matches)
5. Import — should be 42 rows

### Step 5: Enable Email Auth

1. Go to **Authentication → Providers** in the left sidebar
2. Make sure **Email** is enabled (it is by default)
3. Optionally disable "Confirm email" for simpler setup during development:
   - Go to **Authentication → Settings**
   - Under "Email Auth", toggle off **"Enable email confirmations"**

### Step 6: Create an Admin User

1. Go to **Authentication → Users**
2. Click **"Add user" → "Create new user"**
3. Enter your admin email and password
4. Click **"Create user"**
5. Now go to **SQL Editor** and run this (replace with your actual email):

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-admin@email.com';
```

This grants admin privileges so you can use the `/admin` upload page.

### Step 7: Verify

1. In **Table Editor**, click each table and verify row counts:
   - `umsp_monthly_data`: ~4,110 rows
   - `health_facility_coordinates`: 42 rows
   - `active_sites`: 42 rows
2. In **Authentication → Users**, verify your admin user exists

---

## Part 2: Local Development

### Step 1: Ensure `.env.local` Has Your Credentials

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...your-key...
```

### Step 2: Install Dependencies and Run

```bash
cd umsp-dashboard
npm install
npm run dev
```

### Step 3: Open in Browser

- **Landing page**: [http://localhost:3000](http://localhost:3000)
- **Dashboard**: [http://localhost:3000/dashboard/overview](http://localhost:3000/dashboard/overview)
- **Admin login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

The local dev server connects directly to your Supabase cloud database — there is no separate local database needed.

---

## Part 3: Vercel Deployment

### Step 1: Push Code to GitHub

Make sure the `umsp-dashboard` folder is pushed to a GitHub repository:

```bash
cd umsp-dashboard
git init
git add .
git commit -m "Initial UMSP dashboard"
gh repo create UMSP-Dashboard --private --source=. --push
```

Or add it to an existing repo and push.

### Step 2: Connect Vercel to GitHub

1. Go to [https://vercel.com](https://vercel.com) and sign up / log in (use "Continue with GitHub")
2. Click **"Add New..." → "Project"**
3. Find and select your GitHub repository
4. Vercel will auto-detect it as a Next.js project

### Step 3: Configure Build Settings

On the project configuration screen:

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: If your repo root contains the `umsp-dashboard` folder (not the Next.js files directly), click **"Edit"** next to Root Directory and set it to `umsp-dashboard`
- **Build Command**: `npm run build` (default, leave as-is)
- **Output Directory**: `.next` (default, leave as-is)

### Step 4: Set Environment Variables

Still on the configuration screen (or go to **Settings → Environment Variables** after creating):

Add these two variables:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...your-key...` |

Make sure both are set for **Production**, **Preview**, and **Development** environments.

### Step 5: Deploy

Click **"Deploy"** — Vercel will build and deploy your app. This takes 1-3 minutes.

When done, you'll get a URL like `https://umsp-dashboard-xyz.vercel.app`.

### Step 6: Configure Supabase for Your Vercel Domain

Back in Supabase, you need to allow your Vercel domain:

1. Go to **Authentication → URL Configuration**
2. Add your Vercel URL to the **Redirect URLs** list:
   - `https://your-app-name.vercel.app/**`
3. If you set up a custom domain later, add that too

### Step 7: (Optional) Custom Domain

1. In Vercel, go to **Settings → Domains**
2. Click **"Add"** and enter your domain (e.g. `malaria-dashboard.yourorg.com`)
3. Follow Vercel's DNS instructions (add a CNAME record pointing to `cname.vercel-dns.com`)
4. Remember to also add the custom domain to Supabase's Redirect URLs

---

## Quick Reference

| Action | Command / URL |
|---|---|
| Run locally | `cd umsp-dashboard && npm run dev` |
| Build locally | `cd umsp-dashboard && npm run build` |
| Admin login | `/admin/login` (use the email/password from Step 6 of Supabase setup) |
| Upload data (admin) | `/admin` after logging in |
| Trigger Vercel deploy | Push to GitHub (`git push`) — Vercel auto-deploys |
| Supabase dashboard | `https://supabase.com/dashboard/project/YOUR_PROJECT_ID` |
