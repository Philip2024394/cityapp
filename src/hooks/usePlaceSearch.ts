'use client'
import { useEffect, useRef, useState } from 'react'
import { haversineKm } from '@/lib/geo/haversine'

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
        const url = new URL(NOMINATIM_ENDPOINT)
        url.searchParams.set('q', query.trim())
        url.searchParams.set('format', 'json')
        url.searchParams.set('limit', '6')
        url.searchParams.set('addressdetails', '1')
        if (countryCodes.length) url.searchParams.set('countrycodes', countryCodes.join(','))
        if (near) {
          // Tight viewbox when we'll enforce a hard 50km radius client-side.
          // 0.5 deg ≈ 55km — slightly wider than the radius to give the
          // haversine filter a small margin against the rectangle vs
          // circle mismatch.
          const wide = maxDistanceKm > 0 ? 0.5 : 0.3
          url.searchParams.set(
            'viewbox',
            `${near.lng - wide},${near.lat + wide},${near.lng + wide},${near.lat - wide}`,
          )
          // bounded=1 strict-clips Nominatim to the viewbox so it doesn't
          // surface Jakarta when the user is in Bantul. bounded=0 (soft
          // bias) was the old behaviour.
          url.searchParams.set('bounded', maxDistanceKm > 0 ? '1' : '0')
        }

        const res = await fetch(url.toString(), {
          signal: ctrl.signal,
          // Nominatim asks for a descriptive UA / referer per their policy.
          // Browser ones are sent automatically; no special headers needed.
        })
        if (!res.ok) throw new Error(`Nominatim ${res.status}`)
        let data: NominatimItem[] = await res.json()

        // Bounded-viewbox fallback. When near + maxDistanceKm produces an
        // empty result set (the user typed a real POI just outside the
        // strict viewbox — for example Ambarrukmo Plaza when GPS
        // triangulated to a neighbouring suburb), retry once WITHOUT the
        // bounded clip so the country-code bias is all that filters.
        // The haversine radius post-filter below still applies — this
        // only widens the LOOKUP, not the displayed result.
        if (data.length === 0 && near) {
          const fallback = new URL(NOMINATIM_ENDPOINT)
          fallback.searchParams.set('q', query.trim())
          fallback.searchParams.set('format', 'json')
          fallback.searchParams.set('limit', '6')
          fallback.searchParams.set('addressdetails', '1')
          if (countryCodes.length) fallback.searchParams.set('countrycodes', countryCodes.join(','))
          const fbRes = await fetch(fallback.toString(), { signal: ctrl.signal })
          if (fbRes.ok) data = await fbRes.json()
        }
        const mapped = data.map((d): PlaceSuggestion => ({
          id: String(d.place_id),
          label: pickShortLabel(d),
          detail: d.display_name,
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
        }))
        // Hard radius cull — CityDrivers is a city service. A user in
        // Bantul typing "Ja" should not see Jakarta (575km) or Jambi
        // (1200km) suggested. Without `near` we have no reference
        // point, so the filter no-ops and the country-code bias is all
        // that remains.
        const filtered =
          near && maxDistanceKm > 0
            ? mapped.filter((s) => haversineKm(near, { lat: s.lat, lng: s.lng }) <= maxDistanceKm)
            : mapped
        setSuggestions(filtered)
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

// Nominatim returns display_name as a verbose comma-separated string.
// We prefer the POI / venue name (e.g. "Ambarrukmo Plaza", "KFC
// Malioboro", "Gembira Loka Zoo") OVER the surrounding administrative
// area. Founder report 2026-06-03: customer typed "Ambarrukmo Plaza"
// and the old fallback chain (suburb → village → city → name) labelled
// the suggestion "Caturtunggal" (the suburb), making the customer
// think the autosuggest didn't find their mall.
//
// The display_name verbose string still lives in `detail` (rendered as
// the address line below the label), so the customer still sees the
// neighbourhood for context — but the headline now reads the way they
// typed it.
function pickShortLabel(d: NominatimItem): string {
  const addr = d.address ?? {}
  return (
    // Real POIs / amenities (malls, restaurants, hotels, etc.) carry
    // a top-level `name`. Honour that first.
    d.name ||
    // Amenity / shop / tourism tag descriptors when name is missing.
    addr.amenity ||
    addr.shop ||
    addr.tourism ||
    addr.building ||
    // Streets next — when the user typed a road name.
    addr.road ||
    // Administrative areas only when nothing more specific exists.
    addr.suburb ||
    addr.village ||
    addr.town ||
    addr.city_district ||
    addr.city ||
    addr.county ||
    addr.state ||
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
    amenity?:       string
    shop?:          string
    tourism?:       string
    building?:      string
    road?:          string
    suburb?:        string
    village?:       string
    town?:          string
    city_district?: string
    city?:          string
    county?:        string
    state?:         string
    country?:       string
  }
}
