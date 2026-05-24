-- ============================================================================
-- 0069 — WhatsApp reminder channel — admin queue
-- ----------------------------------------------------------------------------
-- Closes the audit gap: payment_reminders_log.channel allowed 'whatsapp'
-- (see mig 0035), but no sender ever wrote rows for that channel. Email
-- was the only outbound path.
--
-- Design: human-in-the-loop (no WhatsApp Business API).
--   1. Cron writes a parallel row per reminder with channel='whatsapp',
--      sent_at=null, plus the user's E.164 WA number and a pre-rendered
--      plain-text message body.
--   2. Admin opens /admin/wa-queue → lists pending rows → clicks
--      "Open WhatsApp" → wa.me deep-link opens with text pre-filled →
--      admin reviews + sends → comes back → clicks "Mark sent" which
--      updates sent_at.
--
-- This avoids the per-message cost + Meta verification of WhatsApp
-- Business API while still surfacing every reminder to the admin in a
-- single queue. Admin can also delete rows if they're stale.
-- ============================================================================

-- ── 1. Add the queue columns to payment_reminders_log ─────────────────────
-- Existing table from mig 0035 already has: user_id, kind, period_end,
-- channel, sent_at, error. We just need to store the WA-specific data.
alter table public.payment_reminders_log
  add column if not exists whatsapp_number text,
  add column if not exists wa_message      text,
  add column if not exists queued_at       timestamptz not null default now();

-- ── 2. Relax sent_at to nullable so WA queue rows can stay unsent ─────────
-- Email rows still fill sent_at immediately. WA rows set sent_at NULL on
-- insert and the admin sets it when they click "Mark sent".
alter table public.payment_reminders_log
  alter column sent_at drop not null;

-- ── 3. Index to speed up the "pending WA queue" admin query ───────────────
create index if not exists idx_reminders_wa_pending
  on public.payment_reminders_log (queued_at desc)
  where channel = 'whatsapp' and sent_at is null;

-- ── 3. RLS — admin reads + updates pending rows ───────────────────────────
-- The table already has RLS enabled (mig 0035). The cron writes via
-- service role (bypasses RLS). Admin reads + the "mark sent" update
-- come from /admin/wa-queue which uses the service-role API too. No
-- new policies needed — existing policies already gate non-admin access.

-- ============================================================================
-- POST-CONDITION
--   • payment_reminders_log has 2 new optional columns; existing rows
--     have nulls (no migration of historical data needed).
--   • Cron writes 2 rows per reminder when WA number is known: one for
--     email (existing behavior), one for WA queue.
--   • /admin/wa-queue page filters channel='whatsapp' AND sent_at IS NULL.
-- ============================================================================
