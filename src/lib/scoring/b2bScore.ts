// ============================================================================
// B2B reliability score — pure-function library.
// ----------------------------------------------------------------------------
// Computes a 0-100 score per driver from data we already collect.
// Pure functions only — no DB, no fetch, no side effects. The cron route
// (/api/admin/b2b/recompute-scores) wraps these with the Supabase
// upsert layer.
//
// Score breakdown (sums to 100):
//   30  Activity recency — last_active_at proximity (best proxy for
//       "weekly online hours" we have without a session log)
//   25  Customer rating (gated on min 5 reviews — defaults to mid score
//       to avoid penalising new drivers for one early review)
//   15  Listing freshness — business_enabled_at + active in last 7 days
//   15  Trips count — log-scaled
//   10  Tenure — log-scaled from created_at
//    5  Subscription health — 'active'/'trial' = 5, else 0
//
// Tier assignment AFTER score:
//   - Removed: rating < 3.5 (with ≥5 reviews), or active >7 days ago,
//              or subscription past_due/canceled, or score < 30
//   - Hidden:  score 30-44
//   - Standard: score 45-69
//   - Top:     score ≥70  (further constrained to top-10 per city by the cron)
//
// Grace period: drivers within 30 days of business_enabled_at can't be
// placed in Removed tier (capped at Standard at worst). Score is still
// computed honestly so they see the breakdown.
// ============================================================================

export type Tier = 'top' | 'standard' | 'hidden' | 'removed'

export type ScoreInput = {
  /** Driver's `last_active_at` from their location ping / availability toggle. */
  lastActiveAt: Date | string | null
  /** Customer rating 1-5 or null if no reviews. */
  rating: number | null
  /** Total reviews — gates the rating contribution. */
  reviewsCount: number
  /** Total completed trips (proxy for volume of validated work). */
  tripsCount: number
  /** When the driver signed up. */
  createdAt: Date | string
  /** When the driver first enabled the B2B toggle. Used for grace period. */
  businessEnabledAt: Date | string | null
  /** 'trial' / 'active' / 'past_due' / 'canceled'. */
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled' | null
}

export type ScoreBreakdown = {
  activity:        number   // 0..30
  rating:          number   // 0..25
  freshness:       number   // 0..15
  trips:           number   // 0..15
  tenure:          number   // 0..10
  subscription:    number   // 0..5
}

export type ScoreResult = {
  score: number
  tier: Tier
  inGracePeriod: boolean
  breakdown: ScoreBreakdown
  /** Drivers + admins see these — used for the "how to climb" hints. */
  notes: string[]
}

const NOW = () => new Date()
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const GRACE_PERIOD_DAYS = 30
const MIN_REVIEWS_FOR_RATING = 5

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(v)
  return Number.isFinite(d.getTime()) ? d : null
}

// ─── Component scorers (each returns 0..maxPoints) ───────────────────

/** Activity recency — sliding scale from "right now" → 30 to "7+ days
 *  ago" → 0. Linear within bands so a driver who pings every 6 hours
 *  doesn't lose all credit. */
function scoreActivity(lastActiveAt: Date | null): number {
  if (!lastActiveAt) return 0
  const age = NOW().getTime() - lastActiveAt.getTime()
  if (age < HOUR)      return 30
  if (age < 6 * HOUR)  return 25
  if (age < DAY)       return 20
  if (age < 3 * DAY)   return 12
  if (age < 7 * DAY)   return 5
  return 0
}

/** Customer rating — gated on min review count. New drivers get a neutral
 *  baseline (60% credit = 15/25) so a single early review can't tank them. */
function scoreRating(rating: number | null, reviewsCount: number): number {
  if (reviewsCount < MIN_REVIEWS_FOR_RATING) return 15  // neutral baseline
  if (rating == null) return 15
  // 1.0 → 0, 3.0 → 12, 5.0 → 25 (linear)
  const clamped = Math.max(1, Math.min(5, rating))
  return Math.round(((clamped - 1) / 4) * 25)
}

/** Listing freshness — rewards drivers who keep checking in. */
function scoreFreshness(lastActiveAt: Date | null, businessEnabledAt: Date | null): number {
  if (!businessEnabledAt) return 0
  if (!lastActiveAt) return 0
  const lastAge = NOW().getTime() - lastActiveAt.getTime()
  if (lastAge < DAY)       return 15
  if (lastAge < 3 * DAY)   return 10
  if (lastAge < 7 * DAY)   return 5
  return 0
}

