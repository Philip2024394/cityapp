import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { sendEmail, renderEmail } from '@/lib/email/resend'

// ============================================================================
// GET /api/admin/reminders/payments?secret=$CRON_SECRET
// ----------------------------------------------------------------------------
// Daily sweep — runs at 08:00 WIB (01:00 UTC) via vercel.json.
// Five reminder kinds:
//
//   1. driver_t_minus_7 / _3 / _1   → driver sub renewing soon
//   2. driver_t_plus_1 / _7         → driver sub lapsed (past_due)
//   3. rental_company_t_minus_7 / _3 / _1 → rental sub renewing soon
//   4. rental_company_t_plus_1      → rental sub lapsed today
//   5. pending_intent_stuck         → Snap intent pending > 24h, < 72h
//
// Idempotency: every send is logged in payment_reminders_log with a
// (user_id, kind, period_end) unique key. A second cron pass in the
// same day will skip already-sent rows.
//
// Email channel: Resend via lib/email/resend.ts. WhatsApp can be added
// later (cityriders has no WA Cloud API config yet — Phase 2).
//
// Returns a JSON summary suitable for cron logs / admin debugging.
// ============================================================================

export const dynamic = 'force-dynamic'

type ReminderKind =
  | 'driver_t_minus_7' | 'driver_t_minus_3' | 'driver_t_minus_1'
  | 'driver_t_plus_1'  | 'driver_t_plus_7'
  | 'rental_company_t_minus_7' | 'rental_company_t_minus_3' | 'rental_company_t_minus_1'
  | 'rental_company_t_plus_1'
  | 'tour_guide_t_minus_7' | 'tour_guide_t_minus_3' | 'tour_guide_t_minus_1'
  | 'tour_guide_t_plus_1'
  | 'pending_intent_stuck'

type Plan = 'driver' | 'rental_company' | 'tour_guide'

const DAY_MS = 24 * 60 * 60 * 1000
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cityrider.id'
const RENEW_URL          = APP_URL + '/dashboard'
const UPGRADE_URL        = APP_URL + '/rent/upgrade'
const TOUR_UPGRADE_URL   = APP_URL + '/tour/upgrade'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return runSweep()
}

export async function POST(req: Request) { return GET(req) }

async function runSweep() {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  const now = Date.now()
  const summary = {
    started_at: new Date(now).toISOString(),
    drivers_reminded: 0,
    rental_company_reminded: 0,
    tour_guide_reminded: 0,
    stuck_intent_reminded: 0,
    skipped_already_sent: 0,
    skipped_no_email: 0,
    failures: 0,
  }

  // ── Driver subscriptions ─────────────────────────────────────────────
  // Pull all subs that either renew within 7d (warning) or expired
  // within last 7d (lapsed). One read, branch by offset.
  const { data: subs } = await admin
    .from('subscriptions')
    .select('driver_id, status, current_period_end')
    .in('status', ['active', 'past_due'])
    .gte('current_period_end', new Date(now - 7 * DAY_MS).toISOString())
    .lte('current_period_end', new Date(now + 7 * DAY_MS).toISOString())

  for (const sub of subs ?? []) {
    const userId = sub.driver_id as string
    const periodEnd = new Date(sub.current_period_end as string)
    const kind = pickKindForOffset(periodEnd, now, 'driver')
    if (!kind) continue

    const result = await maybeSend(admin, {
      userId, kind, periodEnd, plan: 'driver',
      renewUrl: RENEW_URL,
    })
    bumpSummary(summary, result)
    if (result === 'sent') summary.drivers_reminded++
  }

  // ── Rental Company subscriptions ─────────────────────────────────────
  const { data: rc } = await admin
    .from('user_accounts')
    .select('user_id, account_type, subscription_status, subscription_expires_at')
    .eq('account_type', 'rental_company')
    .in('subscription_status', ['active', 'expired'])
    .gte('subscription_expires_at', new Date(now - 7 * DAY_MS).toISOString())
    .lte('subscription_expires_at', new Date(now + 7 * DAY_MS).toISOString())

  for (const row of rc ?? []) {
    const userId = row.user_id as string
    const periodEnd = new Date(row.subscription_expires_at as string)
    const kind = pickKindForOffset(periodEnd, now, 'rental_company')
    if (!kind) continue

    const result = await maybeSend(admin, {
      userId, kind, periodEnd, plan: 'rental_company',
      renewUrl: UPGRADE_URL,
    })
    bumpSummary(summary, result)
    if (result === 'sent') summary.rental_company_reminded++
  }

  // ── Tour Guide subscriptions ─────────────────────────────────────────
  const { data: tg } = await admin
    .from('user_accounts')
    .select('user_id, tour_guide_status, tour_guide_expires_at')
    .in('tour_guide_status', ['active', 'expired'])
    .gte('tour_guide_expires_at', new Date(now - 7 * DAY_MS).toISOString())
    .lte('tour_guide_expires_at', new Date(now + 7 * DAY_MS).toISOString())

  for (const row of tg ?? []) {
    const userId = row.user_id as string
    const periodEnd = new Date(row.tour_guide_expires_at as string)
    const kind = pickKindForOffset(periodEnd, now, 'tour_guide')
    if (!kind) continue

    const result = await maybeSend(admin, {
      userId, kind, periodEnd, plan: 'tour_guide',
      renewUrl: TOUR_UPGRADE_URL,
    })
    bumpSummary(summary, result)
    if (result === 'sent') summary.tour_guide_reminded++
  }

  // ── Stuck pending Snap intents (24h–72h old) ────────────────────────
  // Earlier than 24h: user might still be paying. Older than 72h:
  // they've clearly abandoned, no point pinging.
  const { data: stuck } = await admin
    .from('payment_intents')
    .select('id, driver_user_id, product, amount_idr, created_at')
    .eq('status', 'pending')
    .lt('created_at', new Date(now - 24 * 60 * 60 * 1000).toISOString())
    .gte('created_at', new Date(now - 72 * 60 * 60 * 1000).toISOString())

  for (const intent of stuck ?? []) {
    const userId = intent.driver_user_id as string
    const periodEnd = new Date(intent.created_at as string)
    const result = await maybeSend(admin, {
      userId, kind: 'pending_intent_stuck', periodEnd,
      plan: (intent.product as string).startsWith('rental_company') ? 'rental_company' : 'driver',
      renewUrl: (intent.product as string).startsWith('rental_company') ? UPGRADE_URL : RENEW_URL,
    })
    bumpSummary(summary, result)
    if (result === 'sent') summary.stuck_intent_reminded++
  }

  return NextResponse.json({ ok: true, ...summary, finished_at: new Date().toISOString() })
}

