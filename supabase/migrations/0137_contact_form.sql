-- ============================================================================
-- 0137 — Contact form: per-provider opt-in + inbound message log
-- ----------------------------------------------------------------------------
-- Adds two opt-in columns to every provider table:
--   contact_form_enabled boolean default false  — toggle visibility
--   contact_email        text                   — destination for notifications
--
-- Plus a new `contact_messages` table that captures every form
-- submission so providers can audit history from a future dashboard
-- /messages page even if they miss the Resend notification email.
--
-- Public-profile rendering logic (computed client-side):
--   hasVisitUs      = has_physical_location AND latitude AND longitude
--   hasContactForm  = contact_form_enabled AND contact_email
--   Visit-us button text:
--     hasVisitUs                          → "Visit Us"
--     !hasVisitUs && hasContactForm       → "Contact Us"
--     !hasVisitUs && !hasContactForm      → button hidden
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- Per-provider opt-in columns
-- ─────────────────────────────────────────────────────────────────────────

alter table public.bike_rentals
  add column if not exists contact_form_enabled boolean not null default false,
  add column if not exists contact_email        text;

alter table public.tour_guide_listings
  add column if not exists contact_form_enabled boolean not null default false,
  add column if not exists contact_email        text;

alter table public.massage_providers
  add column if not exists contact_form_enabled boolean not null default false,
  add column if not exists contact_email        text;

alter table public.beautician_providers
  add column if not exists contact_form_enabled boolean not null default false,
  add column if not exists contact_email        text;

alter table public.laundry_providers
  add column if not exists contact_form_enabled boolean not null default false,
  add column if not exists contact_email        text;

alter table public.handyman_providers
  add column if not exists contact_form_enabled boolean not null default false,
  add column if not exists contact_email        text;

alter table public.home_clean_providers
  add column if not exists contact_form_enabled boolean not null default false,
  add column if not exists contact_email        text;

-- ─────────────────────────────────────────────────────────────────────────
-- contact_messages — polymorphic inbox row per form submission.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.contact_messages (
  id              bigserial primary key,
  -- Provider this message belongs to. provider_type matches the
  -- existing polymorphic pattern from mig 0072 (reviews +
  -- provider_profile_views).
  provider_type   text not null check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property'
  )),
  provider_id     uuid not null,
  -- Sender — captured raw, no auth required so any visitor can send.
  sender_name     text not null check (char_length(sender_name) between 1 and 80),
  sender_email    text not null check (char_length(sender_email) between 3 and 254 and sender_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message         text not null check (char_length(message) between 1 and 4000),
  -- Operational metadata.
  source_ip       inet,
  user_agent      text,
  created_at      timestamptz not null default now(),
  -- Provider workflow.
  read_at         timestamptz,
  replied_at      timestamptz
);

create index if not exists contact_messages_provider_idx
  on public.contact_messages (provider_type, provider_id, created_at desc);

-- Rate-limiting helper index — per-IP recent counts. Used by the API
-- endpoint to enforce 5 submissions per IP per hour.
create index if not exists contact_messages_ip_recent_idx
  on public.contact_messages (source_ip, created_at desc);

-- RLS — providers can SELECT their own rows only (authenticated reads
-- via the API gateway use service-role anyway; this policy is the
-- defensive backstop). Anon INSERTs are denied — the API uses the
-- service-role client to write, so no anon policy needed.
alter table public.contact_messages enable row level security;

drop policy if exists contact_messages_own_select on public.contact_messages;
create policy contact_messages_own_select on public.contact_messages
  for select to authenticated
  using (
    case provider_type
      when 'beautician'  then exists (select 1 from public.beautician_providers   p where p.id = provider_id and p.user_id = auth.uid())
      when 'handyman'    then exists (select 1 from public.handyman_providers     p where p.id = provider_id and p.user_id = auth.uid())
      when 'laundry'     then exists (select 1 from public.laundry_providers      p where p.id = provider_id and p.user_id = auth.uid())
      when 'massage'     then exists (select 1 from public.massage_providers      p where p.id = provider_id and p.user_id = auth.uid())
      when 'home_clean'  then exists (select 1 from public.home_clean_providers   p where p.id = provider_id and p.user_id = auth.uid())
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      else false
    end
  );

comment on table public.contact_messages is
  'Inbound form submissions per provider. Polymorphic via provider_type + provider_id. '
  'Providers SELECT their own via RLS. Anon writes go through the per-vertical /api/<v>/contact '
  'service-role endpoint which rate-limits 5/IP/hour and emails via Resend.';

-- ============================================================================
-- POST-CONDITIONS
--   • Every provider row carries contact_form_enabled (default false) +
--     contact_email (nullable). The dashboard /info Card lets providers
--     opt in by setting both.
--   • contact_messages stores every submission with auditable timestamps.
--   • /api/<vertical>/contact endpoint inserts + Resend-emails. Resend
--     reply-to = sender_email so the provider can reply in-thread from
--     their own mail client.
-- ============================================================================
