// ============================================================================
// connectIntent — client-side helper for the WhatsApp intent-intercept
// alert system. Call this from the onClick handler of every "Send
// WhatsApp" button across every vertical BEFORE the browser navigates to
// wa.me.
//
// CRITICAL: only call from the FINAL send button. If a surface has a
// multi-step booking widget (ContactBookingPopup, rate-quote sliders,
// etc.), the intent must fire when the customer submits — NOT when they
// open the form. Otherwise providers get spammed by exploration clicks.
//
// Uses navigator.sendBeacon when available so the request survives the
// imminent navigation; falls back to fetch with keepalive otherwise.
// Fire-and-forget — never blocks the user from reaching WhatsApp.
//
// See: project_cityriders_intent_intercept memory + 0146/0147 migrations.
// ============================================================================

export type ConnectIntentSource =
  | 'cari'
  | 'rider_profile' | 'car_profile'
  | 'beautician_profile' | 'handyman_profile' | 'laundry_profile'
  | 'massage_profile' | 'home_clean_profile' | 'tour_profile'
  | 'facial_profile' | 'skincare_profile' | 'rentals_profile'
  | 'property_profile' | 'places_profile' | 'bus_profile'
  | 'other'

export type ConnectIntentVertical =
  | 'rider' | 'car'
  | 'beautician' | 'handyman' | 'laundry' | 'massage' | 'home-clean'
  | 'tour-guide' | 'facial' | 'skincare' | 'rentals' | 'property'
  | 'places'

export function fireConnectIntent(
  providerId: string,
  source: ConnectIntentSource,
  vertical: ConnectIntentVertical,
): void {
  if (typeof window === 'undefined') return
  if (!providerId) return

  const url     = '/api/connect-intent'
  const payload = JSON.stringify({ driver_id: providerId, source, vertical })

  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' })
      const ok = navigator.sendBeacon(url, blob)
      if (ok) return
    }
  } catch {
    // sendBeacon may throw on hardened browsers — fall through.
  }

  try {
    fetch(url, {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json' },
      body:      payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // swallow — never block the booking.
  }
}
