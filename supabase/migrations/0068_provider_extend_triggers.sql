-- ============================================================================
-- 0068 — Provider subscription extend triggers (5 verticals)
-- ----------------------------------------------------------------------------
-- Brings massage_providers, beautician_providers, laundry_providers,
-- handyman_providers, home_clean_providers up to driver / rental_company /
-- tour_guide parity for QR-receipt-driven subscription extension.
--
-- Audit (2026-05) found the schema columns existed (subscription_status,
-- trial_ends_at, paid_until) but no extend_*_on_payment trigger fired
-- for these verticals, so QR receipts couldn't auto-activate them —
-- they would silently keep showing on the marketplace forever after
-- their 7-day trial.
--
-- After this migration:
--   1. payment_intents.product can be {vertical}_{monthly|yearly} for each
--      of the 5 verticals
--   2. Flipping a matching intent to status='paid' fires the right
--      vertical's extend trigger → updates paid_until + subscription_status
--      on the provider row → marketplace listing keeps rendering
-- ============================================================================

-- ── 1. Widen payment_intents.product check constraint ──────────────────────
alter table public.payment_intents
  drop constraint if exists payment_intents_product_check;

alter table public.payment_intents
  add constraint payment_intents_product_check
  check (product in (
    'subscription',           -- legacy: drivers monthly
    'subscription_yearly',    -- legacy: drivers yearly
    'verified',               -- legacy: one-off verified badge
    'rental_company_monthly',
    'rental_company_yearly',
    'tour_guide_monthly',
    'tour_guide_yearly',
    -- F1 — five new service-provider verticals
    'massage_monthly',     'massage_yearly',
    'beautician_monthly',  'beautician_yearly',
    'laundry_monthly',     'laundry_yearly',
    'handyman_monthly',    'handyman_yearly',
    'home_clean_monthly',  'home_clean_yearly'
  ));

-- ── 2. Shared trigger pattern — generates one function per vertical ───────
-- Each function:
--   * exits early when the UPDATE isn't a fresh trial→paid flip
--   * exits early when the intent's product doesn't match this vertical
--   * derives plan label from the product suffix
--   * locates the provider row by user_id (FOR UPDATE to avoid race)
--   * computes basis = max(existing paid_until, now()) so re-up adds time
--   * sets subscription_status='active' + extends paid_until by
--     intent.extends_days (30 for monthly, 365 for yearly)
--
-- Generated via PL/pgSQL DO block so the same template runs five times.
-- Avoids ~250 lines of near-duplicate function bodies.
do $$
declare
  v_vertical text;
  v_table    text;
  v_func     text;
  v_trigger  text;
  v_prefix   text;
begin
  foreach v_vertical in array array[
    'massage', 'beautician', 'laundry', 'handyman', 'home_clean'
  ] loop
    v_table   := v_vertical || '_providers';
    v_func    := 'extend_' || v_vertical || '_on_payment';
    v_trigger := 'pi_extend_' || v_vertical;
    v_prefix  := v_vertical;

    execute format($f$
      create or replace function public.%I()
      returns trigger
      language plpgsql
      security definer
      set search_path = public, pg_temp
      as $body$
      declare
        v_basis timestamptz;
        v_plan  text;
      begin
        if new.status <> 'paid' or old.status = 'paid' then
          return new;
        end if;
        if new.product not in (%L, %L) then
          return new;
        end if;

        v_plan := case
          when new.product = %L then 'yearly'
          else 'monthly'
        end;

        -- Lock the provider row and read current paid_until.
        select coalesce(paid_until, now())
          into v_basis
          from public.%I
          where user_id = new.driver_user_id
          for update;

        -- No provider row for this user — silently noop. Should not happen
        -- in practice (user has to have an active provider to even see the
        -- upgrade button) but be defensive.
        if v_basis is null then
          return new;
        end if;

        if v_basis < now() then v_basis := now(); end if;

        update public.%I
        set subscription_status = 'active',
            paid_until          = v_basis + (new.extends_days || ' days')::interval,
            updated_at          = now()
        where user_id = new.driver_user_id;

        return new;
      end;
      $body$;
    $f$,
      v_func,
      v_prefix || '_monthly', v_prefix || '_yearly',
      v_prefix || '_yearly',
      v_table,
      v_table
    );

    execute format($t$
      drop trigger if exists %I on public.payment_intents;
      create trigger %I
        after update of status on public.payment_intents
        for each row execute function public.%I();
    $t$,
      v_trigger,
      v_trigger,
      v_func
    );
  end loop;
end;
$$;

-- ============================================================================
-- POST-CONDITIONS
--   • payment_intents accepts the 10 new product values.
--   • Five new triggers fire on intent status flip → 'paid':
--       pi_extend_massage, pi_extend_beautician, pi_extend_laundry,
--       pi_extend_handyman, pi_extend_home_clean
--   • Each updates only its own provider table. No cross-talk.
--   • Combined with activate_on_receipt_insert() from mig 0038, this means
--     a service-provider uploading a QR receipt → intent created + paid
--     → their paid_until is extended within seconds → marketplace listing
--     stays live during admin review (matches the rental_company / tour_guide
--     UX that already works).
-- ============================================================================
