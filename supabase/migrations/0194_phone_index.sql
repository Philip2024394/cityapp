-- ============================================================================
-- 0194 — phone_index: enable "same WhatsApp number, different password = different account"
-- ----------------------------------------------------------------------------
-- Founder decision 2026-06-07: a single user often runs multiple businesses
-- (e.g. beautician + car-rental + laundry). Phone-as-auth-identity blocked
-- that because Supabase enforces auth.users.phone UNIQUE. We now decouple:
--
--   auth.users.email = synthetic '{phone}-{random}@kita2u.local' (opaque)
--   auth.users.user_metadata.wa_phone = the real WhatsApp number
--   public.phone_index = (auth_user_id, phone, synthetic_email) lookup table
--
-- Multiple rows per phone allowed → same phone, different password = a new
-- independent business. /api/auth/login looks up candidates here, then iterates
-- signInWithPassword(synthetic_email, password) until one matches.
--
-- Service role only. No client read access (RLS enabled, no policies).
-- ============================================================================

create table if not exists public.phone_index (
  auth_user_id     uuid        primary key references auth.users(id) on delete cascade,
  phone            text        not null,
  synthetic_email  text        not null unique,
  created_at       timestamptz not null default now()
);

create index if not exists phone_index_phone_idx on public.phone_index (phone);

alter table public.phone_index enable row level security;

-- No SELECT/INSERT/UPDATE/DELETE policies → client (anon + authenticated)
-- cannot touch this table. /api/auth/{signup,login} use the service role
-- which bypasses RLS.

comment on table public.phone_index is
  'Phone -> auth user mapping. Multiple rows per phone allowed (different passwords = different accounts). Server-only via service role.';
comment on column public.phone_index.synthetic_email is
  'Synthetic email used as auth.users.email. Format: {phone}-{random}@kita2u.local — user never sees this.';
