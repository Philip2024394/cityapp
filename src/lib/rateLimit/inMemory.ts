// ============================================================================
// In-process per-key rate limiter (ring-buffer of timestamps).
// ----------------------------------------------------------------------------
// Tracks recent call timestamps for each key inside a single Node/Lambda
// process. On every call we prune timestamps older than `windowMs` and
// then check whether the remaining count is under `max`.
//
// CAVEAT: in-memory limits don't survive cold starts and don't span
// Vercel instances. They're a meaningful spam brake for a single hot
// lambda but are NOT a hard guarantee. For real protection at scale,
// swap this for Upstash Redis / Vercel KV — that's a ~5 line change at
// the call sites.
// ============================================================================

type Opts = { windowMs: number; max: number }
type Result = { allowed: boolean; retryAfterSec: number }

const MAX_KEYS = 10_000

const store = new Map<string, number[]>()

export function rateLimit(key: string, opts: { windowMs: number; max: number }): { allowed: boolean; retryAfterSec: number } {
  const { windowMs, max } = opts
  const now = Date.now()
  const cutoff = now - windowMs

  const existing = store.get(key)
  const pruned: number[] = []
  if (existing) {
    for (let i = 0; i < existing.length; i++) {
      const t = existing[i]
      if (t > cutoff) pruned.push(t)
    }
  }

  if (pruned.length >= max) {
    const oldest = pruned[0]
    const retryAfterMs = Math.max(0, oldest + windowMs - now)
    // Re-insert pruned list so we don't lose timestamps on a blocked hit.
    store.delete(key)
    store.set(key, pruned)
    enforceCap()
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }

  pruned.push(now)
  // Re-insert to bump LRU order (Map preserves insertion order).
  store.delete(key)
  store.set(key, pruned)
  enforceCap()
  return { allowed: true, retryAfterSec: 0 }
}

function enforceCap(): void {
  while (store.size > MAX_KEYS) {
    const firstKey = store.keys().next().value
    if (firstKey === undefined) break
    store.delete(firstKey)
  }
}

// Re-export type aliases for callers that want them.
export type { Opts as RateLimitOpts, Result as RateLimitResult }
