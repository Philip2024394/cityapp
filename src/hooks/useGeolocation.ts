'use client'
import { useEffect, useState } from 'react'
import {
  LOCATION_CACHE_KEY,
  LOCATION_CACHE_TTL_MS,
  readCachedLocation,
  writeCachedLocation,
} from '@/components/onboarding/LocationPermissionPrompt'

export type GeoPoint = { lat: number; lng: number; accuracyM: number }

// One-shot geolocation request. Caller decides when to call useGeolocation().
// Throttling for watchPosition lives separately (used by rider GO ONLINE).
//
// May 2026 enhancement (landing warm-up modal):
//   On mount the hook checks localStorage (`indocity:location:v1`) for cached
//   coords written by the location warm-up modal on /. If a fresh entry
//   exists (< 30 days old), we hydrate immediately with status='granted' and
//   skip the browser-native API. Returning customers therefore never see a
//   re-prompt, and surfaces like /cari, /places, and PlaceProfileShell's cart
//   sheet see precise coords from the very first paint.
//
//   Successful native getCurrentPosition() calls also write back to the same
//   cache key — that way customers who skipped the warm-up but later tapped
//   the /cari GPS pin still get the 30-day cache benefit on subsequent visits.
// ----------------------------------------------------------------------------
// Cache key + TTL are exported from the onboarding module so there is exactly
// one source of truth; touching either constant updates both writer + reader
// at once.
export function useGeolocation(autoRequest = true) {
  const [coords, setCoords] = useState<GeoPoint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')

  // Returns a promise so callers can await the fresh coords directly
  // instead of relying on a useEffect to catch the state update. Solves
  // the stale-closure bug where `if (geo.coords)` after `request()`
  // sees the old value because the setState hasn't flushed yet.
  function request(): Promise<GeoPoint | null> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        setError('Geolocation not supported')
        setStatus('denied')
        resolve(null)
        return
      }
      setStatus('requesting')
      navigator.geolocation.getCurrentPosition(
        pos => {
          const point: GeoPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
          }
          setCoords(point)
          setStatus('granted')
          setError(null)
          // Mirror the fresh fix into the shared cache so every other
          // surface — and future visits within the 30-day TTL — pick it
          // up without re-prompting the OS dialog.
          writeCachedLocation(point.lat, point.lng)
          resolve(point)
        },
        err => {
          setError(err.message)
          setStatus('denied')
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
      )
    })
  }

  useEffect(() => {
    // Fast path — if the customer already granted GPS in the warm-up modal
    // (or any earlier session within 30 days), reuse those coords. No need
    // to spin up the browser-native API at all.
    const cached = readCachedLocation()
    if (cached) {
      setCoords({ lat: cached.lat, lng: cached.lng, accuracyM: 0 })
      setStatus('granted')
      setError(null)
      return
    }
    if (autoRequest) request()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest])

  return { coords, error, status, request }
}

// Re-export the cache constants so callers that need to inspect / clear
// the cache (e.g. a future "Forget my location" setting) don't have to
// reach into the onboarding component directly.
export { LOCATION_CACHE_KEY, LOCATION_CACHE_TTL_MS }
