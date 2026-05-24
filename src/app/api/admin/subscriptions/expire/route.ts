import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'

// ============================================================================
// GET /api/admin/subscriptions/expire?secret=$CRON_SECRET
// ----------------------------------------------------------------------------
// Daily Vercel cron. Two passes:
//
//   1. Flip subscriptions to past_due where the billing window has
//      lapsed (trial_ends_at OR current_period_end passed without
//      renewal). Cheaper to do this in one nightly sweep than to gate
//      every read with a "is this still in window?" check.
//
//   2. For all drivers whose subscription is now past_due or canceled
//      AND availability != 'offline', flip availability to 'offline'.
//      This is the load-bearing rule for "expired drivers don't show
//      up on the marketplace" — the queries already filter past_due,
//      but a stale availability='online' would let stragglers slip
//      through. Belt + braces.
//
// Returns a JSON summary of rows touched, suitable for cron logs.
// ============================================================================
export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return runExpiry()
}

export async function POST(req: Request) {
  // Admin-trigger path so the /admin UI can also fire this manually.
  // Same secret gate — keeps things simple, no separate auth path.
  return GET(req)
}

async function runExpiry() {
  const admin = getAdminSupabase()
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const now = new Date().toISOString()

  // Pass 1a: trial → past_due
  const { data: trialsExpired, error: e1 } = await admin
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('status', 'trial')
    .lt('trial_ends_at', now)
    .select('driver_id')
  if (e1) {
    return NextResponse.json({ error: e1.message, step: 'trial' }, { status: 500 })
  }

  // Pass 1b: active → past_due
  const { data: activeExpired, error: e2 } = await admin
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('status', 'active')
    .lt('current_period_end', now)
    .select('driver_id')
  if (e2) {
    return NextResponse.json({ error: e2.message, step: 'active' }, { status: 500 })
  }

  // Pass 2: find all drivers with billing problems and online-ish
  // availability, flip them offline. Done as two reads + one update
  // batch rather than a single UPDATE…FROM because supabase-js doesn't
  // expose joined updates cleanly.
  const { data: lapsed, error: e3 } = await admin
    .from('subscriptions')
    .select('driver_id')
    .in('status', ['past_due', 'canceled'])
  if (e3) {
    return NextResponse.json({ error: e3.message, step: 'lapsed-fetch' }, { status: 500 })
  }
  const lapsedIds = (lapsed ?? []).map((r) => r.driver_id).filter(Boolean)

  let flippedOffline = 0
  if (lapsedIds.length > 0) {
    const { data: flipped, error: e4 } = await admin
      .from('drivers')
      .update({ availability: 'offline' })
      .in('user_id', lapsedIds)
      .in('availability', ['online', 'busy'])
      .select('user_id')
    if (e4) {
      return NextResponse.json({ error: e4.message, step: 'flip-offline' }, { status: 500 })
    }
    flippedOffline = (flipped ?? []).length
  }

  // Pass 3 — sweep the 5 service-provider verticals.
  // Schema across the 5 is identical: subscription_status (trial/active/
  // expired/cancelled), trial_ends_at, paid_until, availability. Logic:
  //   • trial   + trial_ends_at < now() AND paid_until null/past →
  //                                   subscription_status='expired'
  //   • active  + paid_until < now()                                 →
  //                                   subscription_status='expired'
  //   • any expired/cancelled with availability ∈ {online,busy} →
  //                                   availability='offline'
  const PROVIDER_TABLES = [
    'massage_providers',
    'beautician_providers',
    'laundry_providers',
    'handyman_providers',
    'home_clean_providers',
  ] as const
  const providerCounts: Record<string, { trial_expired: number; paid_expired: number; flipped_offline: number }> = {}
  for (const table of PROVIDER_TABLES) {
    // 3a — trial lapsed (no successful payment): subscription_status='expired'
    const { data: trialFlip } = await admin
      .from(table)
      .update({ subscription_status: 'expired' })
      .eq('subscription_status', 'trial')
      .lt('trial_ends_at', now)
      .or('paid_until.is.null,paid_until.lt.' + now)
      .select('id')

    // 3b — paid window expired: subscription_status='expired'
    const { data: paidFlip } = await admin
      .from(table)
      .update({ subscription_status: 'expired' })
      .eq('subscription_status', 'active')
      .lt('paid_until', now)
      .select('id')

    // 3c — flip availability offline for any expired/cancelled rows
    // that are still online/busy. Matches the driver-side belt+braces
    // logic above so an expired provider can't keep appearing online.
    const { data: avFlip } = await admin
      .from(table)
      .update({ availability: 'offline' })
      .in('subscription_status', ['expired', 'cancelled'])
      .in('availability', ['online', 'busy'])
      .select('id')

    providerCounts[table] = {
      trial_expired:   (trialFlip ?? []).length,
      paid_expired:    (paidFlip  ?? []).length,
      flipped_offline: (avFlip    ?? []).length,
    }
  }

  return NextResponse.json({
    ok: true,
    ran_at: now,
    trial_expired: (trialsExpired ?? []).length,
    active_expired: (activeExpired ?? []).length,
    drivers_flipped_offline: flippedOffline,
    providers: providerCounts,
  })
}
