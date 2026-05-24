-- ============================================================================
-- 0056 — Clean mock driver names
-- ----------------------------------------------------------------------------
-- The 0050 seed used compound names like 'Citra · Bantul daytime' which
-- look messy on the marketplace card. Stripping to first names only.
-- ============================================================================

update public.mock_drivers set business_name = 'Andi'    where slug = 'demo-andi-cb';
update public.mock_drivers set business_name = 'Citra'   where slug = 'demo-citra-scoopy';
update public.mock_drivers set business_name = 'Budi'    where slug = 'demo-budi-beat';
update public.mock_drivers set business_name = 'Rini'    where slug = 'demo-rini-vario';
update public.mock_drivers set business_name = 'Gilang'  where slug = 'demo-gilang-pcx';
