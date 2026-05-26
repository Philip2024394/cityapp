// ============================================================================
// Affiliate referrer capture + retrieve
// ----------------------------------------------------------------------------
// Customers arrive at IndoCity via streetlocal affiliate links shaped
// like `https://indocity.id/?ref=AB12CD` (or `/signup?ref=...`). We
// capture that code on first page load and persist it in localStorage
// for 30 days, so even if the customer browses around before signing
// up, the agent code rides along to the eventual driver row.
//
// On /onboarding completion, the agent code goes onto the new drivers
// row as `referrer_agent_code`. A trigger in migration 0016 then
// auto-creates the matching affiliate_referrals entry.
// ============================================================================

const STORAGE_KEY = 'cityrider:referrer_agent_code'
const TTL_MS = 30 * 24 * 60 * 60 * 1000  // 30 days

// Stored shape now carries BOTH a normalised uppercase form (for agent
// codes) AND the raw input (for driver-to-driver referrals where the code
// is a lowercase slug). The two channels share the same ?ref= URL
// parameter and are disambiguated at the API by trying each in turn.
type Stored = { code: string; raw?: string; capturedAt: number }

/** Read ?ref= from the current URL (if any) and persist it. Idempotent. */
export function captureReferrerFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const raw = (params.get('ref') || '').trim()
  if (!raw || raw.length > 48) return getStoredReferrer()
  const code = raw.toUpperCase()
  // Light validation: alphanumeric, hyphen, underscore. Same charset as
  // both agent codes (uppercase) and driver slugs (lowercase + hyphen).
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return getStoredReferrer()
  try {
    const payload: Stored = { code, raw, capturedAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // localStorage blocked — fall through
  }
  return code
}

/** Return the stored referrer code if still fresh; clear and return null otherwise. */
export function getStoredReferrer(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as Stored
    if (!payload?.code) return null
    if (Date.now() - payload.capturedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return payload.code
  } catch {
    return null
  }
}

/** Called after onboarding completes — remove the cookie since attribution is locked. */
export function clearStoredReferrer(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
}

/** Return the RAW captured referrer (case preserved). Used to resolve a
 *  driver-to-driver referral (`drivers.referral_code` is lowercase). */
export function getStoredReferrerRaw(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as Stored
    if (!payload?.code) return null
    if (Date.now() - payload.capturedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return payload.raw ?? payload.code.toLowerCase()
  } catch {
    return null
  }
}
