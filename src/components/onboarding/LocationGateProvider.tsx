'use client'

// LocationGateProvider — mounts <LocationPermissionPrompt /> once at the app
// root and exposes a global `request()` so every caller of useGeolocation
// gets the branded pre-prompt before the native browser dialog fires.
//
// Wiring:
//   <html><body>
//     <LocationGateProvider>
//       {children}
//     </LocationGateProvider>
//   </body></html>
//
// Pattern — module-level singleton so the hook can call it without
// threading a React context through every page. Pure side-channel.

import { useCallback, useEffect, useRef, useState } from 'react'
import LocationPermissionPrompt, { readCachedLocation, writeCachedLocation } from './LocationPermissionPrompt'

type Resolve = (point: { lat: number; lng: number; accuracyM: number } | null) => void

let openModal: ((resolve: Resolve) => void) | null = null

// Called from useGeolocation. Returns a promise that resolves when the user
// either grants/denies in the modal (which in turn fires the native prompt).
// If the modal is not yet mounted (server render, very first paint), falls
// back to a direct native call.
export function requestLocationViaGate(): Promise<{ lat: number; lng: number; accuracyM: number } | null> {
  return new Promise((resolve) => {
    // Cache hit short-circuit — never re-prompt within TTL.
    const cached = readCachedLocation()
    if (cached) {
      resolve({ lat: cached.lat, lng: cached.lng, accuracyM: 0 })
      return
    }
    if (openModal) {
      openModal(resolve)
      return
    }
    // Modal not mounted (yet) — fall back to plain native API.
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve(null); return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        writeCachedLocation(pos.coords.latitude, pos.coords.longitude)
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy })
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  })
}

export default function LocationGateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const resolveRef = useRef<Resolve | null>(null)

  const onComplete = useCallback(() => {
    setOpen(false)
    // The modal cached coords if user granted GPS. Pull and resolve.
    const cached = readCachedLocation()
    if (resolveRef.current) {
      resolveRef.current(cached ? { lat: cached.lat, lng: cached.lng, accuracyM: 0 } : null)
      resolveRef.current = null
    }
  }, [])

  useEffect(() => {
    openModal = (resolve: Resolve) => {
      resolveRef.current = resolve
      setOpen(true)
    }
    return () => {
      openModal = null
      resolveRef.current = null
    }
  }, [])

  return (
    <>
      {children}
      <LocationPermissionPrompt open={open} onComplete={onComplete} />
    </>
  )
}
