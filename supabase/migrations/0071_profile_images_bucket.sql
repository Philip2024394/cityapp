-- ============================================================================
-- 0071 — Public `profile-images` storage bucket + folder-scoped RLS
-- ----------------------------------------------------------------------------
-- Profile photos on every provider vertical (massage / beautician /
-- laundry / handyman / home-clean) currently land via a paste-URL input
-- on signup + dashboard edit forms. UX-wise this is poor (users must
-- find an image-host, copy URL, paste) and security-wise it inherits
-- the same allowlist problem as KTP (we have to gate on host).
--
-- New model:
--   • Bucket `profile-images` is PUBLIC (anyone can SELECT). Profile
--     photos are shown on the marketplace by design.
--   • Authenticated users may upload/update/delete files under a folder
--     named with their auth.uid() — `<uid>/<random>.jpg`.
--   • `profile_image_url` columns store the FULL public URL
--     (https://<project>.supabase.co/storage/v1/object/public/profile-images/<uid>/<file>)
--     so existing render code (img src) keeps working unchanged.
-- ============================================================================

-- ── 1. Create the bucket (idempotent, public) ──────────────────────────────
insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do update set public = true;

-- ── 2. RLS — drop any pre-existing policies with these names ───────────────
drop policy if exists profile_owner_upload  on storage.objects;
drop policy if exists profile_owner_update  on storage.objects;
drop policy if exists profile_owner_delete  on storage.objects;
drop policy if exists profile_public_read   on storage.objects;

-- ── 3. Public read — needed so marketplace card <img src> resolves ─────────
-- Bucket is set public=true above which already grants anon SELECT via
-- the default storage policy. Adding an explicit policy doesn't hurt and
-- makes the intent obvious.
create policy profile_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'profile-images');

-- ── 4. Owner write (INSERT) — uid-scoped folder ────────────────────────────
create policy profile_owner_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 5. Owner replace (UPDATE) — own folder only ────────────────────────────
create policy profile_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 6. Owner delete (DELETE) — own folder only ─────────────────────────────
-- Lets users replace their photo (delete old then upload new) AND lets
-- /api/account/delete clean up storage when the user deletes their account.
create policy profile_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- POST-CONDITIONS
--   • Browsers can show profile images on marketplace + per-driver pages
--     without auth (public bucket).
--   • Authenticated users can write/replace/delete files only under
--     their own uid folder.
--   • Service role bypasses all policies as usual.
--   • Existing render code (img src=) keeps working — the new uploader
--     stores the full public URL in the same profile_image_url column.
-- ============================================================================
