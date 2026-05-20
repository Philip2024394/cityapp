import { NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { computeB2bScore, type Tier } from '@/lib/scoring/b2bScore'

// ============================================================================
// GET /api/admin/b2b/recompute-scores?secret=$CRON_SECRET
// ----------------------------------------------------------------------------
// Nightly Vercel cron — recomputes b2b_score + b2b_tier for every driver
// who has opted into business contracts.
//
// Algorithm:
//   1. Fetch all drivers where business_contract_enabled = true
//   2. Per driver: compute base score + tier via computeB2bScore() — uses
//      activity, rating, trips, tenure, subscription health
//   3. Per city: rank by score desc, promote the top 10 to 'top' tier
//      (anyone else who scored ≥70 is demoted to 'standard' since they
//      didn't make the city's top-10 cut)
//   4. Batch upsert b2b_score + b2b_tier + b2b_score_updated_at
//
// Idempotent — safe to call multiple times per day if a driver toggles
// settings and you want their tier to refresh.
// ============================================================================

const TOP_PER_CITY = 10

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return runRecompute()
}

export async function POST(req: Request) {
  // Admin manual trigger — same gate.
  return GET(req)
}

type DriverRow = {
  user_id: string
  city: string | null
  last_active_at: string | null
  rating: number | null
  trips_count: number | null
  created_at: string
  business_enabled_at: string | null
  // joined subscription
  subscriptions?: { status: 'trial' | 'active' | 'past_due' | 'canceled' | null } | null
}

async function runRecompute() {
  const admin = getAdminSupabase()
  if (!admin) return NextResponse.json({ error: 'Server not configured' }, { status: 500 })

  // Reviews count proxy: drivers.trips_count is a stand-in (we don't
  // have a separate reviews_count column on drivers). Most drivers
  // who've done N trips have collected reviews on roughly the same
  // order of magnitude. When the reviews table grows enough to justify
  // a dedicated counter, add it here.
  const { data: drivers, error } = await admin
    .from('drivers')
    .select(
      'user_id, city, last_active_at, rating, trips_count, created_at, business_enabled_at, ' +
      'subscriptions(status)',
    )
    .eq('business_contract_enabled', true)
    .eq('status', 'active')
  if (error) return NextResponse.json({ error: error.message, step: 'fetch' }, { status: 500 })

  const rows = (drivers ?? []) as unknown as DriverRow[]

  // ─── Pass 1: compute base score + base tier per driver ───────────────
  type Scored = {
    user_id: string
    city: string | null
    score: number
    tier: Tier
  }
  const scored: Scored[] = rows.map((r) => {
    const sub = Array.isArray(r.subscriptions) ? r.subscriptions[0] : r.subscriptions
    const res = computeB2bScore({
      lastActiveAt:        r.last_active_at,
      rating:              r.rating,
      reviewsCount:        r.trips_count ?? 0,   // proxy until reviews_count column exists
      tripsCount:          r.trips_count ?? 0,
      createdAt:           r.created_at,
      businessEnabledAt:   r.business_enabled_at,
      subscriptionStatus:  sub?.status ?? null,
    })
    return { user_id: r.user_id, city: r.city, score: res.score, tier: res.tier }
  })

  // ─── Pass 2: city-level top-10 promotion / demotion ─────────────────
  // Drivers with base tier 'top' must also be in the top-10 of their
  // city to keep that tier. If they didn't make the city cut, demote
  // to 'standard' so the 'top' badge stays meaningful.
  const byCity = new Map<string, Scored[]>()
  for (const s of scored) {
    const key = s.city ?? '__unknown__'
    const bucket = byCity.get(key) ?? []
    bucket.push(s)
    byCity.set(key, bucket)
  }
  for (const bucket of byCity.values()) {
    bucket.sort((a, b) => b.score - a.score)
    bucket.forEach((d, idx) => {
      if (d.tier === 'top' && idx >= TOP_PER_CITY) {
        d.tier = 'standard'
      }
    })
  }

  // ─── Pass 3: batch upsert ───────────────────────────────────────────
  const updatedAt = new Date().toISOString()
  const tierCounts = { top: 0, standard: 0, hidden: 0, removed: 0 }
  for (const s of scored) {
    tierCounts[s.tier]++
  }

  // Supabase doesn't have an UPDATE…IN…FROM for arbitrary value pairs.
  // Do it row-by-row but in parallel (drivers count is small — ~50-500
  // even at scale, well under any rate limit).
  await Promise.all(scored.map((s) =>
    admin
      .from('drivers')
      .update({ b2b_score: s.score, b2b_tier: s.tier, b2b_score_updated_at: updatedAt })
      .eq('user_id', s.user_id),
  ))

  return NextResponse.json({
    ok: true,
    ran_at: updatedAt,
    drivers_scored: scored.length,
    tier_counts: tierCounts,
    cities_ranked: byCity.size,
  })
}
