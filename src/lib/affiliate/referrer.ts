// ============================================================================
// Affiliate referrer capture + retrieve
// ----------------------------------------------------------------------------
// Customers arrive at City Rider via streetlocal affiliate links shaped
// like `https://cityrider.id/?ref=AB12CD` (or `/signup?ref=...`). We
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

type Stored = { code: string; capturedAt: number }

/** Read ?ref= from the current URL (if any) and persist it. Idempotent. */
export function captureReferrerFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const code = (params.get('ref') || '').trim().toUpperCase()
  if (!code || code.length > 24) return getStoredReferrer()
  // Light validation: alphanumeric only
  if (!/^[A-Z0-9_-]+$/.test(code)) return getStoredReferrer()
  try {
    const payload: Stored = { code, capturedAt: Date.now() }
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
