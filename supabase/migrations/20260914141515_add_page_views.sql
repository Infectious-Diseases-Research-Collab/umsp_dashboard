-- page_views: one row per authenticated visit to /dashboard/* or /admin/*
CREATE TABLE public.page_views (
  id         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id    uuid                     NOT NULL,
  email      text                     NOT NULL,
  path       text                     NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.page_views ADD CONSTRAINT page_views_pkey PRIMARY KEY (id);
ALTER TABLE public.page_views ADD CONSTRAINT page_views_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_page_views_user_id ON public.page_views (user_id);
CREATE INDEX idx_page_views_created_at ON public.page_views (created_at DESC);

GRANT ALL ON public.page_views TO anon;
GRANT ALL ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;

-- Any authenticated user (admin or not) may record their own visits.
CREATE POLICY "Self insert page_views" ON public.page_views
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only admins can read the log.
CREATE POLICY "Admin read page_views" ON public.page_views
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- No UPDATE policy — rows are write-once. No DELETE policy either; truncation
-- is a manual admin/service_role operation (e.g. via the Supabase SQL editor),
-- not something the app needs to do.
