// ============================================================================
// In-memory per-key rate limiter.
// ----------------------------------------------------------------------------
// Sliding-window counter keyed by an arbitrary string (user id, IP, etc.).
// Returns { ok: boolean, remaining: number, resetMs: number }.
//
// Sized for an individual serverless instance — Vercel may spawn multiple
// concurrent instances, so the effective ceiling is `limit × instances`.
// Good enough to stop a single client flooding; for cross-instance
// guarantees you'd swap this out for a Redis-backed counter.
//
// CLEANUP: the Map grows unbounded if we never prune. Every 200th call
// we sweep expired buckets — cheap (amortised O(1)) and keeps memory in
// check on a long-lived Lambda.
// ============================================================================

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
let opCount = 0

function sweep(now: number) {
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key)
  }
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  resetMs: number
}

/**
 * Returns ok=true if the call is within the limit, false if exceeded.
 *
 * @param key       Stable identity (e.g. `loc:<user.id>` or `pt:<user.id>`)
 * @param limit     Max calls allowed in the window
 * @param windowMs  Window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()

  // Amortised cleanup — every 200 calls sweep expired buckets.
  if (++opCount % 200 === 0) sweep(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, resetMs: windowMs }
  }

  existing.count++
  const remaining = limit - existing.count
  const resetMs = existing.resetAt - now
  if (existing.count > limit) {
    return { ok: false, remaining: 0, resetMs }
  }
  return { ok: true, remaining, resetMs }
}
