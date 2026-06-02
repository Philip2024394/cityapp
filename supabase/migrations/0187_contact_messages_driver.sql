-- ============================================================================
-- 0187_contact_messages_driver.sql
-- ----------------------------------------------------------------------------
-- Extend the polymorphic contact_messages table (mig 0137) so it accepts
-- inbound form submissions for drivers — not just service providers
-- (beautician/handyman/laundry/etc.). The jeep public profile (and any
-- vehicle vertical that opts in to the inline Contact Us form) writes
-- here via /api/drivers/contact.
--
-- Changes:
--   1. Widen the provider_type CHECK constraint to include 'driver'.
--   2. Add an optional sender_country text column so the form's Country
--      field stores cleanly instead of being baked into the message body.
--   3. RLS policy from mig 0137 only branches on the existing provider
--      types — drivers join the policy via a new clause that joins to
--      public.drivers on user_id.
--
-- Public profile rendering keeps the existing /api/<vertical>/contact
-- contract for service providers. For drivers, the form posts to
-- /api/drivers/contact which writes provider_type='driver' rows.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Widen provider_type to include 'driver'
-- ─────────────────────────────────────────────────────────────────────────

alter table public.contact_messages
  drop constraint if exists contact_messages_provider_type_check;

alter table public.contact_messages
  add constraint contact_messages_provider_type_check
  check (provider_type in (
    'beautician','handyman','laundry','massage','home_clean',
    'tour_guide','bike_rental','property','driver'
  ));

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Optional sender_country column
-- ─────────────────────────────────────────────────────────────────────────

alter table public.contact_messages
  add column if not exists sender_country text
  check (sender_country is null or char_length(sender_country) between 1 and 64);

comment on column public.contact_messages.sender_country is
  'Free-text country name supplied by the customer. Used by the driver Contact Us form (jeep profile etc.) — nullable for backward compatibility with the original service-provider submissions which did not collect this field.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. RLS — drivers can SELECT their own message rows
-- ─────────────────────────────────────────────────────────────────────────
-- The existing policy from mig 0137 only matched the 8 service-provider
-- types. We extend it with a `'driver'` arm that joins to public.drivers
-- on user_id so the signed-in driver can read their own inbox.

drop policy if exists contact_messages_own_select on public.contact_messages;

create policy contact_messages_own_select on public.contact_messages
  for select to authenticated
  using (
    case provider_type
      when 'beautician'  then exists (select 1 from public.beautician_providers   p where p.id = provider_id and p.user_id       = auth.uid())
      when 'handyman'    then exists (select 1 from public.handyman_providers     p where p.id = provider_id and p.user_id       = auth.uid())
      when 'laundry'     then exists (select 1 from public.laundry_providers      p where p.id = provider_id and p.user_id       = auth.uid())
      when 'massage'     then exists (select 1 from public.massage_providers      p where p.id = provider_id and p.user_id       = auth.uid())
      when 'home_clean'  then exists (select 1 from public.home_clean_providers   p where p.id = provider_id and p.user_id       = auth.uid())
      when 'tour_guide'  then exists (select 1 from public.tour_guide_listings    p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'bike_rental' then exists (select 1 from public.bike_rentals           p where p.id = provider_id and p.owner_user_id = auth.uid())
      when 'driver'      then exists (select 1 from public.drivers                d where d.user_id = provider_id and d.user_id = auth.uid())
      else false
    end
  );

-- ============================================================================
-- POST-CONDITIONS
--   • contact_messages.provider_type now permits 'driver'.
--   • sender_country populated by the driver Contact Us form; null on
--     historical / service-provider rows.
--   • Drivers SELECT their own rows via the extended RLS policy. Anon
--     INSERT still goes through the service-role API (/api/drivers/contact)
--     which rate-limits 5/IP/hour and emails via Resend.
-- ============================================================================
