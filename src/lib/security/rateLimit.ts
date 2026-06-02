// ============================================================================
// In-memory per-key rate limiter.
// ----------------------------------------------------------------------------
// Sliding-window counter keyed by an arbitrary string (user id, IP, etc.).
// Returns { ok: boolean, remaining: number, resetMs: number }.
//
// Sized for an individual serverless instance — Cloudflare Workers may
// spawn multiple concurrent isolates, so the effective ceiling is
// `limit × instances`. Good enough to stop a single client flooding; for
// cross-instance guarantees you'd swap this out for a Durable-Object
// backed counter.
//
// CLEANUP: the Map grows unbounded if we never prune. Every 200th call
// we sweep expired buckets — cheap (amortised O(1)) and keeps memory in
// check on a long-lived isolate.
//
// BREACH ALERTING: a single 429 isn't interesting (most are legit clients
// hitting a refresh button). A key that *sustains* breaches across a
// window IS interesting — that's either a bug in a client doing tight
// retry or a probe trying to enumerate. fireBreachAlert() rises only
// after a threshold of breaches for the same key within a window, with
// a per-key cooldown so we never spam ops with the same key.
// ============================================================================

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
let opCount = 0

// Breach tracking — separate from rate buckets so a breach record
// outlives the rate window (the rate window resets every N seconds; we
// want to count breaches over a longer span to detect sustained abuse).
type Breach = {
  count: number          // breaches in current alert window
  windowStartedAt: number
  lastAlertAt: number    // 0 if never alerted
}
const breaches = new Map<string, Breach>()

const BREACH_WINDOW_MS = 60_000           // 1 min for accumulating breaches
const BREACH_THRESHOLD = 20               // 20 breaches in 1 min → suspicious
const BREACH_ALERT_COOLDOWN_MS = 15 * 60_000  // 15 min cooldown per key

function sweep(now: number) {
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key)
  }
  // Also expire stale breach records — anything whose window has closed
  // AND that has never alerted (or alerted long ago) can be released.
  for (const [key, b] of breaches) {
    const windowExpired = now - b.windowStartedAt > BREACH_WINDOW_MS
    const cooldownExpired = b.lastAlertAt > 0 && now - b.lastAlertAt > BREACH_ALERT_COOLDOWN_MS
    if (windowExpired && (b.lastAlertAt === 0 || cooldownExpired)) breaches.delete(key)
  }
}

// fireBreachAlert — best-effort. Spawns a fire-and-forget dynamic import
// of @/lib/ops/alert so rateLimit() can be called from hot paths without
// pulling Resend/Supabase into the limiter's import graph at every call.
function fireBreachAlert(key: string, limit: number, windowMs: number, count: number) {
  void (async () => {
    try {
      const { fireAlertServer } = await import('@/lib/ops/alert')
      await fireAlertServer({
        severity: 'warning',
        source: 'rate-limit',
        title: `Rate limit sustained breach for ${key.slice(0, 64)}`,
        detail: `${count} breaches within ${BREACH_WINDOW_MS / 1000}s. Configured limit: ${limit}/${windowMs}ms.`,
        suggested_fix:
          'Check src/lib/security/rateLimit.ts callers for the key prefix. If the prefix is `ip:` consider IP-based abuse; if it is `user:` look for a stuck client retry loop.',
        meta: { key, limit, window_ms: windowMs, breach_count: count },
      })
    } catch { /* swallow — never break the request path */ }
  })()
}

function recordBreach(key: string, limit: number, windowMs: number, now: number) {
  let b = breaches.get(key)
  if (!b || now - b.windowStartedAt > BREACH_WINDOW_MS) {
    b = { count: 0, windowStartedAt: now, lastAlertAt: b?.lastAlertAt ?? 0 }
    breaches.set(key, b)
  }
  b.count += 1

  if (b.count >= BREACH_THRESHOLD) {
    const inCooldown = b.lastAlertAt > 0 && now - b.lastAlertAt < BREACH_ALERT_COOLDOWN_MS
    if (!inCooldown) {
      b.lastAlertAt = now
      fireBreachAlert(key, limit, windowMs, b.count)
    }
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
    recordBreach(key, limit, windowMs, now)
    return { ok: false, remaining: 0, resetMs }
  }
  return { ok: true, remaining, resetMs }
}
