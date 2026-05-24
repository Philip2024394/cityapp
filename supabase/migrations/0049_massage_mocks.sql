-- ============================================================================
-- 0049 — Seeded mock profiles for the massage marketplace
-- ----------------------------------------------------------------------------
-- Adds is_mock + mock_hidden_at columns so the table can hold a small
-- pool of demo profiles. When a REAL therapist signs up, an AFTER-INSERT
-- trigger hides ONE oldest visible mock — preserving the visual density
-- of the marketplace while never overstating it.
--
-- DESIGN INVARIANTS
--   • Mocks have user_id = NULL (no auth account). A CHECK enforces that
--     a row cannot be both is_mock=true AND have a user_id.
--   • The original UNIQUE(user_id) constraint becomes a partial unique
--     index that scopes uniqueness to non-mock rows.
--   • Hidden mocks are NOT deleted — admin can re-enable them by clearing
--     mock_hidden_at. Real signups never delete data.
--   • Marketplace queries (api/massage/marketplace) MUST filter to:
--         is_mock = false OR mock_hidden_at IS NULL
--     and ORDER BY is_mock ASC so real profiles always render first.
-- ============================================================================

-- 1. is_mock column + hidden timestamp
alter table public.massage_providers
  add column if not exists is_mock        boolean     not null default false,
  add column if not exists mock_hidden_at timestamptz;

-- 2. Mocks own no auth user — relax NOT NULL and the UNIQUE on user_id.
alter table public.massage_providers
  alter column user_id drop not null;

alter table public.massage_providers
  drop constraint if exists massage_providers_user_id_key;

create unique index if not exists idx_mp_user_id_unique_real
  on public.massage_providers (user_id)
  where user_id is not null and is_mock = false;

-- 3. Hard rule: mock rows cannot carry a user_id; real rows must.
alter table public.massage_providers
  drop constraint if exists mp_mock_no_user;
alter table public.massage_providers
  add  constraint mp_mock_no_user check (
    (is_mock = false and user_id is not null)
    or (is_mock = true and user_id is null)
  );

-- 4. Trigger: real signup hides ONE oldest visible mock in same table.
create or replace function public.hide_one_mock_massage_provider()
returns trigger language plpgsql security definer as $$
declare
  victim_id uuid;
begin
  if new.is_mock = false and new.user_id is not null then
    select id into victim_id
      from public.massage_providers
     where is_mock = true and mock_hidden_at is null
     order by created_at asc
     limit 1;
    if victim_id is not null then
      update public.massage_providers
         set mock_hidden_at = now()
       where id = victim_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_hide_mock_on_real_massage_signup on public.massage_providers;
create trigger trg_hide_mock_on_real_massage_signup
  after insert on public.massage_providers
  for each row execute function public.hide_one_mock_massage_provider();

-- 5. RLS — public read already covers active rows. Mocks are listed
--    publicly (the whole point) but only the admin/service-role client
--    can ever write to them, so no separate write policy is needed.

-- 6. Seed 5 mock therapists. Placeholder image URLs + dummy WhatsApp
--    numbers — admin can replace via supabase dashboard or a future
--    /admin/mocks UI. The numbers are intentionally invalid so a tap
--    fails fast rather than messaging a stranger.
insert into public.massage_providers (
  is_mock, user_id, slug, display_name, gender, years_experience, bio,
  massage_type, price_60min_idr, price_90min_idr, price_120min_idr,
  city, service_area_notes, whatsapp_e164, profile_image_url,
  availability, status
)
values
  (true, null, 'demo-sari',  'Sari',      'woman',  8,
    'Traditional Balinese, calm bedside manner. Hotel and home outcalls.',
    'balinese',     180000, 260000, 340000,
    'Bali — Kuta', 'Kuta · Seminyak · Canggu', '+62000000001',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'online',  'active'),
  (true, null, 'demo-andi',  'Mas Andi',  'man',    12,
    'Shiatsu + sports recovery — runners, surfers, golfers.',
    'shiatsu',      220000, 320000, 420000,
    'Yogyakarta', 'Yogya Central · Sleman · hotel outcalls', '+62000000002',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'busy',    'active'),
  (true, null, 'demo-wayan', 'Ibu Wayan', 'woman',  20,
    'Reflexology and traditional pijat. 20 years experience, villas + hotels.',
    'refleksi',     150000, 220000, 290000,
    'Denpasar',   'Denpasar · Sanur · Renon', '+62000000003',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'offline', 'active'),
  (true, null, 'demo-rini',  'Rini',      'woman',  5,
    'Aromatherapy specialist, soothing music and essential oils on request.',
    'aromatherapy', 200000, 290000, 380000,
    'Bali — Sanur', 'Sanur · Denpasar', '+62000000004',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'online',  'active'),
  (true, null, 'demo-budi',  'Pak Budi',  'man',    15,
    'Deep-tissue specialist, athletes welcome. Trained in Bangkok.',
    'deep_tissue',  240000, 350000, 460000,
    'Yogyakarta', 'Yogya · Bantul · Sleman', '+62000000005',
    'https://ik.imagekit.io/nepgaxllc/Untitledasdasdadsasd.png',
    'busy',    'active')
on conflict (slug) do nothing;
