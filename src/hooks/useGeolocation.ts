'use client'
import { useEffect, useState } from 'react'

export type GeoPoint = { lat: number; lng: number; accuracyM: number }

// One-shot geolocation request. Caller decides when to call useGeolocation().
// Throttling for watchPosition lives separately (used by rider GO ONLINE).
export function useGeolocation(autoRequest = true) {
  const [coords, setCoords] = useState<GeoPoint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')

  function request() {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation not supported')
      setStatus('denied')
      return
    }
    setStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy })
        setStatus('granted')
      },
      err => {
        setError(err.message)
        setStatus('denied')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  }

  useEffect(() => {
    if (autoRequest) request()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest])

  return { coords, error, status, request }
}
