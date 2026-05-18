-- 0007_place_submissions.sql
-- Open the places table + place-images Storage bucket to anonymous owner
-- submissions. New columns capture the submitter's contact details (the
-- existing owner_user_id column is reserved for the future auth-backed
-- claim flow). Row stays invisible to the public-read policy until an
-- admin flips status='approved'.

alter table places
  add column if not exists submitted_name     text,
  add column if not exists submitted_email    text,
  add column if not exists submitted_whatsapp text;

-- Anonymous users can INSERT a places row, but only with status='pending'
-- and no owner_user_id. The city must exist in city_zones so we can't be
-- spammed with rows for unsupported regions.
drop policy if exists "places_anon_submit" on places;
create policy "places_anon_submit"
  on places for insert
  to anon
  with check (
    status = 'pending'
    and owner_user_id is null
    and city in (select city from city_zones)
  );

-- Storage policy — anonymous uploads to the place-images bucket are
-- limited to the submissions/<uuid>/<file> folder structure so we can
-- isolate unmoderated images. Approved images get moved to the root by
-- the admin moderation flow later.
drop policy if exists "place_images_anon_submit" on storage.objects;
create policy "place_images_anon_submit"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'place-images'
    and (storage.foldername(name))[1] = 'submissions'
  );
