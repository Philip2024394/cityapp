-- ============================================================================
-- 0029_tour_guide.sql
-- ----------------------------------------------------------------------------
-- Tour-guide opt-in for drivers. Independent of business_contract_enabled
-- — a driver can do tours, B2B contracts, both, or neither.
--
-- DAY RATE: full 8-hour day with bike + fuel + driver-as-guide. Indonesian
-- market reality for Yogya/Bali tourism: Rp 250-600k typical, Rp 350k
-- default mid-market.
--
-- LANGUAGES: ISO-like codes — 'id' (Bahasa), 'en', 'zh', 'ja', 'ko', 'nl'.
-- Stored as text[] so we can add more without schema change.
--
-- DIRECTORY POSTURE (PM 12/2019): drivers self-list a service they offer.
-- Customer browses, picks one, contacts via WhatsApp. No assignment, no
-- pricing intervention, no commission. Same safe-harbour as /business.
-- ============================================================================

alter table public.drivers
  add column if not exists tour_guide_enabled boolean not null default false,
  add column if not exists tour_guide_day_rate_idr integer
    check (
      tour_guide_day_rate_idr is null
      or (tour_guide_day_rate_idr >= 200000 and tour_guide_day_rate_idr <= 750000)
    ),
  add column if not exists tour_guide_languages text[] not null default '{}',
  add column if not exists tour_guide_notes text,
  add column if not exists tour_guide_enabled_at timestamptz;

-- Backfill timestamp for any driver who flipped on before the column existed.
update public.drivers
   set tour_guide_enabled_at = now()
 where tour_guide_enabled = true and tour_guide_enabled_at is null;

-- Index for the /places → Tour Guide query (city + opted-in).
create index if not exists drivers_tour_guide_city_idx
  on public.drivers (city)
  where tour_guide_enabled = true and status = 'active';
