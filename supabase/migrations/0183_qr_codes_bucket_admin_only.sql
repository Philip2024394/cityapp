-- ============================================================================
-- 0183_qr_codes_bucket_admin_only.sql — tighten qr-codes storage policies
-- ----------------------------------------------------------------------------
-- LAUNCH AUDIT C3: the original 0039 policies were named `qr_codes_admin_*`
-- but the WITH CHECK / USING clause was only `to authenticated` — any
-- signed-in user (e.g., a malicious driver) could insert/update/delete
-- objects in the qr-codes bucket. With the SaaS payment QR images stored
-- here, a driver could swap an admin's QRIS image with their own and
-- intercept Rp 38K/month subscription payments.
--
-- This migration replaces the three policies so only the is_admin()
-- helper passes. Anon read still works via the bucket's public=true
-- flag (set in 0039) so customers fetching the QR image are unaffected.
-- ============================================================================

drop policy if exists "qr_codes_admin_insert" on storage.objects;
create policy "qr_codes_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'qr-codes' and public.is_admin());

drop policy if exists "qr_codes_admin_update" on storage.objects;
create policy "qr_codes_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'qr-codes' and public.is_admin())
  with check (bucket_id = 'qr-codes' and public.is_admin());

drop policy if exists "qr_codes_admin_delete" on storage.objects;
create policy "qr_codes_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'qr-codes' and public.is_admin());
