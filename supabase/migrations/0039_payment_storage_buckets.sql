-- ============================================================================
-- 0039_payment_storage_buckets.sql
-- ----------------------------------------------------------------------------
-- Storage buckets referenced by the QR payment flow (migration 0038).
-- The bucket policies in 0038 only take effect if the buckets exist.
--
--   qr-codes         — public read, admin write (active QR images)
--   payment-receipts — owner write/read, service role for admin reads
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('qr-codes', 'qr-codes', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- Admin uploads QR images. Anon can read (active QR public read policy
-- in 0038 already covers the table row; this allows the file fetch).
drop policy if exists "qr_codes_admin_insert" on storage.objects;
create policy "qr_codes_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'qr-codes');

drop policy if exists "qr_codes_admin_update" on storage.objects;
create policy "qr_codes_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'qr-codes');

drop policy if exists "qr_codes_admin_delete" on storage.objects;
create policy "qr_codes_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'qr-codes');
