-- 0009_bike_rental_submissions.sql
-- Open bike_rentals to anonymous owner submissions + add the contact
-- columns and rejection_note column the admin moderation queue needs.
-- Mirrors the 0007_place_submissions pattern.

alter table bike_rentals
  add column if not exists submitted_name     text,
  add column if not exists submitted_email    text,
  add column if not exists submitted_whatsapp text,
  add column if not exists rejection_note     text;

-- Anonymous users can INSERT a bike_rentals row, but only with
-- status='pending' and no owner_user_id, against an existing city zone.
drop policy if exists "bike_rentals_anon_submit" on bike_rentals;
create policy "bike_rentals_anon_submit"
  on bike_rentals for insert
  to anon
  with check (
    status = 'pending'
    and owner_user_id is null
    and city in (select city from city_zones)
  );

-- Anonymous storage uploads for rental submissions reuse the existing
-- 'submissions' folder root, so the existing place_images_anon_submit
-- policy already allows the bike-rentals subfolder. No new storage
-- policy needed.
