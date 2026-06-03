'use client'
import { useEffect, useRef, useState } from 'react'

export type PlaceSuggestion = {
  id: string
  label: string       // short — what the user typed-toward (e.g. "Bantul")
  detail: string      // address line below (e.g. "Yogyakarta, Indonesia")
  lat: number
  lng: number
}

// Server-side proxy that routes through Nominatim with a 24h in-memory
// cache + a Mapbox fallback when Nominatim errors / 429s / returns zero.
// Founder direction 2026-06-03 fix #4 — direct browser → Nominatim calls
// were getting silently rate-limited (1 req/sec per IP) on busy office
// networks, leaving customers with empty dropdowns. The proxy moves the
// rate-limit surface to our function's outbound IP and caches popular
// queries so the same place lookup doesn't hit Nominatim twice in a day.
const PROXY_ENDPOINT = '/api/geo/search'

type Options = {
  /** Debounce delay in ms before firing a request after typing stops. */
  debounceMs?: number
  /** Minimum characters before we start querying. */
  minChars?: number
  /** Restrict to these ISO-3166 country codes. Defaults to ['id'] —
   *  CityDrivers is Indonesia-only, suggesting Bali / Yogya / etc.
   *  rather than London or Bangkok when the user types ambiguous text.
   *  Pass `[]` explicitly to opt back into a global search. */
  countryCodes?: string[]
  /** Bias results around this point (helps surface nearby places first).
   *  Required for the local-only radius filter (`maxDistanceKm`) to do
   *  anything useful — without `near` we have no centre to measure from. */
  near?: { lat: number; lng: number } | null
  /** Hard radius (km) from `near` to filter results down to. Anything
   *  further than this is dropped from the suggestion list AFTER fetch.
   *  Default 50 — CityDrivers is a city directory, not a long-haul
   *  marketplace. A user in Bantul shouldn't see Jakarta in autosuggest.
   *  Pass `0` (or `Infinity`) to disable the filter explicitly. */
  maxDistanceKm?: number
}

// Self-contained place-search hook. Pass it the current input value and
// it returns debounced suggestions from Nominatim. AbortController cancels
// in-flight requests when the user keeps typing.
export function usePlaceSearch(query: string, opts: Options = {}) {
  const { debounceMs = 350, minChars = 3, countryCodes = ['id'], near = null, maxDistanceKm = 50 } = opts
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (query.trim().length < minChars) {
      setSuggestions([])
      setLoading(false)
      return
    }

    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setLoading(true)
      try {
        const url = new URL(PROXY_ENDPOINT, window.location.origin)
        url.searchParams.set('q', query.trim())
        if (countryCodes.length) url.searchParams.set('countries', countryCodes.join(','))
        if (near) url.searchParams.set('near', `${near.lat},${near.lng}`)
        url.searchParams.set('maxDistanceKm', String(maxDistanceKm))

        const res = await fetch(url.toString(), { signal: ctrl.signal })
        if (!res.ok) throw new Error(`geo/search ${res.status}`)
        const j = (await res.json()) as { suggestions?: PlaceSuggestion[] }
        const list = Array.isArray(j.suggestions) ? j.suggestions : []
        // The server already applies the haversine radius cull — no need
        // to re-run it client-side.
        setSuggestions(list)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => { clearTimeout(t); abortRef.current?.abort() }
  }, [query, debounceMs, minChars, countryCodes.join(','), near?.lat, near?.lng, maxDistanceKm])

  return { suggestions, loading, clear: () => setSuggestions([]) }
}

// Note: pickShortLabel + the NominatimItem shape used to live here when
// the hook called Nominatim directly. Both moved server-side into
// src/app/api/geo/search/route.ts when the proxy shipped (fix #4 of 4,
// 2026-06-03). The client now consumes the already-shaped PlaceSuggestion
// rows the proxy returns.
