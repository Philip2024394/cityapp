-- ============================================================================
-- 0065 — Private `ktp-images` storage bucket + folder-scoped RLS
-- ----------------------------------------------------------------------------
-- Before this migration KTPs were stored as user-pasted URLs pointing at
-- whatever public CDN the applicant chose (ImageKit, Drive, etc.). That
-- contradicted the privacy policy and violated UU PDP for government-ID
-- handling.
--
-- New model:
--   • Bucket `ktp-images` is PRIVATE (public=false). No public URLs.
--   • Authenticated users may upload/read/delete objects under a folder
--     named with their auth.uid() — `<uid>/<random>.jpg`. The first
--     `storage.foldername(name)` segment must equal their auth.uid()::text.
--   • Admins (`profiles.role = 'admin'`) can read any object for the
--     verification flow.
--   • `ktp_image_url` columns on the 5 provider tables now store a
--     storage PATH (e.g. `<uid>/<uuid>.jpg`), not a URL. Admin viewer
--     constructs a signed URL at view time.
-- ============================================================================

-- ── 1. Create the bucket (idempotent) ──────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('ktp-images', 'ktp-images', false)
on conflict (id) do update set public = false;  -- defensive: force private

-- ── 2. RLS — drop any pre-existing policies with these names ───────────────
drop policy if exists ktp_owner_upload on storage.objects;
drop policy if exists ktp_owner_read   on storage.objects;
drop policy if exists ktp_owner_update on storage.objects;
drop policy if exists ktp_owner_delete on storage.objects;
drop policy if exists ktp_admin_read   on storage.objects;

-- ── 3. Owner write (INSERT) — uid-scoped folder ────────────────────────────
create policy ktp_owner_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ktp-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 4. Owner read (SELECT) — own folder only ───────────────────────────────
create policy ktp_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ktp-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 5. Owner replace (UPDATE) — own folder only ────────────────────────────
create policy ktp_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'ktp-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 6. Owner delete (DELETE) — own folder only ─────────────────────────────
-- Lets the account-deletion endpoint wipe KTP files when the user
-- triggers right-to-erasure.
create policy ktp_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ktp-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 7. Admin read — verification flow needs cross-user visibility ──────────
create policy ktp_admin_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ktp-images'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================================
-- POST-CONDITIONS
--   • New uploads land at `ktp-images/<auth.uid()>/<uuid>.{jpg,png,webp}`.
--   • Anon clients cannot list, read, or write to the bucket.
--   • Authenticated non-owners cannot read other users' KTP files.
--   • Admin role bypasses ownership for SELECT (for verification UI).
--   • Service role (server-side API) bypasses all policies as usual.
--   • The legacy paste-URL data in `ktp_image_url` columns is unchanged
--     by this migration; signup forms now produce bucket paths instead.
-- ============================================================================
