'use client'
import { registerPlugin } from '@capacitor/core'
import type { BackgroundGeolocationPlugin, Location, CallbackError } from '@capacitor-community/background-geolocation'
import { isNative } from './isNative'

// The plugin ships type definitions only; the runtime proxy comes from
// `registerPlugin`. The string name must match the iOS/Android native
// class registration ("BackgroundGeolocation").
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation')

// ============================================================================
// Native background-location bridge.
// ----------------------------------------------------------------------------
// Wraps `@capacitor-community/background-geolocation` so the driver
// dashboard can start/stop the same /api/drivers/location POST loop the
// browser hook does — but from a native foreground service that keeps
// firing while the app is backgrounded or the phone is locked.
//
// Why a separate module from `useDriverLocationPing`:
//   • Hook fires from React (foreground only, browser-limited).
//   • This bridge runs in the native runtime — survives WebView pause.
//   • Same auth context: the WebView session cookie for
//     cityrider.streetlocal.live carries through plugin fetch() calls
//     because they share the WebView's URLSession (Android) / WKWebsite
//     (iOS WKWebView). No Bearer header refactor needed today.
//
// On non-native (PWA / browser) this module is a no-op — the existing
// `useDriverLocationPing` hook handles foreground pings.
// ============================================================================

const PING_MIN_INTERVAL_MS = 30_000
const DISTANCE_FILTER_M    = 10

let watcherId: string | null = null
let lastSentAt = 0

type StartResult =
  | { ok: true; watcherId: string }
  | { ok: false; reason: 'not_native' | 'permission_denied' | 'unavailable' | 'error'; message?: string }

export async function startNativeBackgroundPing(): Promise<StartResult> {
  if (!isNative()) return { ok: false, reason: 'not_native' }
  if (watcherId) return { ok: true, watcherId }

  try {
    const id = await BackgroundGeolocation.addWatcher(
      {
        backgroundMessage: 'City Rider is sharing your location so customers can find you.',
        backgroundTitle:   'City Rider is online',
        requestPermissions: true,
        // Reject stale fixes — we want fresh GPS for accurate "X km away".
        stale: false,
        // Move filter — re-fire on ≥10m of movement.
        distanceFilter: DISTANCE_FILTER_M,
      },
      async (location: Location | undefined, err: CallbackError | undefined) => {
        if (err) {
          // Permission denials surface here. Plugin handles requesting;
          // we just log and stop the watcher so the driver can re-toggle.
          console.warn('[location-bridge] watcher error:', err)
          return
        }
        if (!location) return
        const now = Date.now()
        if (now - lastSentAt < PING_MIN_INTERVAL_MS) return
        lastSentAt = now

        try {
          await fetch('/api/drivers/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Relative URL → resolved against server.url in Capacitor
            // config, which points at production. Session cookie on that
            // origin is automatically attached by the WebView's network
            // stack — no Authorization header needed.
            credentials: 'include',
            body: JSON.stringify({ lat: location.latitude, lng: location.longitude }),
          })
        } catch (e) {
          // Network blip — plugin keeps watching, next fix retries.
          console.warn('[location-bridge] ping POST failed:', e)
        }
      },
    )
    watcherId = id
    return { ok: true, watcherId: id }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: 'error', message }
  }
}

export async function stopNativeBackgroundPing(): Promise<void> {
  if (!isNative()) return
  const id = watcherId
  watcherId = null
  lastSentAt = 0
  if (!id) return
  try {
    await BackgroundGeolocation.removeWatcher({ id })
  } catch (e) {
    console.warn('[location-bridge] removeWatcher failed:', e)
  }
}

export function isNativeBackgroundPingActive(): boolean {
  return watcherId != null
}
