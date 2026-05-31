// ============================================================================
// Partner attribution capture (client-side localStorage)
// ----------------------------------------------------------------------------
// Hotels / villas distribute a QR code that opens citydrivers.id/p/[slug].
// On that page we stash { slug, anonId, capturedAt } in localStorage for
// 30 days. When the guest taps Contact on a driver profile, /api/contact/ping
// reads this attribution and writes a partner_bookings row crediting the
// partner with the 8% commission owed by the driver.
//
// 30-day window (founder decision 2026-05-31) captures repeat trips during
// a typical multi-day Bali / Yogya tourist stay and hotel-arranged regulars
// who book several times. Fraud surface is kept in check by rate limits at
// the driver-confirmed booking endpoint, not by shrinking the window.
// ============================================================================

const STORAGE_KEY = 'cityrider:partner_attribution'
const TTL_MS = 30 * 24 * 60 * 60 * 1000  // 30 days

type Stored = { slug: string; anonId: string; capturedAt: number }

function generateAnonId(): string {
  // 12 bytes of entropy is plenty for the 24-hour window we care about.
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Reads ?partner=slug from current URL and stores it (idempotent). */
export function capturePartnerFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const raw = (params.get('partner') || '').trim().toLowerCase()
  if (!raw || raw.length > 64) return getStoredPartnerSlug()
  if (!/^[a-z0-9_-]+$/.test(raw)) return getStoredPartnerSlug()

  try {
    const existing = getStoredPartnerPayload()
    // Same partner within window? Keep the existing anonId so re-scans don't
    // fragment attribution across multiple anonymous "sessions".
    if (existing?.slug === raw) return raw
    const payload: Stored = { slug: raw, anonId: generateAnonId(), capturedAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return raw
  } catch {
    return null
  }
}

/** Returns the slug if still within the 24h window. */
export function getStoredPartnerSlug(): string | null {
  const p = getStoredPartnerPayload()
  return p?.slug ?? null
}

/** Returns full payload (slug + anonId) for sending to /api/contact/ping. */
export function getStoredPartnerPayload(): Stored | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Stored
    if (!p?.slug || Date.now() - p.capturedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return p
  } catch {
    return null
  }
}

/** Clears attribution. Called when guest explicitly switches venue or
 *  finishes a booking (so the next ride re-prompts). */
export function clearStoredPartner(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* noop */ }
}
