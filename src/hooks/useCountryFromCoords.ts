'use client'
import { useEffect, useState } from 'react'

// One-shot reverse-geocode against Nominatim to derive the user's ISO
// country code from their GPS coords. Cached in module memory so we
// don't hit the network again for the same point during this session.
//
// Returns null until coords arrive AND the reverse-geocode resolves.
// Components should treat null as "no country filter yet" (global)
// and a 2-letter string (e.g. "id") as "lock to this country".
const cache = new Map<string, string>()

export function useCountryFromCoords(coords: { lat: number; lng: number } | null) {
  const [country, setCountry] = useState<string | null>(null)

  useEffect(() => {
    if (!coords) return
    const key = `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)}`
    const cached = cache.get(key)
    if (cached) { setCountry(cached); return }

    const ctrl = new AbortController()
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('lat', String(coords.lat))
    url.searchParams.set('lon', String(coords.lng))
    url.searchParams.set('format', 'json')
    url.searchParams.set('zoom', '3') // country level — cheaper to resolve
    url.searchParams.set('addressdetails', '1')

    fetch(url.toString(), { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then((d: { address?: { country_code?: string } } | null) => {
        const code = d?.address?.country_code?.toLowerCase() ?? null
        if (code) {
          cache.set(key, code)
          setCountry(code)
        }
      })
      .catch(() => { /* network or abort — leave null, fall back to global */ })

    return () => ctrl.abort()
  }, [coords?.lat, coords?.lng])

  return country
}
