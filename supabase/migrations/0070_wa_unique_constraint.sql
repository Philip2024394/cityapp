-- ============================================================================
-- 0070 — payment_reminders_log: unique constraint now scoped by channel
-- ----------------------------------------------------------------------------
-- Follow-on to 0069. Original constraint was (user_id, kind, period_end)
-- so only ONE log row per reminder. To support both email + WA rows for
-- the same reminder (same user, same kind, same period_end, different
-- channel), widen the unique key.
-- ============================================================================

alter table public.payment_reminders_log
  drop constraint if exists payment_reminders_log_user_id_kind_period_end_key;

alter table public.payment_reminders_log
  add constraint payment_reminders_log_user_id_kind_period_end_channel_key
  unique (user_id, kind, period_end, channel);
