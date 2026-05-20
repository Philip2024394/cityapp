// ============================================================================
// Driver presence helpers.
// ----------------------------------------------------------------------------
// Pure functions that turn last_active_at / session_started_at into the
// short human strings the marketplace + pending screens use ("Active now",
// "Active 4m ago", "Online 2h").
//
// All inputs are driver-self telemetry (location ping + availability
// toggle). No customer-event data is read here.
// ============================================================================

/** Driver is "Active now" if they pinged in the last 60 seconds. */
const ACTIVE_NOW_MS = 60_000
/** Beyond this, the "Active Xm ago" string switches to "Active Xh ago".
 *  Anything older than ACTIVE_STALE_MS reads as "Active recently". */
const ACTIVE_STALE_MS = 60 * 60_000

export type PresenceTier = 'active_now' | 'recent' | 'idle' | 'stale' | 'unknown'

export function presenceTier(lastSeenAt: string | null | undefined, nowMs = Date.now()): PresenceTier {
  if (!lastSeenAt) return 'unknown'
  const t = Date.parse(lastSeenAt)
  if (!Number.isFinite(t)) return 'unknown'
  const age = nowMs - t
  if (age < ACTIVE_NOW_MS) return 'active_now'
  if (age < 5 * 60_000) return 'recent'           // 1–5 min
  if (age < ACTIVE_STALE_MS) return 'idle'        // 5–60 min
  return 'stale'                                   // 60+ min
}

/** Short human label, locale-agnostic numerals. Renders next to a presence
 *  dot. "Active now", "Active 3m ago", "Active 2h ago", "Active recently". */
export function presenceLabel(lastSeenAt: string | null | undefined, nowMs = Date.now()): string {
  const tier = presenceTier(lastSeenAt, nowMs)
  if (tier === 'unknown') return 'Active recently'
  if (tier === 'active_now') return 'Active now'
  const ageMs = nowMs - Date.parse(lastSeenAt as string)
  if (tier === 'recent') {
    const m = Math.max(1, Math.floor(ageMs / 60_000))
    return `Active ${m}m ago`
  }
  if (tier === 'idle') {
    const m = Math.floor(ageMs / 60_000)
    return `Active ${m}m ago`
  }
  const h = Math.floor(ageMs / 60 / 60_000)
  return h >= 1 ? `Active ${h}h ago` : 'Active recently'
}

/** "Online 2h" / "Online 14m" / null if session not started. */
export function sessionLengthLabel(sessionStartedAt: string | null | undefined, nowMs = Date.now()): string | null {
  if (!sessionStartedAt) return null
  const t = Date.parse(sessionStartedAt)
  if (!Number.isFinite(t)) return null
  const age = nowMs - t
  if (age < 60_000) return null                    // skip the noisy first minute
  if (age < 60 * 60_000) return `Online ${Math.floor(age / 60_000)}m`
  return `Online ${Math.floor(age / 60 / 60_000)}h`
}

/** Tier colour for the presence dot. Keeps the marketplace + pending
 *  screens consistent. */
export function presenceDotColor(tier: PresenceTier): string {
  switch (tier) {
    case 'active_now': return '#22C55E'
    case 'recent':     return '#22C55E'
    case 'idle':       return '#F59E0B'
    case 'stale':      return '#94A3B8'
    case 'unknown':    return '#94A3B8'
  }
}

// ============================================================================
// Location freshness — distinct from presence freshness.
// ----------------------------------------------------------------------------
// Browsers cannot ping GPS while the tab is backgrounded, so a driver's
// current_lat/lng can be stale even while last_active_at is fresh (they
// re-foregrounded the tab to chat but the GPS watcher hadn't fired a new
// position yet). Conservative cutoff: if the location is older than 15
// minutes we refuse to render "X km away" — it would be a lie. The UI
// falls back to "Based in {area}" instead.
//
// Once the Capacitor wrapper ships, background GPS will keep this fresh
// indefinitely and the fallback path becomes rare.
// ============================================================================
const LOCATION_FRESH_MS = 15 * 60_000

export function isLocationFresh(updatedAt: string | null | undefined, nowMs = Date.now()): boolean {
  if (!updatedAt) return false
  const t = Date.parse(updatedAt)
  if (!Number.isFinite(t)) return false
  return nowMs - t < LOCATION_FRESH_MS
}
