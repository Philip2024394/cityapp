'use client'
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { Protocol as PMTilesProtocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'
import { X, Check, Loader2, MapPin } from 'lucide-react'
import { getResilientStyle } from '@/lib/map/resilientStyle'

// ============================================================================
// MapPinPicker — full-screen overlay for "drop a pin to set the location".
// ----------------------------------------------------------------------------
// Founder ask 2026-06-03 fix #3 of 4 — when /cari autocomplete returns
// nothing the customer can recognise (rare POI, weird spelling, Nominatim
// hiccup), they need a "pin on map" fallback like Gojek/Grab. This is it.
//
// UX matches Gojek / Grab convention: the pin stays centre-pinned to the
// screen; the customer drags the MAP under it (not the pin itself). This
// is more accurate on mobile because the user can see what they're
// pointing at without their thumb covering it. Long-press / drag-marker
// alternatives have worse fat-finger accuracy.
//
// Reverse-geocode runs debounced (350ms) on every map move so the bottom
// label updates as the user pans. On Confirm we hand back the centre
// coord + the resolved label.
// ============================================================================

// Register PMTiles protocol once per app lifecycle (same idempotent guard
// as RiderMap uses).
if (typeof window !== 'undefined' && !(window as unknown as { __cr_pmtiles?: boolean }).__cr_pmtiles) {
  const protocol = new PMTilesProtocol()
  maplibregl.addProtocol('pmtiles', protocol.tile)
  ;(window as unknown as { __cr_pmtiles?: boolean }).__cr_pmtiles = true
}

export type PinPickResult = {
  lat:   number
  lng:   number
  label: string
}

export default function MapPinPicker({
  initialCenter,
  title,
  onConfirm,
  onClose,
}: {
  initialCenter: { lat: number; lng: number }
  /** Header text shown at the top of the overlay (e.g. "Pick pickup"). */
  title:         string
  onConfirm: (pick: PinPickResult) => void
  onClose:   () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<maplibregl.Map | null>(null)
  const [center, setCenter] = useState(initialCenter)
  const [label,  setLabel]  = useState<string>('Loading address…')
  const [resolving, setResolving] = useState(false)

  // Init MapLibre once, watching for moveend to track the centre coord.
  useEffect(() => {
    if (!containerRef.current) return
    let alive = true

    void getResilientStyle('positron').then((style) => {
      if (!alive || !containerRef.current) return
      const map = new maplibregl.Map({
        container: containerRef.current,
        // Cast through unknown — getResilientStyle returns the looser
        // protomaps-themes StyleSpec while MapLibre wants its own internal
        // StyleSpecification. Same cast pattern RiderMap.tsx uses.
        style: style as unknown as maplibregl.StyleSpecification,
        center:    [initialCenter.lng, initialCenter.lat],
        zoom:      15,
        attributionControl: false,
      })
      mapRef.current = map

      map.on('moveend', () => {
        const c = map.getCenter()
        setCenter({ lat: c.lat, lng: c.lng })
      })
    })

    return () => {
      alive = false
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced reverse-geocode every time the centre coord stabilises.
  useEffect(() => {
    setResolving(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/geo/reverse?lat=${center.lat}&lng=${center.lng}`, {
          cache: 'no-store',
        })
        const j = await r.json().catch(() => ({}))
        if (j?.display_name) setLabel(j.display_name)
        else setLabel(`${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`)
      } catch {
        setLabel(`${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`)
      } finally {
        setResolving(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [center.lat, center.lng])

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Map fills the whole screen */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Centre pin overlay — pointer-events:none so the map under it is
          still draggable. Slight -translate-y so the pin's TIP lands on
          the actual coord (the bottom of the teardrop, not the centre). */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-10 h-10 -translate-y-5" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.45))' }}>
            <path
              d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
              fill="#FACC15"
              stroke="#0A0A0A"
              strokeWidth="0.75"
            />
            <circle cx="12" cy="10" r="3" fill="#FFFFFF" />
          </svg>
        </div>
      </div>

      {/* Top bar — close + title. Sits over the map, semi-translucent. */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-3 pt-safe"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center active:scale-95 transition mt-3"
        >
          <X className="w-5 h-5 text-black" strokeWidth={2.5} />
        </button>
        <h3 className="text-[14px] font-black text-white mt-3 drop-shadow">
          {title}
        </h3>
      </div>

      {/* Bottom card — resolved label + Confirm button. Always visible. */}
      <div
        className="absolute left-0 right-0 bottom-0 z-10 bg-white rounded-t-3xl shadow-2xl p-4 pb-safe"
        style={{ boxShadow: '0 -8px 28px rgba(0,0,0,0.18)' }}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-amber-700" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-amber-700">
              Pin location
            </div>
            <p className="text-[13px] font-bold text-black leading-snug mt-0.5 line-clamp-2">
              {resolving ? (
                <span className="inline-flex items-center gap-1.5 text-black/55">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} />
                  Reading address…
                </span>
              ) : label}
            </p>
            <p className="text-[11px] text-black/55 mt-0.5 tabular-nums">
              {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onConfirm({ lat: center.lat, lng: center.lng, label })}
          disabled={resolving}
          className="w-full mt-3 inline-flex items-center justify-center gap-1.5 rounded-2xl text-[14px] font-extrabold active:scale-[0.98] transition disabled:opacity-60"
          style={{
            background: '#FACC15',
            color:      '#0A0A0A',
            minHeight:  48,
            boxShadow:  '0 6px 18px rgba(250,204,21,0.45)',
          }}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
          Confirm this location
        </button>
      </div>
    </div>
  )
}
