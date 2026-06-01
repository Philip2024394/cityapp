-- ============================================================================
-- 0170_bus_contact_faqs.sql
-- ----------------------------------------------------------------------------
-- Bus profile "Contact Us + FAQ" surface (founder spec, 2026-06-01).
--
-- Adds three nullable / defaulted columns shared by `public.drivers` and the
-- demo mirror `public.mock_drivers`:
--
--   • contact_email     text         — driver-published contact email.
--   • company_address   text         — physical office / yard address line.
--   • faqs              jsonb '[]'   — array of { q: string; a: string }.
--
-- The bus public profile (/bus/<slug>) swaps the "Verified Driver" badge
-- for a "Contact Us" pill that opens a panel showing company details +
-- address + (eventually) a map + Email / WhatsApp buttons + the FAQ
-- accordion on top. Truck / jeep profiles ignore these columns and keep
-- their existing badge.
--
-- The matching dashboard editor lives at /dashboard/bus/faq and writes to
-- `drivers.faqs` for the signed-in user (see src/app/api/drivers/me/faqs).
--
-- COMPLIANCE: CityDrivers is a software directory under PM 12/2019. Every
-- value here is driver-self-published. The platform never sets, edits, or
-- appoints the contact details.
-- ============================================================================

alter table public.drivers
  add column if not exists contact_email   text,
  add column if not exists company_address text,
  add column if not exists faqs            jsonb not null default '[]'::jsonb;

alter table public.mock_drivers
  add column if not exists contact_email   text,
  add column if not exists company_address text,
  add column if not exists faqs            jsonb not null default '[]'::jsonb;

comment on column public.drivers.contact_email is
  'Driver-published email for the "Contact Us" panel on the bus profile. Nullable — falls back to the WhatsApp button when unset.';

comment on column public.drivers.company_address is
  'Full physical address line (office / yard) shown inside the bus profile "Contact Us" panel. Nullable.';

comment on column public.drivers.faqs is
  'Bus profile FAQ array. Shape: [{ q: string; a: string }]. Empty array → FAQ block hidden on the public profile. Driver-self-published per PM 12/2019.';

comment on column public.mock_drivers.contact_email is
  'Mirror of drivers.contact_email for the demo dataset.';
comment on column public.mock_drivers.company_address is
  'Mirror of drivers.company_address for the demo dataset.';
comment on column public.mock_drivers.faqs is
  'Mirror of drivers.faqs for the demo dataset.';

-- ----------------------------------------------------------------------------
-- Seed the demo bus driver (rahmat-hiace-jogja-charter) so the public profile
-- has something concrete to render the moment the migration lands.
-- ----------------------------------------------------------------------------
update public.mock_drivers
   set contact_email   = 'rahmat.hiace.yogya@gmail.com',
       company_address = 'Jl. Kaliurang KM 8.5, Sleman, Yogyakarta 55581',
       faqs = '[
         {"q":"How many passengers fit in the Hiace?","a":"14 passengers + luggage, all seated with seatbelts."},
         {"q":"Can the trip start outside Yogyakarta?","a":"Yes — pickup anywhere in Sleman, Bantul, or Kulon Progo. Out-of-city surcharge applies past city limits."},
         {"q":"How do I pay?","a":"Pay the driver directly in cash or via QRIS at pickup. CityDrivers never holds payments."}
       ]'::jsonb
 where slug = 'rahmat-hiace-jogja-charter';
