// ============================================================================
// Signup draft persistence — localStorage adapter
// ----------------------------------------------------------------------------
// Indonesian Chrome on a 2GB phone aggressively kills backgrounded tabs.
// A driver switching to WhatsApp to copy a slug, or to their camera to grab
// a vehicle photo URL, would otherwise wipe steps 2–6 of the signup form.
// This helper writes form state to localStorage on every change and hydrates
// it on mount if the draft is fresh.
//
// Same posture as /onboarding/page.tsx (bike) — proven pattern, just
// factored out so car/truck/jeep/bus stay in sync.
//
// SECURITY: NEVER persist the password from Step 1. Callers should only
// pass post-auth form state into saveDraft(). The draft persists name +
// vehicle + rates + payment URLs only.
// ============================================================================

const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000   // 24 hours

export type DraftEnvelope<T> = {
  savedAt: number
  payload: T
}

/** Read a fresh draft from localStorage. Returns null if missing, corrupt,
 *  or expired (>24h old). Caller should populate state fields from the
 *  payload manually so type-narrowing works cleanly. */
export function loadDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const d = JSON.parse(raw) as DraftEnvelope<T> | null
    if (!d || typeof d.savedAt !== 'number') return null
    if (Date.now() - d.savedAt > DRAFT_MAX_AGE_MS) {
      // Expired — clean up so it doesn't take quota space.
      try { window.localStorage.removeItem(key) } catch { /* ignore */ }
      return null
    }
    return d.payload ?? null
  } catch {
    // Corrupt JSON or quota issue — clean up + return null.
    try { window.localStorage.removeItem(key) } catch { /* ignore */ }
    return null
  }
}

/** Write a draft envelope to localStorage. Stamps a savedAt timestamp so
 *  future hydration can check freshness. Fire-and-forget — quota failures
 *  are silently swallowed (better to lose the draft than crash the form). */
export function saveDraft<T>(key: string, payload: T): void {
  if (typeof window === 'undefined') return
  try {
    const env: DraftEnvelope<T> = { savedAt: Date.now(), payload }
    window.localStorage.setItem(key, JSON.stringify(env))
  } catch {
    /* quota / unavailable — best-effort */
  }
}

/** Clear a draft on successful signup so the next visit lands on a clean
 *  form. Safe to call even when the key doesn't exist. */
export function clearDraft(key: string): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(key) } catch { /* ignore */ }
}

// Keys per vehicle vertical. Bumping the suffix (v1 → v2) invalidates all
// stored drafts on the next visit — use that when adding/removing fields
// from the payload shape if you don't want to maintain back-compat.
export const SIGNUP_DRAFT_KEYS = {
  car:   'cd.signup.car.draft.v1',
  truck: 'cd.signup.truck.draft.v1',
  jeep:  'cd.signup.jeep.draft.v1',
  bus:   'cd.signup.bus.draft.v1',
} as const