// ── helpers ────────────────────────────────────────────────────────────

function pickKindForOffset(periodEnd: Date, now: number, plan: Plan): ReminderKind | null {
  const dayOffset = Math.round((periodEnd.getTime() - now) / DAY_MS)
  if (plan === 'driver') {
    if (dayOffset === 7)  return 'driver_t_minus_7'
    if (dayOffset === 3)  return 'driver_t_minus_3'
    if (dayOffset === 1)  return 'driver_t_minus_1'
    if (dayOffset === -1) return 'driver_t_plus_1'
    if (dayOffset === -7) return 'driver_t_plus_7'
  } else if (plan === 'rental_company') {
    if (dayOffset === 7)  return 'rental_company_t_minus_7'
    if (dayOffset === 3)  return 'rental_company_t_minus_3'
    if (dayOffset === 1)  return 'rental_company_t_minus_1'
    if (dayOffset === -1) return 'rental_company_t_plus_1'
  } else if (plan === 'tour_guide') {
    if (dayOffset === 7)  return 'tour_guide_t_minus_7'
    if (dayOffset === 3)  return 'tour_guide_t_minus_3'
    if (dayOffset === 1)  return 'tour_guide_t_minus_1'
    if (dayOffset === -1) return 'tour_guide_t_plus_1'
  }
  return null
}

type MaybeSendResult = 'sent' | 'skipped_already_sent' | 'skipped_no_email' | 'failed'

async function maybeSend(
  admin: ReturnType<typeof getAdminSupabase>,
  args: {
    userId: string
    kind: ReminderKind
    periodEnd: Date
    plan: Plan
    renewUrl: string
  },
): Promise<MaybeSendResult> {
  if (!admin) return 'failed'

  // Idempotency: bail if we've already sent this (user_id, kind, period_end)
  const { data: existing } = await admin
    .from('payment_reminders_log')
    .select('id')
    .eq('user_id', args.userId)
    .eq('kind', args.kind)
    .eq('period_end', args.periodEnd.toISOString())
    .maybeSingle()
  if (existing) return 'skipped_already_sent'

  // Resolve email. Auth-side getUserById is the canonical lookup.
  const { data: userRow } = await admin.auth.admin.getUserById(args.userId)
  const email = userRow?.user?.email
  if (!email) return 'skipped_no_email'

  const { subject, html } = composeMessage(args)
  const send = await sendEmail({ to: email, subject, html })

  await admin.from('payment_reminders_log').insert({
    user_id:    args.userId,
    kind:       args.kind,
    period_end: args.periodEnd.toISOString(),
    channel:    'email',
    error:      send.ok ? null : send.error,
  })

  return send.ok ? 'sent' : 'failed'
}

function bumpSummary(summary: {
  drivers_reminded: number
  rental_company_reminded: number
  stuck_intent_reminded: number
  skipped_already_sent: number
  skipped_no_email: number
  failures: number
}, r: MaybeSendResult) {
  if (r === 'skipped_already_sent') summary.skipped_already_sent++
  else if (r === 'skipped_no_email') summary.skipped_no_email++
  else if (r === 'failed') summary.failures++
}

