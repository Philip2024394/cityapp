-- ============================================================================
-- 0195 — profiles.phone: decouple from UNIQUE so mig 0194 multi-account works
-- ----------------------------------------------------------------------------
-- Mig 0194 introduced the "same WhatsApp number, different password = new
-- account" model: auth.users.phone is intentionally NULL, the real number
-- lives in user_metadata.wa_phone, and public.phone_index is the lookup
-- table (multiple rows per phone allowed).
--
-- Two leftover schema obstacles broke signup on production:
--
--   1. public.profiles.phone has a UNIQUE constraint. The handle_new_user
--      trigger writes coalesce(new.phone, '') to it, so the FIRST signup
--      via mig 0194 inserts profiles.phone='' fine, and EVERY subsequent
--      signup collides on the empty string. Result: HTTP 500 from
--      /api/auth/signup after the first kita2u creator account.
--
--   2. The trigger only reads auth.users.phone, ignoring the wa_phone we
--      now store in raw_user_meta_data. So even if the UNIQUE constraint
--      were dropped, profiles wouldn't carry the visitor's WhatsApp.
--
-- This migration:
--   - Drops profiles_phone_key (a creator may own beautician+laundry+rentals,
--     all on the same wa_phone → multiple profile rows).
--   - Adds a non-unique index on phone so the marketplace can still look
--     up "all profiles for this WA number" cheaply.
--   - Rewrites handle_new_user to populate phone from wa_phone metadata
--     (mig 0194 path) with auth.users.phone as legacy fallback.
-- ============================================================================

alter table public.profiles drop constraint if exists profiles_phone_key;

create index if not exists profiles_phone_idx on public.profiles (phone);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.profiles (id, phone, full_name, role)
  values (
    new.id,
    -- mig 0194 stores the WhatsApp number in user_metadata.wa_phone
    -- because auth.users.phone has to stay NULL (one auth row per
    -- account, but creators run multiple accounts on the same number).
    -- Legacy SMS-OTP accounts keep auth.users.phone populated, so we
    -- fall through to that, and finally to '' to preserve NOT NULL.
    coalesce(
      nullif(new.raw_user_meta_data->>'wa_phone', ''),
      new.phone,
      ''
    ),
    coalesce(new.raw_user_meta_data->>'full_name', null),
    case
      when new.raw_user_meta_data->>'role' in ('customer','driver')
        then new.raw_user_meta_data->>'role'
      else 'customer'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

comment on index public.profiles_phone_idx is
  'Non-unique lookup. Mig 0195 dropped UNIQUE because a single WhatsApp number can own multiple Kita2u app accounts (mig 0194).';
