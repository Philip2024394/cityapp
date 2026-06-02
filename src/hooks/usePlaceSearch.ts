'use client'
import { useEffect, useRef, useState } from 'react'

export type PlaceSuggestion = {
  id: string
  label: string       // short — what the user typed-toward (e.g. "Bantul")
  detail: string      // address line below (e.g. "Yogyakarta, Indonesia")
  lat: number
  lng: number
}

// Free OSM-based geocoder. Works worldwide, no API key, no billing.
// Rate-limited to ~1 req/sec per IP — we debounce 350ms so casual typing
// stays well within bounds. countrycodes can be empty for global search.
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'

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
  /** Bias results around this point (helps surface nearby places first). */
  near?: { lat: number; lng: number } | null
}

// Self-contained place-search hook. Pass it the current input value and
// it returns debounced suggestions from Nominatim. AbortController cancels
// in-flight requests when the user keeps typing.
export function usePlaceSearch(query: string, opts: Options = {}) {
  const { debounceMs = 350, minChars = 3, countryCodes = ['id'], near = null } = opts
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
        const url = new URL(NOMINATIM_ENDPOINT)
        url.searchParams.set('q', query.trim())
        url.searchParams.set('format', 'json')
        url.searchParams.set('limit', '6')
        url.searchParams.set('addressdetails', '1')
        if (countryCodes.length) url.searchParams.set('countrycodes', countryCodes.join(','))
        if (near) {
          // 0.3deg ~ 33km — a soft local bias, not a hard bound.
          url.searchParams.set(
            'viewbox',
            `${near.lng - 0.3},${near.lat + 0.3},${near.lng + 0.3},${near.lat - 0.3}`,
          )
          // bounded=0 means "prefer but don't restrict" → global queries
          // still find Bandung when biased to Yogyakarta.
          url.searchParams.set('bounded', '0')
        }

        const res = await fetch(url.toString(), {
          signal: ctrl.signal,
          // Nominatim asks for a descriptive UA / referer per their policy.
          // Browser ones are sent automatically; no special headers needed.
        })
        if (!res.ok) throw new Error(`Nominatim ${res.status}`)
        const data: NominatimItem[] = await res.json()
        setSuggestions(
          data.map((d): PlaceSuggestion => ({
            id: String(d.place_id),
            label: pickShortLabel(d),
            detail: d.display_name,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
          })),
        )
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => { clearTimeout(t); abortRef.current?.abort() }
  }, [query, debounceMs, minChars, countryCodes.join(','), near?.lat, near?.lng])

  return { suggestions, loading, clear: () => setSuggestions([]) }
}

// Nominatim returns display_name as a verbose comma-separated string.
// For the short label we prefer the name field (e.g. "Bantul") and
// fall back to the first piece of display_name.
function pickShortLabel(d: NominatimItem): string {
  const addr = d.address ?? {}
  return (
    addr.suburb ||
    addr.village ||
    addr.town ||
    addr.city_district ||
    addr.city ||
    addr.county ||
    addr.state ||
    d.name ||
    d.display_name.split(',')[0] ||
    'Place'
  )
}

type NominatimItem = {
  place_id: number
  lat: string
  lon: string
  display_name: string
  name?: string
  address?: {
    suburb?: string
    village?: string
    town?: string
    city_district?: string
    city?: string
    county?: string
    state?: string
    country?: string
  }
}
