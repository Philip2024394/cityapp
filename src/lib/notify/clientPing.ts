'use client'

import { getStoredPartnerSlug } from '@/lib/partners/attribution'

// ============================================================================
// pingDriverContact — fire the /api/contact/ping endpoint just BEFORE
// wa.me is opened. Non-blocking: uses sendBeacon so the request survives
// the immediate window.open() that follows, and the customer's WhatsApp
// launch is never delayed.
//
// Anon ID: a stable per-browser ID stored in localStorage. Lets the
// server rate-limit duplicate Contact taps on the same driver.
//
// Partner attribution: any active partner slug in localStorage (captured
// from a hotel/villa QR scan via /p/[slug]) is auto-included. Callers
// that have a fare estimate handy can pass it via `details` so the
// server can write the partner_bookings row and the driver's push
// surfaces the commission amount.
// ============================================================================

const ANON_KEY = 'cr_anon_id'

function getAnonId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.localStorage.getItem(ANON_KEY)
    if (existing) return existing
    const fresh = crypto.randomUUID()
    window.localStorage.setItem(ANON_KEY, fresh)
    return fresh
  } catch {
    return ''
  }
}

export type PingSource = 'cari_rider' | 'business' | 'profile_card'

export type PingDetails = {
  fareIdr?: number
  pickupName?: string
  dropoffName?: string
  serviceType?: string
}

export function pingDriverContact(
  driverId: string,
  source: PingSource,
  details?: PingDetails,
): void {
  if (typeof window === 'undefined') return
  if (!driverId) return

  const partnerSlug = getStoredPartnerSlug() || undefined

  const payload = JSON.stringify({
    driverId,
    source,
    customerAnonId: getAnonId(),
    // Optional fields — server treats all as opt-in. Partner attribution
    // only fires when BOTH partnerSlug and a positive fareIdr are present.
    ...(partnerSlug ? { partnerSlug } : {}),
    ...(details?.fareIdr     ? { fareIdr: details.fareIdr }         : {}),
    ...(details?.pickupName  ? { pickupName: details.pickupName }   : {}),
    ...(details?.dropoffName ? { dropoffName: details.dropoffName } : {}),
    ...(details?.serviceType ? { serviceType: details.serviceType } : {}),
  })

  // Prefer sendBeacon — explicitly designed to survive page navigation
  // (and the wa.me handoff that immediately follows on customer side).
  // Falls back to keepalive fetch where unsupported.
  try {
    const blob = new Blob([payload], { type: 'application/json' })
    if (navigator.sendBeacon && navigator.sendBeacon('/api/contact/ping', blob)) return
  } catch {
    /* ignore — fall through to fetch */
  }
  try {
    void fetch('/api/contact/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    })
  } catch {
    /* swallow — Contact flow must not break on telemetry failure */
  }
}
