-- ============================================================================
-- 0158 — Block drivers from self-writing platform-controlled columns
-- ----------------------------------------------------------------------------
-- The drivers_update RLS policy is column-coarse — it allows any field on
-- auth.uid()=user_id rows. This lets a malicious driver UPDATE
-- drivers SET paid_until='2099-12-31', status='active', rating=5.0
-- straight from the browser. We can't easily express column-level RLS, so
-- we install a BEFORE-UPDATE trigger that resets these fields to their
-- old values unless the caller is service_role (admin/server code).
-- ============================================================================

create or replace function public.drivers_lock_platform_columns()
returns trigger as $$
begin
  -- service_role bypass — server-side admin client + migrations.
  if current_setting('request.jwt.claim.role', true) = 'service_role' then
    return new;
  end if;

  -- Lock the platform-controlled columns to their prior values.
  new.paid_until    := old.paid_until;
  new.status        := old.status;
  new.rating        := old.rating;
  new.trips_count   := old.trips_count;
  new.b2b_score     := old.b2b_score;
  new.b2b_tier      := old.b2b_tier;
  new.referrer_driver_id := old.referrer_driver_id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists drivers_lock_platform_columns_trg on public.drivers;
create trigger drivers_lock_platform_columns_trg
  before update on public.drivers
  for each row execute function public.drivers_lock_platform_columns();
