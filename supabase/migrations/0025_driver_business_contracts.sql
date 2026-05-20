-- ============================================================================
-- 0025_driver_business_contracts.sql
-- ----------------------------------------------------------------------------
-- Adds the B2B contract-availability layer to drivers. Drivers who toggle
-- this on appear on the new public /business directory where small
-- businesses (Shopee/TikTok sellers, restaurants, warungs, grocery
-- shops) can browse + contact them for REGULAR DELIVERY CONTRACTS —
-- not one-off bookings.
--
-- Same legal model as the rest of the platform: City Rider is a
-- directory + facilitator. We never store contracts, broker payments,
-- or take commission. The driver and business agree terms on WhatsApp.
--
-- Fields driver controls (all optional except the toggle):
--   business_contract_enabled  — the master on/off
--   business_max_parcels_per_day  — capacity ceiling shown to buyers
--   business_services  — array of service tags the driver can do for
--     business: 'parcels' (Shopee/TikTok daily runs), 'restaurant'
--     (captain for a single restaurant), 'documents' (lawyer / clinic
--     / office runs), 'groceries' (warung deliveries), 'batched'
--     (multiple stops in one route — Apache-style)
--   business_notes  — free-text pitch shown on their card ("I have
--     a 60L delivery box, English OK, Mon-Sat 09:00-18:00")
--
-- Defaults: all false / null. Toggle is OPT-IN — every existing driver
-- starts off. Avoid surprising drivers with B2B inquiries they didn't
-- agree to.
-- ============================================================================

alter table public.drivers
  add column if not exists business_contract_enabled boolean not null default false,
  add column if not exists business_max_parcels_per_day int,
  add column if not exists business_services text[] not null default '{}',
  add column if not exists business_notes text;

-- Index supports "find available-for-contracts drivers in this city",
-- the core /business directory query.
create index if not exists drivers_business_idx
  on public.drivers (business_contract_enabled, city, last_active_at desc)
  where business_contract_enabled = true and status = 'active';
