-- ============================================================================
-- 0224 — qr_payment_url on beautician_providers
-- ----------------------------------------------------------------------------
-- Mirrors the `qr_payment_url` column already on `drivers` (CityDrivers
-- vertical). Stores a public URL to a STATIC QRIS image the vendor
-- uploads themselves. Kita2u never custodies funds — the customer scans
-- the merchant's own QR and pays direct to the merchant's linked bank /
-- e-wallet account.
--
-- Cross-border note: QRIS Cross-Border now spans ID / MY / SG / TH / PH
-- (~580M consumers), so a single image asset covers the entire ASEAN-5
-- payment surface. None of Linktree / Stan Store / Beacons ships native
-- QRIS, which is the structural moat we're locking in here.
--
-- Reference build only — the other 15 vertical *_providers tables will
-- be swept in a follow-up migration once the dashboard + public-profile
-- pattern is validated on beautician.
-- ============================================================================

alter table public.beautician_providers
  add column if not exists qr_payment_url text;
