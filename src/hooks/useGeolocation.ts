'use client'
import { useEffect, useState } from 'react'

export type GeoPoint = { lat: number; lng: number; accuracyM: number }

// One-shot geolocation request. Caller decides when to call useGeolocation().
// Throttling for watchPosition lives separately (used by rider GO ONLINE).
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
    if (autoRequest) request()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest])

  return { coords, error, status, request }
}