/** Trips count — log-scaled so the first 20 trips matter most. */
function scoreTrips(tripsCount: number): number {
  if (tripsCount <= 0) return 0
  if (tripsCount < 5)   return 3
  if (tripsCount < 20)  return 8
  if (tripsCount < 50)  return 12
  if (tripsCount < 100) return 14
  return 15
}

/** Tenure — long-time drivers get loyalty bonus. */
function scoreTenure(createdAt: Date): number {
  const age = NOW().getTime() - createdAt.getTime()
  if (age < 30 * DAY)  return 2
  if (age < 90 * DAY)  return 5
  if (age < 180 * DAY) return 7
  return 10
}

/** Subscription health — past_due/canceled drivers don't belong on a
 *  premium B2B surface. Even 5% pulls them down meaningfully. */
function scoreSubscription(status: ScoreInput['subscriptionStatus']): number {
  if (status === 'active' || status === 'trial') return 5
  return 0
}

// ─── Main ────────────────────────────────────────────────────────────

export function computeB2bScore(input: ScoreInput): ScoreResult {
  const lastActiveAt = toDate(input.lastActiveAt)
  const createdAt = toDate(input.createdAt) ?? NOW()
  const businessEnabledAt = toDate(input.businessEnabledAt)

  const breakdown: ScoreBreakdown = {
    activity:     scoreActivity(lastActiveAt),
    rating:       scoreRating(input.rating, input.reviewsCount),
    freshness:    scoreFreshness(lastActiveAt, businessEnabledAt),
    trips:        scoreTrips(input.tripsCount),
    tenure:       scoreTenure(createdAt),
    subscription: scoreSubscription(input.subscriptionStatus),
  }

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0)

  // Grace period check
  const inGracePeriod =
    businessEnabledAt != null &&
    NOW().getTime() - businessEnabledAt.getTime() < GRACE_PERIOD_DAYS * DAY

  // Removal criteria (highest-priority gates first)
  const isLowRating = input.reviewsCount >= MIN_REVIEWS_FOR_RATING && (input.rating ?? 0) < 3.5
  const isStale = !lastActiveAt || NOW().getTime() - lastActiveAt.getTime() > 7 * DAY
  const isLapsedSubscription = input.subscriptionStatus === 'past_due' || input.subscriptionStatus === 'canceled'

  let tier: Tier
  if (isLapsedSubscription) {
    tier = 'removed'                      // billing-driven removal, never grace-excluded
  } else if (isLowRating || isStale) {
    tier = inGracePeriod ? 'standard' : 'removed'
  } else if (score < 30) {
    tier = inGracePeriod ? 'standard' : 'hidden'
  } else if (score < 45) {
    tier = 'hidden'
  } else if (score < 70) {
    tier = 'standard'
  } else {
    tier = 'top'                          // cron may further demote to standard if not in top-10 of city
  }

  // "How to climb" hints — what's holding the driver back, ordered by
  // biggest swing they could make.
  const notes: string[] = []
  if (breakdown.activity < 20) {
    notes.push('Stay online more often — being active in the last day adds up to 20 points')
  }
  if (input.reviewsCount < MIN_REVIEWS_FOR_RATING) {
    notes.push(`Collect ${MIN_REVIEWS_FOR_RATING - input.reviewsCount} more review${MIN_REVIEWS_FOR_RATING - input.reviewsCount === 1 ? '' : 's'} to unlock the full rating component`)
  } else if (breakdown.rating < 20) {
    notes.push(`Lift your rating — current ${input.rating?.toFixed(1) ?? '—'}/5 gives ${breakdown.rating}/25`)
  }
  if (breakdown.freshness < 15) {
    notes.push('Re-open the app daily to keep your listing fresh')
  }
  if (breakdown.trips < 12 && !inGracePeriod) {
    notes.push('Complete more trips — the trip-count component scales fast at low volumes')
  }
  if (isLapsedSubscription) {
    notes.push('Renew your subscription to be eligible — past-due drivers are removed from the B2B page')
  }

  return { score, tier, inGracePeriod, breakdown, notes }
}
