// ============================================================================
// trackShareClick — fire-and-forget beacon to /api/track/share-click
// ----------------------------------------------------------------------------
// Call BEFORE the share intent opens (wa.me, sharer.php, clipboard write,
// QR view) so we log which platform the visitor chose. Uses sendBeacon so
// the request survives the tab switch.
//
// One row per tap → admin can see "which drivers are being shared, on
// which platforms" via the analytics dashboard.
//
// Usage in SocialShareSheet:
//   <a href={waUrl}
//      onClick={() => trackShareClick({ providerType:'driver', providerId, platform:'whatsapp' })}>
// ============================================================================

const ENDPOINT = '/api/track/share-click'

const ANON_KEY = 'sl_anon_v1'

function getAnonSessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    let v = window.sessionStorage.getItem(ANON_KEY)
    if (!v) {
      v = (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
      window.sessionStorage.setItem(ANON_KEY, v)
    }
    return v
  } catch {
    return null
  }
}

export type SharePlatform = 'whatsapp' | 'facebook' | 'copy_link' | 'qr_view' | 'qr_download'

export type ProviderType =
  | 'driver' | 'bike_rental' | 'tour_guide'
  | 'massage' | 'beautician' | 'laundry' | 'handyman' | 'home_clean'

export function trackShareClick(args: {
  providerType: ProviderType
  providerId: string
  platform: SharePlatform
  meta?: Record<string, unknown>
}): void {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify({
    provider_type: args.providerType,
    provider_id: args.providerId,
    platform: args.platform,
    anon_session_id: getAnonSessionId(),
    referrer: window.location.href,
    meta: args.meta ?? null,
  })

  try {
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
