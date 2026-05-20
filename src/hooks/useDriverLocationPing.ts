'use client'
import { useEffect, useRef } from 'react'
import { isNative } from '@/lib/capacitor/isNative'

// ============================================================================
// useDriverLocationPing — drives the live location loop for a driver who
// has flipped GO ONLINE. Watches the device GPS continuously (so we
// catch quick movement) but throttles the network POST to ~once every
// `pingIntervalMs` (default 30s).
//
// AVAILABILITY MODEL (PM 12/2019 directory posture — 2026-05 audit):
// The driver alone controls their `availability` state — there is no
// platform-side inference. We only forward GPS coordinates plus a
// `last_active_at` timestamp. The receiving route does NOT translate
// movement into busy/online — that would imply dispatch orchestration.
//
// If we later want a UX hint ("this rider is moving — likely on a job"),
// we render it client-side based on the public last-fix delta, and we
// label it "moving"/"stationary" — never "busy". Bookability is gated
// solely on `availability === 'online'`, which the driver sets manually.
//
// Tab visibility: when the page is backgrounded we keep watching the
// device GPS but stop POSTing — modern browsers throttle JS in hidden
// tabs anyway, and we don't want stale ticks landing minutes later.
//
// NATIVE GATE:
// On Capacitor (Android APK), this hook short-circuits — the native
// background-location plugin handles pings instead, from a foreground
// service that survives WebView pause / phone lock. See
// `src/lib/capacitor/locationBridge.ts`.
// ============================================================================

type Status = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'

export type DriverLocationPingState = {
  status: Status
  lastSentAt: number | null
  lastError: string | null
}

export function useDriverLocationPing(
  enabled: boolean,
  opts: { pingIntervalMs?: number; onStatus?: (s: DriverLocationPingState) => void } = {},
) {
  const pingIntervalMs = opts.pingIntervalMs ?? 30_000
  const stateRef = useRef<DriverLocationPingState>({
    status: 'idle', lastSentAt: null, lastError: null,
  })
  const watchIdRef = useRef<number | null>(null)
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null)
  const sendingRef = useRef(false)
  const lastSentAtRef = useRef(0)

  function emit(patch: Partial<DriverLocationPingState>) {
    stateRef.current = { ...stateRef.current, ...patch }
    opts.onStatus?.(stateRef.current)
  }

  async function send(lat: number, lng: number) {
    if (sendingRef.current) return
    sendingRef.current = true
    try {
      const res = await fetch('/api/drivers/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        emit({ lastError: j.error || `HTTP ${res.status}` })
      } else {
        lastSentAtRef.current = Date.now()
        emit({ lastSentAt: lastSentAtRef.current, lastError: null })
      }
    } catch (err) {
      emit({ lastError: err instanceof Error ? err.message : 'network error' })
    } finally {
      sendingRef.current = false
    }
  }

  useEffect(() => {
    if (!enabled) return
    // Native runtime owns the location loop — defer to the background
    // plugin and report active immediately so the dashboard doesn't
    // show "GPS permission required".
    if (isNative()) {
      emit({ status: 'active' })
      return
    }
    if (typeof window === 'undefined' || !navigator.geolocation) {
      emit({ status: 'unavailable' })
      return
    }

    emit({ status: 'requesting' })

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        emit({ status: 'active' })
        lastCoordsRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        // Throttle: send at most every pingIntervalMs, unless this is
        // the first fix in this session.
        const now = Date.now()
        if (
          lastSentAtRef.current === 0 ||
          now - lastSentAtRef.current >= pingIntervalMs
        ) {
          if (!document.hidden) {
            void send(pos.coords.latitude, pos.coords.longitude)
          }
        }
      },
      (err) => {
        emit({
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
          lastError: err.message,
        })
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    )
    watchIdRef.current = watchId

    // Backup interval: even if the device hasn't generated a new
    // position event for a while (driver is stationary, no significant
    // change), POST the last-known coords so the server can flip the
    // status to 'online' once movement stops.
    const intervalId = window.setInterval(() => {
      if (document.hidden) return
      const c = lastCoordsRef.current
      if (!c) return
      const now = Date.now()
      if (now - lastSentAtRef.current >= pingIntervalMs) {
        void send(c.lat, c.lng)
      }
    }, pingIntervalMs)

    // Push one immediate ping on visibility-regained so a returning
    // driver lands on the marketplace quickly rather than waiting up
    // to a full interval for the next tick.
    const onVisible = () => {
      if (document.hidden) return
      const c = lastCoordsRef.current
      if (c) void send(c.lat, c.lng)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      navigator.geolocation.clearWatch(watchId)
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisible)
      watchIdRef.current = null
    }
  }, [enabled, pingIntervalMs])

  return stateRef
}
