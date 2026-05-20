-- ============================================================================
-- 0032_subscription_trigger_hardening.sql
-- ----------------------------------------------------------------------------
-- Two fixes flagged in the 2026-05 backend audit:
--
--   1. extend_subscription_on_payment silently no-op'd if the subscriptions
--      row was missing for a driver (admin-created, hand-deleted, trigger
--      from 0001 didn't fire). Money landed, payment_intents.status='paid',
--      but the subscription stayed past_due. → INSERT-on-missing-row now.
--
--   2. amount_idr used GREATEST(existing, new) which meant once a driver
--      paid yearly Rp 350K, every subsequent monthly Rp 38K renewal still
--      showed amount_idr = 350K on the dashboard. Receipts + UI now reflect
--      the LAST PAID amount.
-- ============================================================================

create or replace function public.extend_subscription_on_payment()
returns trigger
language plpgsql
security definer
as $$
declare
  v_basis      timestamptz;
  v_next_end   timestamptz;
  v_row_count  int;
begin
  if new.status <> 'paid' or old.status = 'paid' then
    return new;
  end if;

  -- Compute the next current_period_end = (existing or now()) + extends_days.
  -- We do this BEFORE the update so we can also use it for the insert path.
  select coalesce(current_period_end, now())
    into v_basis
  from public.subscriptions
  where driver_id = new.driver_user_id
  for update;

  if v_basis is null or v_basis < now() then
    v_basis := now();
  end if;
  v_next_end := v_basis + (new.extends_days || ' days')::interval;

  update public.subscriptions
  set status             = 'active',
      current_period_end = v_next_end,
      -- Reflect the LAST PAID amount, not the historical maximum
      amount_idr         = new.amount_idr,
      payment_reference  = new.provider_txn_id,
      updated_at         = now()
  where driver_id = new.driver_user_id;

  get diagnostics v_row_count = row_count;

  -- If no subscription row exists yet (driver onboarded outside the normal
  -- path, row was hand-deleted, etc.), create one so the payment isn't lost.
  if v_row_count = 0 then
    insert into public.subscriptions (
      driver_id, status, current_period_end, amount_idr,
      payment_reference, updated_at
    ) values (
      new.driver_user_id, 'active', v_next_end, new.amount_idr,
      new.provider_txn_id, now()
    )
    on conflict (driver_id) do update
      set status             = 'active',
          current_period_end = excluded.current_period_end,
          amount_idr         = excluded.amount_idr,
          payment_reference  = excluded.payment_reference,
          updated_at         = now();
  end if;

  return new;
end;
$$;
