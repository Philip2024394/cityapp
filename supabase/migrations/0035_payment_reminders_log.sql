-- ============================================================================
-- 0035_payment_reminders_log.sql
-- ----------------------------------------------------------------------------
-- Idempotency log for the daily payment-reminder cron at
-- /api/admin/reminders/payments. Each (user_id, kind, period_end) is sent
-- at most once — even if the cron fires twice in a day or after a crash.
--
-- `kind` examples:
--   driver_t_minus_7      → driver sub renewing in 7 days, warn early
--   driver_t_minus_3      → in 3 days
--   driver_t_minus_1      → in 1 day
--   driver_t_plus_1       → 1 day after expiry, hint at the grace
--   driver_t_plus_7       → 7 days after expiry, last reminder
--   rental_company_t_minus_7 / _3 / _1 / _plus_1
--   pending_intent_stuck  → payment_intent stuck pending > 24h
--
-- `period_end` is the timestamp the reminder is *about* (the next renewal
-- date or the intent's created_at). Combined with `kind` it lets us send a
-- T-7 + a T-3 for the same subscription without re-firing one of them.
-- ============================================================================

create table if not exists public.payment_reminders_log (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,
  period_end  timestamptz not null,
  sent_at     timestamptz not null default now(),
  channel     text not null default 'email' check (channel in ('email','whatsapp')),
  error       text,

  unique (user_id, kind, period_end)
);

create index if not exists prl_sent_idx
  on public.payment_reminders_log (sent_at desc);

create index if not exists prl_user_idx
  on public.payment_reminders_log (user_id, sent_at desc);

alter table public.payment_reminders_log enable row level security;

-- Server-only writes (cron uses service role). Admin reads via admin client.
-- No client-side select policy needed.