function composeMessage(args: {
  kind: ReminderKind
  periodEnd: Date
  plan: Plan
  renewUrl: string
}): { subject: string; html: string } {
  const dueLabel = args.periodEnd.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const planLabel = args.plan === 'rental_company' ? 'Rental Company'
    : args.plan === 'tour_guide' ? 'Tour Guide'
    : 'City Rider Driver'

  switch (args.kind) {
    case 'driver_t_minus_7':
    case 'rental_company_t_minus_7':
    case 'tour_guide_t_minus_7':
      return {
        subject: `Subscription ${planLabel} kamu jatuh tempo dalam 7 hari`,
        html: renderEmail({
          heading: 'Tinggal 7 hari lagi',
          preheader: `Subscription ${planLabel} kamu jatuh tempo ${dueLabel}.`,
          bodyHtml: `<p>Hai!<br><br>Subscription ${planLabel} kamu akan habis pada <strong>${dueLabel}</strong>. Tetap aktif dengan renew sekarang — proses pembayaran &lt; 1 menit lewat Midtrans.</p>`,
          ctaUrl: args.renewUrl,
          ctaLabel: 'Renew sekarang',
        }),
      }
    case 'driver_t_minus_3':
    case 'rental_company_t_minus_3':
    case 'tour_guide_t_minus_3':
      return {
        subject: `3 hari lagi — subscription ${planLabel} jatuh tempo`,
        html: renderEmail({
          heading: '3 hari lagi',
          preheader: `Subscription ${planLabel} jatuh tempo ${dueLabel}.`,
          bodyHtml: `<p>Reminder: subscription ${planLabel} kamu akan habis dalam 3 hari (<strong>${dueLabel}</strong>). Renew sekarang biar listing / akunmu tetap aktif tanpa gangguan.</p>`,
          ctaUrl: args.renewUrl,
          ctaLabel: 'Renew sekarang',
        }),
      }
    case 'driver_t_minus_1':
    case 'rental_company_t_minus_1':
    case 'tour_guide_t_minus_1':
      return {
        subject: `Besok subscription ${planLabel} kamu habis`,
        html: renderEmail({
          heading: 'Besok subscription kamu habis',
          preheader: `Renew hari ini biar tetap online.`,
          bodyHtml: `<p>Subscription ${planLabel} kamu jatuh tempo <strong>besok</strong> (${dueLabel}). Renew hari ini supaya akunmu tetap online dan ${args.plan === 'rental_company' ? 'listing motor tetap tayang' : 'kamu tetap muncul di marketplace'}.</p>`,
          ctaUrl: args.renewUrl,
          ctaLabel: 'Renew sekarang',
        }),
      }
    case 'driver_t_plus_1':
    case 'rental_company_t_plus_1':
    case 'tour_guide_t_plus_1':
      return {
        subject: `Subscription ${planLabel} kamu sudah lewat`,
        html: renderEmail({
          heading: 'Subscription kamu lewat tempo',
          preheader: `Akun kamu di-pause. Renew untuk aktifkan lagi.`,
          bodyHtml: `<p>Subscription ${planLabel} kamu sudah lewat (${dueLabel}). ${
            args.plan === 'rental_company' ? 'Semua listing motormu sudah di-pause sementara dan tidak tayang di /rent.'
            : args.plan === 'tour_guide'   ? 'Listing tour guide kamu sudah di-pause sementara dan tidak tayang di /tour.'
            : 'Statusmu sudah past_due — kamu tidak muncul lagi di marketplace.'
          } Renew sekarang untuk aktifkan lagi langsung.</p>`,
          ctaUrl: args.renewUrl,
          ctaLabel: args.plan === 'driver' ? 'Renew sekarang' : 'Aktifkan kembali',
        }),
      }
    case 'driver_t_plus_7':
      return {
        subject: `7 hari lewat — last reminder renew City Rider`,
        html: renderEmail({
          heading: 'Last reminder',
          preheader: 'Renew dalam 24 jam atau profilmu mungkin di-purge dari sistem.',
          bodyHtml: `<p>Sudah 7 hari sejak subscription kamu habis (${dueLabel}). Reminder terakhir — renew dalam 24 jam supaya profilmu nggak di-archive dari sistem retention (kebijakan PDP / UU 27/2022).</p>`,
          ctaUrl: args.renewUrl,
          ctaLabel: 'Renew sekarang',
        }),
      }
    case 'pending_intent_stuck':
      return {
        subject: `Pembayaran City Rider belum selesai`,
        html: renderEmail({
          heading: 'Lanjutkan pembayaran',
          preheader: 'Kamu membuka Snap tapi belum menyelesaikan pembayaran.',
          bodyHtml: `<p>Hai! Sepertinya kamu mulai pembayaran City Rider (${planLabel}) pada ${dueLabel} tapi belum selesai. Mulai ulang pembayaran di bawah ini — Snap support QRIS, GoPay, OVO, ShopeePay, kartu kredit, dan VA bank besar.</p>`,
          ctaUrl: args.renewUrl,
          ctaLabel: 'Lanjut bayar',
        }),
      }
  }
}
