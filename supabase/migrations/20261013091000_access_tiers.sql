-- Three access tiers, stored in auth.users.raw_app_meta_data.role (which users
-- cannot edit themselves, unlike user_metadata):
--   (absent) / 'standard'  charts and maps only — every self-signup starts here
--   'full'                 + tabular views, CSV downloads, PDF report
--   'admin'                + approving requests, managing users, uploads
--
-- Standard users ask for Full via public.access_requests; an admin decides with
-- review_access_request(). All role changes go through the SECURITY DEFINER
-- functions below, each of which refuses non-admins in its own body.
--
-- Note the database deliberately does not enforce the Standard/Full split on
-- the data tables: every chart already ships its rows to the browser, so that
-- split is a UI gate. See CLAUDE.md.

-- ----------------------------------------------------------------------------
-- access_requests
-- ----------------------------------------------------------------------------
CREATE TABLE public.access_requests (
  id           bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id      uuid                     NOT NULL,
  email        text                     NOT NULL,
  full_name    text                     NOT NULL,
  institution  text                     NOT NULL,
  reason       text                     NOT NULL,
  status       text                     DEFAULT 'pending' NOT NULL,
  admin_note   text,
  reviewed_by  uuid,
  reviewed_at  timestamp with time zone,
  created_at   timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT access_requests_pkey PRIMARY KEY (id),
  CONSTRAINT access_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT access_requests_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT access_requests_status_check
    CHECK (status IN ('pending', 'approved', 'denied')),
  CONSTRAINT access_requests_full_name_length
    CHECK (char_length(btrim(full_name)) BETWEEN 1 AND 200),
  CONSTRAINT access_requests_institution_length
    CHECK (char_length(btrim(institution)) BETWEEN 1 AND 200),
  CONSTRAINT access_requests_reason_length
    CHECK (char_length(btrim(reason)) BETWEEN 1 AND 2000),
  CONSTRAINT access_requests_admin_note_length
    CHECK (admin_note IS NULL OR char_length(admin_note) <= 2000)
);

-- At most one open request per user; the API maps the violation to a 409.
CREATE UNIQUE INDEX access_requests_one_pending_per_user
  ON public.access_requests (user_id) WHERE status = 'pending';
CREATE INDEX idx_access_requests_status_created_at
  ON public.access_requests (status, created_at DESC);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Users file their own requests. The email must be the one in their JWT, and
-- the review columns can't be pre-filled (column-level grant below as well).
CREATE POLICY "Self insert access_requests" ON public.access_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND email = (auth.jwt() ->> 'email')
    AND status = 'pending'
    AND admin_note IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

CREATE POLICY "Self read access_requests" ON public.access_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin read access_requests" ON public.access_requests
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- No UPDATE/DELETE policies: decisions are made only via
-- review_access_request(), which runs as the owner and bypasses RLS.

REVOKE ALL ON public.access_requests FROM anon;
REVOKE ALL ON public.access_requests FROM authenticated;
GRANT SELECT ON public.access_requests TO authenticated;
GRANT INSERT (user_id, email, full_name, institution, reason)
  ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;

-- page_views was created with GRANT ALL to anon; RLS already blocked it, but
-- bring it in line with the lockdown (nothing in public is granted to anon).
REVOKE ALL ON public.page_views FROM anon;

-- ----------------------------------------------------------------------------
-- review_access_request: approve or deny a pending request (admins only).
-- Approval sets role 'full'; an admin requester is never downgraded.
-- Returns the requester's details so the caller can email them the decision.
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.review_access_request(
  p_id bigint,
  p_approve boolean,
  p_note text DEFAULT NULL
)
  RETURNS TABLE (email text, full_name text, status text)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  req public.access_requests%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'review_access_request: admin role required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.access_requests r
     SET status      = CASE WHEN p_approve THEN 'approved' ELSE 'denied' END,
         admin_note  = NULLIF(btrim(p_note), ''),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   WHERE r.id = p_id
     AND r.status = 'pending'
  RETURNING r.* INTO req;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'review_access_request: request % not found or already reviewed', p_id
      USING ERRCODE = 'P0002';
  END IF;

  IF p_approve THEN
    UPDATE auth.users u
       SET raw_app_meta_data =
             COALESCE(u.raw_app_meta_data, '{}'::jsonb) || '{"role": "full"}'::jsonb
     WHERE u.id = req.user_id
       AND COALESCE(u.raw_app_meta_data ->> 'role', '') <> 'admin';
  END IF;

  RETURN QUERY SELECT req.email, req.full_name, req.status;
END;
$function$;

-- ----------------------------------------------------------------------------
-- admin_list_users: every account with its role and latest request status.
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.admin_list_users()
  RETURNS TABLE (
    id uuid,
    email text,
    role text,
    created_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    latest_request_status text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_list_users: admin role required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT u.id,
         u.email::text,
         COALESCE(u.raw_app_meta_data ->> 'role', 'standard'),
         u.created_at,
         u.last_sign_in_at,
         (SELECT r.status
            FROM public.access_requests r
           WHERE r.user_id = u.id
           ORDER BY r.created_at DESC
           LIMIT 1)
    FROM auth.users u
   ORDER BY u.created_at DESC;
END;
$function$;

-- ----------------------------------------------------------------------------
-- set_user_role: switch a non-admin between 'standard' and 'full'.
-- Admins are promoted/demoted by hand in SQL, never from the app.
-- ----------------------------------------------------------------------------
CREATE FUNCTION public.set_user_role(p_user_id uuid, p_role text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  current_role_name text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'set_user_role: admin role required'
      USING ERRCODE = '42501';
  END IF;

  IF p_role NOT IN ('standard', 'full') THEN
    RAISE EXCEPTION 'set_user_role: role must be standard or full';
  END IF;

  SELECT u.raw_app_meta_data ->> 'role' INTO current_role_name
    FROM auth.users u
   WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'set_user_role: user % not found', p_user_id
      USING ERRCODE = 'P0002';
  END IF;

  IF current_role_name = 'admin' THEN
    RAISE EXCEPTION 'set_user_role: cannot change an admin''s role from the app';
  END IF;

  UPDATE auth.users u
     SET raw_app_meta_data = CASE
           WHEN p_role = 'full'
             THEN COALESCE(u.raw_app_meta_data, '{}'::jsonb) || '{"role": "full"}'::jsonb
           ELSE COALESCE(u.raw_app_meta_data, '{}'::jsonb) - 'role'
         END
   WHERE u.id = p_user_id;
END;
$function$;

-- Default privileges grant every new routine to anon; undo that. Each function
-- also refuses non-admins in its body.
REVOKE ALL ON FUNCTION public.review_access_request(bigint, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_access_request(bigint, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated, service_role;
