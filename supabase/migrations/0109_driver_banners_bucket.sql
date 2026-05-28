-- ============================================================================
-- 0109 — Driver banners storage bucket
-- ----------------------------------------------------------------------------
-- Public bucket for driver-uploaded profile banners. Each driver uploads to
-- their own folder (path prefix = auth.uid()::text) so RLS policies can
-- gate writes/deletes per-owner while keeping reads fully public (the
-- /car/[slug] and /r/[slug] profile pages render the banner URL directly).
--
-- The URL stored on drivers.cover_image_url (mig 0108) is the bucket's
-- public URL. NULL = fall back to vehicle-type default in DriverProfileShell.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('driver-banners', 'driver-banners', true)
on conflict (id) do nothing;

-- Authenticated drivers can INSERT only into their own folder.
drop policy if exists "driver_banners_owner_insert" on storage.objects;
create policy "driver_banners_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'driver-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated drivers can UPDATE only their own files.
drop policy if exists "driver_banners_owner_update" on storage.objects;
create policy "driver_banners_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'driver-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated drivers can DELETE only their own files.
drop policy if exists "driver_banners_owner_delete" on storage.objects;
create policy "driver_banners_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'driver-banners'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- SELECT is public via bucket.public=true — anyone can read banner URLs
-- (required for the customer-facing /car/[slug] + /r/[slug] profile pages
-- to render the chosen banner). No separate SELECT policy needed.
