// ============================================================================
// trackWaClick — fire-and-forget beacon to /api/track/wa-click
// ----------------------------------------------------------------------------
// Call BEFORE opening wa.me / whatsapp:// so the click is logged before
// the navigation happens. Uses navigator.sendBeacon when available so
// the request survives the tab switch — falls back to fetch+keepalive
// for older browsers. Never throws.
//
// Usage:
//   import { trackWaClick } from '@/lib/tracking/waClick'
//   <a
//     href={`https://wa.me/${phone}`}
//     onClick={() => trackWaClick({ context: 'driver_profile', targetPhone: rider.whatsapp })}
//   >Contact</a>
// ============================================================================

const APP_ID = 'cityrider'
const ENDPOINT = '/api/track/wa-click'

export function trackWaClick(args: {
  context: string
  targetPhone?: string | null
  meta?: Record<string, unknown>
}): void {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify({
    app_id: APP_ID,
    context: args.context,
    target_phone: args.targetPhone ?? null,
    referrer: window.location.href,
    meta: args.meta ?? null,
  })

  try {
    // sendBeacon survives the wa.me navigation, fetch with keepalive
    // is the fallback for browsers that don't support it.
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      const ok = navigator.sendBeacon(ENDPOINT, blob)
      if (ok) return
    }
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => { /* swallow */ })
  } catch { /* swallow */ }
}
