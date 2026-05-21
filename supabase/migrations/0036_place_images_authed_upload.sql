-- ============================================================================
-- 0036_place_images_authed_upload.sql
-- ----------------------------------------------------------------------------
-- The rental-listing form (and place-submission form) used to be open to
-- anonymous users — the existing `place_images_anon_submit` storage policy
-- (migration 0007) allowed uploads to place-images/submissions/... for the
-- `anon` role only.
--
-- After 0034 added the new account-type flow we now FORCE owners to sign
-- in via /rent/list/auth before they can list. Once a user is authenticated
-- their JWT is `authenticated`, not `anon`, and the upload silently 403s
-- on the bucket. Symptom: customer-reported "foto is not saving" on the
-- rental listing form.
--
-- This migration adds a matching policy for the `authenticated` role with
-- the same submissions/<uuid>/<file> path constraint. Approved images
-- still get moved to the root by the admin moderation flow.
-- ============================================================================

drop policy if exists "place_images_authed_submit" on storage.objects;
create policy "place_images_authed_submit"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'place-images'
    and (storage.foldername(name))[1] = 'submissions'
  );

-- Owners need to be able to read their own uploaded files back so the
-- live preview + the dashboard rentals view can render them via getPublicUrl
-- when the bucket is not fully public. The bucket is currently public per
-- 0007 design, but this policy is a belt-and-braces guard if it ever flips.
drop policy if exists "place_images_authed_select_own" on storage.objects;
create policy "place_images_authed_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'place-images'
    and (storage.foldername(name))[1] = 'submissions'
  );
