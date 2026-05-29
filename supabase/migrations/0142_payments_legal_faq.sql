-- ============================================================================
-- 0142 — Vendor-direct payments + legal pages + FAQ + orders table
-- ----------------------------------------------------------------------------
-- Adds the columns and supporting table for a vendor (currently beautician;
-- mirrored to other verticals later per the propagation rule) to:
--
--   • Configure their own Stripe or Midtrans account from the dashboard.
--     Secret keys are stored encrypted at rest using the app-layer
--     AES-256-GCM helper in src/lib/security/keyVault.ts. Publishable /
--     client keys are stored plaintext (they're meant to be public).
--   • Edit their own Terms & Conditions and Privacy Policy. App pre-seeds
--     with neutral default templates so the vendor isn't staring at a
--     blank textarea; they can override entirely if they have their own.
--   • Maintain a FAQ that renders above the contact form on the public
--     profile when faq_enabled = true and faq_items is non-empty.
--
-- And the polymorphic orders table that every paid-cart vertical writes to.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────
-- Beautician — payment + legal + faq columns
-- ─────────────────────────────────────────────────────────────────────

alter table public.beautician_providers
  add column if not exists payment_provider text not null default 'none',
  add column if not exists stripe_secret_key_enc      text,
  add column if not exists stripe_publishable_key     text,
  add column if not exists midtrans_server_key_enc    text,
  add column if not exists midtrans_client_key        text,
  add column if not exists midtrans_is_production     boolean not null default false,
  add column if not exists legal_terms                text,
  add column if not exists legal_privacy              text,
  add column if not exists faq_items                  jsonb  not null default '[]'::jsonb,
  add column if not exists faq_enabled                boolean not null default false;

alter table public.beautician_providers
  drop constraint if exists beautician_providers_payment_provider_chk;
alter table public.beautician_providers
  add constraint beautician_providers_payment_provider_chk
  check (payment_provider in ('none','stripe','midtrans'));

comment on column public.beautician_providers.payment_provider is
  'Which payment rail the public profile uses. none = WhatsApp-only (default), '
  'stripe = Stripe Checkout via vendor''s own keys, midtrans = Midtrans Snap '
  'via vendor''s own keys. WhatsApp footer button stays active in all modes; '
  'when set to stripe/midtrans the contact form is also force-enabled by the '
  'editor so customers always have a non-purchase channel.';

comment on column public.beautician_providers.stripe_secret_key_enc is
  'AES-256-GCM ciphertext of the vendor''s Stripe secret key. Format = '
  'base64(iv) "." base64(ciphertext) "." base64(authTag). Decrypt server-side '
  'only via src/lib/security/keyVault.ts. NEVER expose in any public API.';

comment on column public.beautician_providers.midtrans_server_key_enc is
  'AES-256-GCM ciphertext of the vendor''s Midtrans server key. Same format '
  'and rules as stripe_secret_key_enc.';

comment on column public.beautician_providers.faq_items is
  'Array of {q, a} pairs. Rendered as an accordion above the contact form '
  'on the public profile when faq_enabled = true and the array is non-empty.';

-- ─────────────────────────────────────────────────────────────────────
-- Orders — polymorphic across every paid-cart vertical
-- ─────────────────────────────────────────────────────────────────────
--
-- One table for all verticals to keep webhook plumbing simple. vendor_type
-- + vendor_id pair locates the owner; line_items snapshot the cart at
-- checkout (so a price change post-purchase doesn't rewrite history).
-- Webhook handler writes payment_status; vendor dashboard writes
-- fulfillment_status separately.

create table if not exists public.vendor_orders (
  id uuid primary key default gen_random_uuid(),

  -- Polymorphic vendor reference (no FK — we'd need 7 of them; the
  -- vendor_type + vendor_id pair is validated by the API on insert).
  vendor_type text not null,
  vendor_id   uuid not null,

  -- Cart snapshot at the moment of checkout, immutable.
  line_items      jsonb   not null,
  subtotal_idr    integer not null check (subtotal_idr >= 0),
  service_fee_idr integer not null default 0 check (service_fee_idr >= 0),
  total_idr       integer not null check (total_idr >= 0),
  currency        text    not null default 'IDR',

  -- Customer contact + optional scheduling
  customer_name   text,
  customer_email  text,
  customer_phone  text,
  scheduled_at    timestamptz,
  notes           text,

  -- Payment side
  payment_provider text,       -- 'stripe' | 'midtrans'
  payment_ref      text,       -- Stripe Checkout Session id / Midtrans order_id
  payment_status   text not null default 'pending',
  paid_at          timestamptz,

  -- Vendor-fulfillment side
  fulfillment_status text not null default 'new',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendor_orders
  drop constraint if exists vendor_orders_vendor_type_chk;
alter table public.vendor_orders
  add constraint vendor_orders_vendor_type_chk
  check (vendor_type in ('beautician','handyman','laundry','massage','home-clean','tour-guide','rentals','place'));

alter table public.vendor_orders
  drop constraint if exists vendor_orders_payment_provider_chk;
alter table public.vendor_orders
  add constraint vendor_orders_payment_provider_chk
  check (payment_provider is null or payment_provider in ('stripe','midtrans'));

alter table public.vendor_orders
  drop constraint if exists vendor_orders_payment_status_chk;
alter table public.vendor_orders
  add constraint vendor_orders_payment_status_chk
  check (payment_status in ('pending','paid','failed','refunded','cancelled'));

alter table public.vendor_orders
  drop constraint if exists vendor_orders_fulfillment_status_chk;
alter table public.vendor_orders
  add constraint vendor_orders_fulfillment_status_chk
  check (fulfillment_status in ('new','accepted','fulfilled','cancelled'));

create index if not exists vendor_orders_vendor_idx
  on public.vendor_orders(vendor_type, vendor_id, created_at desc);

create index if not exists vendor_orders_payment_ref_idx
  on public.vendor_orders(payment_ref);

-- RLS: locked down; all reads/writes go through the service role behind
-- API routes that authenticate the vendor first. Simpler than a JOIN-based
-- policy against seven different provider tables.
alter table public.vendor_orders enable row level security;

drop policy if exists vendor_orders_no_anon on public.vendor_orders;
create policy vendor_orders_no_anon on public.vendor_orders
  for all to public using (false) with check (false);

-- ─────────────────────────────────────────────────────────────────────
-- Contact-form — sender phone (added in this migration since the
-- payment system needs the vendor to be able to call the customer back
-- about an order). Existing rows stay null; the public form field is
-- optional so submissions before this migration applied keep working.
-- ─────────────────────────────────────────────────────────────────────

alter table public.contact_messages
  add column if not exists sender_phone text;

alter table public.contact_messages
  drop constraint if exists contact_messages_sender_phone_len_chk;
alter table public.contact_messages
  add constraint contact_messages_sender_phone_len_chk
  check (sender_phone is null or char_length(sender_phone) between 1 and 32);

-- ============================================================================
-- POST-CONDITIONS
--   • Existing beautician rows pick up payment_provider='none', empty FAQ,
--     null legal pages — zero visual change until a vendor opts in.
--   • vendor_orders is empty and unreachable from anon — only the service
--     role + future API routes can populate it.
--   • contact_messages.sender_phone is null on every existing row;
--     /api/<v>/contact endpoints write it when the public form provides it.
-- ============================================================================
